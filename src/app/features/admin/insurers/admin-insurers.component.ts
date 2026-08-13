import { Component, inject, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { Insurer } from '../../../core/models';

@Component({
  selector: 'app-admin-insurers',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  template: `
    <app-admin-entity-crud
      title="Insurers"
      subtitle="Create, view, and update insurance companies"
      createButtonLabel="Create Insurer"
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
export class AdminInsurersComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  items: Insurer[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  readonly columns: CrudColumn[] = [
    { key: 'companyCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'companyCode', label: 'Company Code', required: true, placeholder: 'e.g. ABC-INS', readonlyOnEdit: true },
    { key: 'name', label: 'Company Name', required: true, placeholder: 'ABC Insurance' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getInsurers().subscribe({
      next: (items) => { this.items = items; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load insurers.'; this.loading = false; },
    });
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createInsurer(body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create insurer.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateInsurer(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update insurer.'; this.saving = false; },
    });
  }
}
