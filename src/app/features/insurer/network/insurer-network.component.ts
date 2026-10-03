import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { InsurerNetworkLink, Provider } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-insurer-network',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-network.component.html',
  styleUrl: './insurer-network.component.scss',
})
export class InsurerNetworkComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly insurerApi = inject(InsurerApiService);
  private readonly providerApi = inject(ProviderApiService);

  networkLinks: InsurerNetworkLink[] = [];
  allProviders: Provider[] = [];
  loading = true;
  loadingProviders = false;
  adding = false;
  errorMessage = '';
  addErrorMessage = '';
  showAddForm = false;
  selectedProviderId = '';
  searchQuery = '';

  private insuranceCompanyId = '';

  ngOnInit(): void {
    this.insuranceCompanyId = this.auth.currentUser?.insuranceCompanyId ?? '';
    if (!this.insuranceCompanyId) {
      this.errorMessage = 'Your account is not linked to an insurance company.';
      this.loading = false;
      return;
    }
    this.loadNetwork();
  }

  get availableProviders(): Provider[] {
    const linkedIds = new Set(this.networkLinks.map((link) => link.providerId));
    const query = this.searchQuery.trim().toLowerCase();
    return this.allProviders.filter((provider) => {
      if (linkedIds.has(provider.id)) return false;
      if (!query) return true;
      const haystack = [provider.providerCode, provider.name, provider.providerType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.addErrorMessage = '';
    this.selectedProviderId = '';
    this.searchQuery = '';
    if (this.showAddForm && this.allProviders.length === 0) {
      this.loadProviders();
    }
  }

  addProvider(): void {
    if (!this.selectedProviderId) {
      this.addErrorMessage = 'Select a provider to add to your network.';
      return;
    }

    this.adding = true;
    this.addErrorMessage = '';
    this.insurerApi.linkProviderToNetwork(this.insuranceCompanyId, this.selectedProviderId).subscribe({
      next: (link) => {
        this.networkLinks = [link, ...this.networkLinks];
        this.adding = false;
        this.showAddForm = false;
        this.selectedProviderId = '';
        this.searchQuery = '';
      },
      error: (err) => {
        this.addErrorMessage = err.userMessage ?? 'Failed to add provider to network.';
        this.adding = false;
      },
    });
  }

  formatEnum(value: string | null | undefined): string {
    if (!value) return '—';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  reload(): void {
    this.loadNetwork();
  }

  private loadNetwork(): void {
    this.loading = true;
    this.errorMessage = '';
    this.insurerApi.getNetwork(this.insuranceCompanyId).subscribe({
      next: (links) => {
        this.networkLinks = links;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load in-network providers.';
        this.loading = false;
      },
    });
  }

  private loadProviders(): void {
    this.loadingProviders = true;
    this.providerApi.getProviders().subscribe({
      next: (providers) => {
        this.allProviders = providers.filter((provider) => provider.status === 'ACTIVE');
        this.loadingProviders = false;
      },
      error: (err) => {
        this.addErrorMessage = err.userMessage ?? 'Failed to load providers catalog.';
        this.loadingProviders = false;
      },
    });
  }
}
