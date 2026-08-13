import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface CrudColumn {
  key: string;
  label: string;
}

export interface CrudField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

@Component({
  selector: 'app-admin-entity-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-entity-crud.component.html',
  styleUrl: './admin-entity-crud.component.scss',
})
export class AdminEntityCrudComponent {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) title!: string;
  @Input({ required: true }) subtitle!: string;
  @Input({ required: true }) columns!: CrudColumn[];
  @Input({ required: true }) fields!: CrudField[];
  @Input() items: unknown[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() errorMessage = '';
  @Input() readOnlyNote = 'Update and delete are not available for this catalog yet.';
  @Input() set savedSuccessfully(value: number) {
    if (value > this.lastSavedToken) {
      this.showForm = false;
      this.lastSavedToken = value;
    }
  }

  @Output() create = new EventEmitter<Record<string, unknown>>();
  @Output() refresh = new EventEmitter<void>();

  showForm = false;
  form!: FormGroup;
  private lastSavedToken = 0;

  openCreate(): void {
    const group: Record<string, unknown> = {};
    for (const field of this.fields) {
      group[field.key] = ['', field.required ? Validators.required : []];
    }
    this.form = this.fb.group(group);
    this.showForm = true;
    this.errorMessage = '';
  }

  cancel(): void {
    this.showForm = false;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = { ...this.form.getRawValue() };
    for (const field of this.fields) {
      if (field.type === 'number' && value[field.key] !== '' && value[field.key] != null) {
        value[field.key] = Number(value[field.key]);
      }
      if (!field.required && value[field.key] === '') {
        delete value[field.key];
      }
    }
    this.create.emit(value);
  }

  cellValue(item: unknown, key: string): string {
    const record = item as Record<string, unknown>;
    const val = record[key];
    if (val == null || val === '') return '—';
    return String(val);
  }

  isActiveStatus(item: unknown, key: string): boolean {
    const record = item as Record<string, unknown>;
    return record[key] === 'ACTIVE';
  }

  get createTitle(): string {
    return this.title.endsWith('s') ? this.title.slice(0, -1) : this.title;
  }
}
