import { Component, inject, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { MedicalService } from '../../../core/models';

@Component({
  selector: 'app-admin-medical-services',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  template: `
    <app-admin-entity-crud
      title="Medical Services"
      subtitle="Create, view, and update medical service catalog"
      createButtonLabel="Create Medical Service"
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
export class AdminMedicalServicesComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  items: MedicalService[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  readonly columns: CrudColumn[] = [
    { key: 'serviceCode', label: 'Code' },
    { key: 'serviceName', label: 'Name' },
    { key: 'category', label: 'Category' },
  ];

  readonly fields: CrudField[] = [
    { key: 'serviceCode', label: 'Service Code', required: true, placeholder: 'e.g. CONSULT-GP', readonlyOnEdit: true },
    { key: 'serviceName', label: 'Service Name', required: true, placeholder: 'General Consultation' },
    { key: 'category', label: 'Category', placeholder: 'Outpatient' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getMedicalServices().subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load services.'; this.loading = false; },
    });
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createMedicalService(body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create service.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateMedicalService(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update service.'; this.saving = false; },
    });
  }
}
