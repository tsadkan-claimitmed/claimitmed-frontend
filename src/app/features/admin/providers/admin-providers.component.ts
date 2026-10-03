import { Component, inject, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { ORG_CONTACT_CRUD_FIELDS } from '../../../shared/constants/org-contact-fields';
import { Provider } from '../../../core/models';
import { ProviderType } from '../../../core/models/enums';

@Component({
  selector: 'app-admin-providers',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  template: `
    <app-admin-entity-crud
      title="Providers"
      subtitle="Create, view, and update healthcare providers"
      createButtonLabel="Create Provider"
      [columns]="columns"
      [fields]="fields"
      [items]="items"
      [loading]="loading"
      [saving]="saving"
      [errorMessage]="errorMessage"
      [savedSuccessfully]="savedSuccessfully"
      [enableStatusToggle]="true"
      (refresh)="load()"
      (create)="onCreate($event)"
      (update)="onUpdate($event)"
      (toggleStatus)="onToggleStatus($event)"
    />
  `,
})
export class AdminProvidersComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  items: Provider[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  readonly columns: CrudColumn[] = [
    { key: 'providerCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'providerType', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'contactEmail', label: 'Contact Email' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'providerCode', label: 'Provider Code', required: true, placeholder: 'e.g. STPAUL-HOSP', readonlyOnEdit: true },
    { key: 'name', label: 'Provider Name', placeholder: 'St. Paul Hospital' },
    {
      key: 'providerType',
      label: 'Provider Type',
      type: 'select',
      options: [
        { value: ProviderType.HOSPITAL, label: 'Hospital' },
        { value: ProviderType.LABORATORY, label: 'Laboratory' },
        { value: ProviderType.PHARMACY, label: 'Pharmacy' },
      ],
    },
    ...ORG_CONTACT_CRUD_FIELDS,
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getProviders().subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load providers.'; this.loading = false; },
    });
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createProvider(body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create provider.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateProvider(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update provider.'; this.saving = false; },
    });
  }

  onToggleStatus(item: unknown): void {
    const provider = item as Provider;
    const action = provider.status === 'ACTIVE'
      ? this.api.deactivateProvider(provider.id)
      : this.api.activateProvider(provider.id);

    action.subscribe({
      next: () => this.load(),
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update provider status.'; },
    });
  }
}
