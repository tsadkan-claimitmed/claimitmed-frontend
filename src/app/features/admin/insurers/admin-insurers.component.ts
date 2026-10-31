import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ConfigService } from '../../../core/services/config.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import {
  ORG_CONTACT_CRUD_FIELDS,
} from '../../../shared/constants/org-contact-fields';
import { Insurer, InsurerNetworkLink, Provider } from '../../../core/models';

@Component({
  selector: 'app-admin-insurers',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminEntityCrudComponent],
  templateUrl: './admin-insurers.component.html',
  styleUrl: './admin-insurers.component.scss',
})
export class AdminInsurersComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly config = inject(ConfigService);

  items: Insurer[] = [];
  loading = true;
  saving = false;
  uploadingLogo = false;
  errorMessage = '';
  savedSuccessfully = 0;
  selectedInsurer: Insurer | null = null;
  pendingLogoFile: File | null = null;
  pendingLogoPreviewUrl: string | null = null;

  networkLinks: InsurerNetworkLink[] = [];
  allProviders: Provider[] = [];
  loadingNetwork = false;
  linkingNetwork = false;
  networkError = '';
  showAddProviders = false;
  providerSearch = '';
  selectedProviderIds = new Set<string>();

  readonly columns: CrudColumn[] = [
    { key: 'companyCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'companyCode', label: 'Company Code', required: true, placeholder: 'e.g. ABC-INS', readonlyOnEdit: true },
    { key: 'name', label: 'Company Name', required: true, placeholder: 'ABC Insurance' },
    ...ORG_CONTACT_CRUD_FIELDS,
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.clearPendingLogo();
  }

  get availableProviders(): Provider[] {
    const linkedIds = new Set(this.networkLinks.map((link) => link.providerId));
    const query = this.providerSearch.trim().toLowerCase();
    return this.allProviders.filter((provider) => {
      if (linkedIds.has(provider.id)) return false;
      if (provider.status && provider.status !== 'ACTIVE') return false;
      if (!query) return true;
      const haystack = [provider.providerCode, provider.name, provider.providerType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getInsurers().subscribe({
      next: (items) => {
        this.items = items;
        if (this.selectedInsurer) {
          this.selectedInsurer = items.find((row) => row.id === this.selectedInsurer!.id) ?? null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load insurers.';
        this.loading = false;
      },
    });
  }

  logoUrl(insurer: Insurer | null): string | null {
    return this.config.resolveAssetUrl(insurer?.logoUrl);
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createInsurer(body as never).subscribe({
      next: (created) => {
        const file = this.pendingLogoFile;
        this.clearPendingLogo();
        if (!file) {
          this.saving = false;
          this.savedSuccessfully++;
          this.load();
          return;
        }
        this.api.uploadInsurerLogo(created.id, file).subscribe({
          next: () => {
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
          error: (err) => {
            this.errorMessage = err.userMessage ?? 'Insurer created, but logo upload failed.';
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
        });
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to create insurer.';
        this.saving = false;
      },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateInsurer(event.id, event.body as never).subscribe({
      next: () => {
        this.saving = false;
        this.savedSuccessfully++;
        this.load();
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update insurer.';
        this.saving = false;
      },
    });
  }

  onToggleStatus(item: unknown): void {
    const insurer = item as Insurer;
    const action = insurer.status === 'ACTIVE'
      ? this.api.deactivateInsurer(insurer.id)
      : this.api.activateInsurer(insurer.id);

    action.subscribe({
      next: (updated) => {
        const index = this.items.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.items[index] = updated;
        this.selectedInsurer = updated;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update insurer status.';
      },
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.selectedInsurer) {
      this.setPendingLogo(file);
      input.value = '';
      return;
    }

    this.uploadingLogo = true;
    this.errorMessage = '';
    this.api.uploadInsurerLogo(this.selectedInsurer.id, file).subscribe({
      next: (updated) => {
        this.uploadingLogo = false;
        const index = this.items.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.items[index] = updated;
        this.selectedInsurer = updated;
        input.value = '';
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to upload logo.';
        this.uploadingLogo = false;
        input.value = '';
      },
    });
  }

  previewLogoUrl(): string | null {
    return this.pendingLogoPreviewUrl ?? this.logoUrl(this.selectedInsurer);
  }

  onSelectedItemChange(item: unknown): void {
    this.selectedInsurer = (item as Insurer | null) ?? null;
    this.clearPendingLogo();
    this.resetNetworkPicker();
    if (this.selectedInsurer) {
      this.loadNetwork(this.selectedInsurer.id);
      this.ensureProvidersLoaded();
    } else {
      this.networkLinks = [];
    }
  }

  toggleAddProviders(): void {
    this.showAddProviders = !this.showAddProviders;
    this.networkError = '';
    this.providerSearch = '';
    this.selectedProviderIds.clear();
    if (this.showAddProviders) {
      this.ensureProvidersLoaded();
    }
  }

  isProviderSelected(providerId: string): boolean {
    return this.selectedProviderIds.has(providerId);
  }

  toggleProviderSelection(providerId: string): void {
    const next = new Set(this.selectedProviderIds);
    if (next.has(providerId)) {
      next.delete(providerId);
    } else {
      next.add(providerId);
    }
    this.selectedProviderIds = next;
  }

  linkSelectedProviders(): void {
    if (!this.selectedInsurer) return;
    const providerIds = [...this.selectedProviderIds];
    if (providerIds.length === 0) {
      this.networkError = 'Select at least one provider to add to the network.';
      return;
    }

    this.linkingNetwork = true;
    this.networkError = '';
    const insurerId = this.selectedInsurer.id;
    forkJoin(providerIds.map((providerId) => this.api.linkProviderToNetwork(insurerId, providerId))).subscribe({
      next: () => {
        this.linkingNetwork = false;
        this.resetNetworkPicker();
        this.loadNetwork(insurerId);
      },
      error: (err) => {
        this.networkError = err.userMessage ?? 'Failed to link providers to this network.';
        this.linkingNetwork = false;
        this.loadNetwork(insurerId);
      },
    });
  }

  toggleNetworkStatus(link: InsurerNetworkLink): void {
    if (!this.selectedInsurer) return;
    const insurerId = this.selectedInsurer.id;
    const action = link.status === 'ACTIVE'
      ? this.api.deactivateNetworkProvider(insurerId, link.providerId)
      : this.api.activateNetworkProvider(insurerId, link.providerId);

    this.networkError = '';
    action.subscribe({
      next: (updated) => {
        this.networkLinks = this.networkLinks.map((row) => (row.id === updated.id ? updated : row));
      },
      error: (err) => {
        this.networkError = err.userMessage ?? 'Failed to update network provider status.';
      },
    });
  }

  formatEnum(value: string | null | undefined): string {
    if (!value) return '—';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private loadNetwork(insuranceCompanyId: string): void {
    this.loadingNetwork = true;
    this.networkError = '';
    this.api.getInsurerNetwork(insuranceCompanyId).subscribe({
      next: (links) => {
        if (this.selectedInsurer?.id !== insuranceCompanyId) return;
        this.networkLinks = links;
        this.loadingNetwork = false;
      },
      error: (err) => {
        if (this.selectedInsurer?.id !== insuranceCompanyId) return;
        this.networkError = err.userMessage ?? 'Failed to load in-network providers.';
        this.loadingNetwork = false;
      },
    });
  }

  private ensureProvidersLoaded(): void {
    if (this.allProviders.length > 0) return;
    this.api.getProviders().subscribe({
      next: (providers) => {
        this.allProviders = providers;
      },
      error: (err) => {
        this.networkError = err.userMessage ?? 'Failed to load providers.';
      },
    });
  }

  private resetNetworkPicker(): void {
    this.showAddProviders = false;
    this.providerSearch = '';
    this.selectedProviderIds.clear();
  }

  private setPendingLogo(file: File): void {
    this.clearPendingLogo();
    this.pendingLogoFile = file;
    this.pendingLogoPreviewUrl = URL.createObjectURL(file);
  }

  private clearPendingLogo(): void {
    if (this.pendingLogoPreviewUrl) {
      URL.revokeObjectURL(this.pendingLogoPreviewUrl);
    }
    this.pendingLogoFile = null;
    this.pendingLogoPreviewUrl = null;
  }
}
