import { Component, inject, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { Diagnosis } from '../../../core/models';

@Component({
  selector: 'app-admin-diagnoses',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  template: `
    <app-admin-entity-crud
      title="Diagnoses"
      subtitle="Create, view, and update ICD-10 diagnosis catalog"
      createButtonLabel="Create Diagnosis"
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
export class AdminDiagnosesComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  items: Diagnosis[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  readonly columns: CrudColumn[] = [
    { key: 'icd10Code', label: 'ICD-10 Code' },
    { key: 'description', label: 'Description' },
  ];

  readonly fields: CrudField[] = [
    { key: 'icd10Code', label: 'ICD-10 Code', required: true, placeholder: 'e.g. J06.9', readonlyOnEdit: true },
    { key: 'description', label: 'Description', required: true, type: 'textarea' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getDiagnoses().subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load diagnoses.'; this.loading = false; },
    });
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createDiagnosis(body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create diagnosis.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateDiagnosis(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update diagnosis.'; this.saving = false; },
    });
  }
}
