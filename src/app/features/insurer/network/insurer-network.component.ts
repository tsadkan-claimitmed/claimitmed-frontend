import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { InsurerNetworkLink } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-insurer-network',
  standalone: true,
  imports: [
    CommonModule,
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

  networkLinks: InsurerNetworkLink[] = [];
  loading = true;
  errorMessage = '';

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
}
