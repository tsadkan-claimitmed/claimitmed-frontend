import { Component, inject, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { Benefit } from '../../../core/models';

@Component({
  selector: 'app-admin-benefits',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  template: `
    <app-admin-entity-crud
      title="Benefits"
      subtitle="Search and maintain the benefit catalog"
      createButtonLabel="Create Benefit"
      [columns]="columns"
      [fields]="fields"
      [items]="items"
      [loading]="loading"
      [saving]="saving"
      [errorMessage]="errorMessage"
      [savedSuccessfully]="savedSuccessfully"
      (refresh)="load()"
      (create)="onCreate($event)"
      (update)="onUpdate($event)"
    />
  `,
})
export class AdminBenefitsComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  items: Benefit[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  readonly columns: CrudColumn[] = [
    { key: 'benefitCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
  ];

  readonly fields: CrudField[] = [
    { key: 'benefitCode', label: 'Benefit Code', required: true, placeholder: 'e.g. DENTAL-001', readonlyOnEdit: true },
    { key: 'name', label: 'Name', required: true, placeholder: 'Dental Care' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getBenefits().subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load benefits.'; this.loading = false; },
    });
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createBenefit(body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create benefit.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateBenefit(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update benefit.'; this.saving = false; },
    });
  }
}
