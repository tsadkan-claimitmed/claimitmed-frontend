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
  readonlyOnEdit?: boolean;
}

type PanelMode = 'empty' | 'create' | 'view' | 'edit';

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
  @Input() createButtonLabel = 'Create New';
  @Input({ required: true }) columns!: CrudColumn[];
  @Input({ required: true }) fields!: CrudField[];
  @Input() detailFields: CrudField[] = [];
  @Input() items: unknown[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Input() errorMessage = '';
  @Input() canUpdate = true;

  @Input() set savedSuccessfully(value: number) {
    if (value > this.lastSavedToken) {
      this.mode = this.selectedItem ? 'view' : 'empty';
      this.lastSavedToken = value;
    }
  }

  @Output() create = new EventEmitter<Record<string, unknown>>();
  @Output() update = new EventEmitter<{ id: string; body: Record<string, unknown> }>();
  @Output() refresh = new EventEmitter<void>();

  mode: PanelMode = 'empty';
  selectedItem: Record<string, unknown> | null = null;
  form!: FormGroup;
  private lastSavedToken = 0;

  get detailColumns(): CrudField[] {
    return this.detailFields.length > 0 ? this.detailFields : this.fields;
  }

  get panelTitle(): string {
    switch (this.mode) {
      case 'create': return `Create ${this.singularTitle}`;
      case 'view': return `${this.singularTitle} Details`;
      case 'edit': return `Edit ${this.singularTitle}`;
      default: return `${this.singularTitle} Details`;
    }
  }

  get singularTitle(): string {
    return this.title.endsWith('s') ? this.title.slice(0, -1) : this.title;
  }

  openCreate(): void {
    this.selectedItem = null;
    this.mode = 'create';
    this.buildForm({});
    this.errorMessage = '';
  }

  viewItem(item: unknown): void {
    this.selectedItem = item as Record<string, unknown>;
    this.mode = 'view';
    this.errorMessage = '';
  }

  openEdit(item?: unknown): void {
    const record = (item ?? this.selectedItem) as Record<string, unknown>;
    if (!record) return;
    this.selectedItem = record;
    this.mode = 'edit';
    this.buildForm(record);
    this.errorMessage = '';
  }

  cancelPanel(): void {
    if (this.selectedItem) {
      this.mode = 'view';
    } else {
      this.mode = 'empty';
    }
    this.errorMessage = '';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.normalizeFormValue(this.form.getRawValue());

    if (this.mode === 'create') {
      this.create.emit(value);
    } else if (this.mode === 'edit' && this.selectedItem?.['id']) {
      this.update.emit({ id: String(this.selectedItem['id']), body: value });
    }
  }

  isSelected(item: unknown): boolean {
    const record = item as Record<string, unknown>;
    return !!this.selectedItem && this.selectedItem['id'] === record['id'];
  }

  cellValue(item: unknown, key: string): string {
    const record = item as Record<string, unknown>;
    const val = record[key];
    if (val == null || val === '') return '—';
    return String(val);
  }

  detailValue(key: string): string {
    if (!this.selectedItem) return '—';
    return this.cellValue(this.selectedItem, key);
  }

  isActiveStatus(item: unknown, key: string): boolean {
    const record = item as Record<string, unknown>;
    return record[key] === 'ACTIVE';
  }

  itemId(item: unknown): string {
    return String((item as Record<string, unknown>)['id'] ?? '');
  }

  private buildForm(record: Record<string, unknown>): void {
    const group: Record<string, unknown> = {};
    for (const field of this.fields) {
      const disabled = this.mode === 'edit' && field.readonlyOnEdit;
      const value = record[field.key] ?? '';
      group[field.key] = [{ value, disabled }, field.required ? Validators.required : []];
    }
    this.form = this.fb.group(group);
  }

  private normalizeFormValue(raw: Record<string, unknown>): Record<string, unknown> {
    const value = { ...raw };
    for (const field of this.fields) {
      if (field.type === 'number' && value[field.key] !== '' && value[field.key] != null) {
        value[field.key] = Number(value[field.key]);
      }
      if (!field.required && value[field.key] === '') {
        delete value[field.key];
      }
      if (this.mode === 'edit' && field.readonlyOnEdit) {
        delete value[field.key];
      }
    }
    return value;
  }
}
