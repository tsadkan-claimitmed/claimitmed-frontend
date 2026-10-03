import { Component, Input, Output, EventEmitter, inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';

export interface CrudColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface CrudField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'tel' | 'password';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  readonlyOnEdit?: boolean;
  createOnly?: boolean;
  showWhen?: { field: string; values: string[] };
}

type PanelMode = 'empty' | 'create' | 'view' | 'edit';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-admin-entity-crud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-entity-crud.component.html',
  styleUrl: './admin-entity-crud.component.scss',
})
export class AdminEntityCrudComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.filterQuery = query;
  });

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
  @Input() enableStatusToggle = false;
  @Input() statusKey = 'status';
  @Input() activeStatusValue = 'ACTIVE';

  @Input() set savedSuccessfully(value: number) {
    if (value > this.lastSavedToken) {
      this.mode = this.selectedItem ? 'view' : 'empty';
      this.lastSavedToken = value;
    }
  }

  @Output() create = new EventEmitter<Record<string, unknown>>();
  @Output() update = new EventEmitter<{ id: string; body: Record<string, unknown> }>();
  @Output() refresh = new EventEmitter<void>();
  @Output() toggleStatus = new EventEmitter<unknown>();
  @Output() itemSelected = new EventEmitter<unknown | null>();

  mode: PanelMode = 'empty';
  selectedItem: Record<string, unknown> | null = null;
  form!: FormGroup;
  searchQuery = '';
  filterQuery = '';
  searchReadonly = true;
  searchLocked = false;
  sortColumn = '';
  sortDirection: SortDirection = 'asc';
  confirmSave = false;
  confirmStatusToggle = false;
  pendingStatusItem: unknown | null = null;
  private pendingUpdate: { id: string; body: Record<string, unknown> } | null = null;
  private lastSavedToken = 0;
  private conditionalFieldSubscription?: Subscription;
  private lockedSearchQuery = '';
  private searchLockTimers: ReturnType<typeof setTimeout>[] = [];
  private searchInputRef?: ElementRef<HTMLInputElement>;

  @ViewChild('searchInput') set searchInput(element: ElementRef<HTMLInputElement> | undefined) {
    this.searchInputRef = element;
  }

  get detailColumns(): CrudField[] {
    const columns = this.detailFields.length > 0 ? this.detailFields : this.fields;
    return columns.filter((field) => {
      if (field.createOnly) {
        return false;
      }
      return this.isFieldVisible(field);
    });
  }

  get formFields(): CrudField[] {
    return this.fields.filter((field) => {
      if (this.mode === 'edit' && field.createOnly) {
        return false;
      }
      return this.isFieldVisible(field);
    });
  }

  get displayedItems(): unknown[] {
    const query = this.filterQuery.trim().toLowerCase();
    let result = [...this.items];

    if (query) {
      result = result.filter((item) =>
        this.columns.some((col) => this.cellValue(item, col.key).toLowerCase().includes(query)),
      );
    }

    if (this.sortColumn) {
      const key = this.sortColumn;
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const left = this.cellValue(a, key).toLowerCase();
        const right = this.cellValue(b, key).toLowerCase();
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });
    }

    return result;
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
    this.itemSelected.emit(null);
  }

  viewItem(item: unknown): void {
    this.selectedItem = item as Record<string, unknown>;
    this.mode = 'view';
    this.errorMessage = '';
    this.itemSelected.emit(item);
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
      this.pendingUpdate = { id: String(this.selectedItem['id']), body: value };
      this.confirmSave = true;
    }
  }

  confirmSaveChanges(): void {
    if (!this.pendingUpdate) return;
    this.update.emit(this.pendingUpdate);
    this.confirmSave = false;
    this.pendingUpdate = null;
  }

  cancelSaveConfirm(): void {
    this.confirmSave = false;
    this.pendingUpdate = null;
  }

  toggleSort(column: CrudColumn): void {
    if (column.sortable === false) return;
    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.key;
      this.sortDirection = 'asc';
    }
  }

  sortIndicator(column: CrudColumn): string {
    if (this.sortColumn !== column.key) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
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
    return record[key] === this.activeStatusValue;
  }

  isItemActive(item: unknown): boolean {
    return this.isActiveStatus(item, this.statusKey);
  }

  itemId(item: unknown): string {
    return String((item as Record<string, unknown>)['id'] ?? '');
  }

  onToggleStatus(item: unknown, event: Event): void {
    event.stopPropagation();
    this.requestStatusToggle(item);
  }

  requestStatusToggle(item: unknown): void {
    this.pendingStatusItem = item;
    this.confirmStatusToggle = true;
  }

  confirmStatusChange(): void {
    if (!this.pendingStatusItem) return;
    this.toggleStatus.emit(this.pendingStatusItem);
    this.confirmStatusToggle = false;
    this.pendingStatusItem = null;
  }

  cancelStatusConfirm(): void {
    this.confirmStatusToggle = false;
    this.pendingStatusItem = null;
  }

  itemDisplayName(item: unknown): string {
    const record = item as Record<string, unknown>;
    return String(
      record['name']
      ?? record['companyCode']
      ?? record['employerCode']
      ?? record['providerCode']
      ?? 'this item',
    );
  }

  isPendingStatusActive(): boolean {
    if (!this.pendingStatusItem) return false;
    return this.isItemActive(this.pendingStatusItem);
  }

  isFieldVisible(field: CrudField): boolean {
    if (!field.showWhen) {
      return true;
    }

    const source = this.form?.get(field.showWhen.field)?.value ?? this.selectedItem?.[field.showWhen.field];
    if (source == null || source === '') {
      return false;
    }

    return field.showWhen.values.includes(String(source));
  }

  clearSearch(): void {
    if (this.searchLocked) return;
    this.searchQuery = '';
    this.filterQuery = '';
  }

  enableSearchEditing(): void {
    this.searchReadonly = false;
  }

  /** Prevents browser autofill from polluting the table search while modals are open. */
  lockSearch(): void {
    this.lockedSearchQuery = this.searchQuery;
    this.searchLocked = true;
    this.scheduleSearchReset();
  }

  unlockSearch(): void {
    this.searchLocked = false;
    this.clearSearchLockTimers();
  }

  onSearchInput(value: string): void {
    if (this.searchLocked) {
      this.enforceLockedSearch();
      return;
    }
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  ngOnDestroy(): void {
    this.clearSearchLockTimers();
    this.conditionalFieldSubscription?.unsubscribe();
    this.searchHandler.destroy();
  }

  private scheduleSearchReset(): void {
    this.clearSearchLockTimers();
    for (const delay of [0, 50, 150, 300, 600]) {
      this.searchLockTimers.push(setTimeout(() => this.enforceLockedSearch(), delay));
    }
  }

  private enforceLockedSearch(): void {
    if (!this.searchLocked) return;

    if (this.searchQuery !== this.lockedSearchQuery) {
      this.searchQuery = this.lockedSearchQuery;
    }

    const input = this.searchInputRef?.nativeElement;
    if (input && input.value !== this.lockedSearchQuery) {
      input.value = this.lockedSearchQuery;
    }
  }

  private clearSearchLockTimers(): void {
    for (const timer of this.searchLockTimers) {
      clearTimeout(timer);
    }
    this.searchLockTimers = [];
  }

  private buildForm(record: Record<string, unknown>): void {
    const group: Record<string, unknown> = {};
    for (const field of this.fields) {
      if (this.mode === 'edit' && field.createOnly) {
        continue;
      }
      const disabled = this.mode === 'edit' && field.readonlyOnEdit;
      const value = record[field.key] ?? '';
      group[field.key] = [{ value, disabled }, field.required ? Validators.required : []];
    }
    this.form = this.fb.group(group);
    this.bindConditionalFields();
  }

  private bindConditionalFields(): void {
    this.conditionalFieldSubscription?.unsubscribe();
    this.syncConditionalFields();

    const driverFields = [
      ...new Set(
        this.fields
          .filter((field) => field.showWhen)
          .map((field) => field.showWhen!.field),
      ),
    ];

    if (driverFields.length === 0) {
      return;
    }

    this.conditionalFieldSubscription = new Subscription();
    for (const driverField of driverFields) {
      const control = this.form.get(driverField);
      if (!control) continue;
      this.conditionalFieldSubscription.add(
        control.valueChanges.subscribe(() => this.syncConditionalFields()),
      );
    }
  }

  private syncConditionalFields(): void {
    if (!this.form) {
      return;
    }

    for (const field of this.fields) {
      const control = this.form.get(field.key);
      if (!control) {
        continue;
      }

      const visible = this.isFieldVisible(field);
      if (!visible) {
        control.clearValidators();
        control.setValue('', { emitEvent: false });
        control.updateValueAndValidity({ emitEvent: false });
        continue;
      }

      if (field.required) {
        control.setValidators(Validators.required);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private normalizeFormValue(raw: Record<string, unknown>): Record<string, unknown> {
    const value = { ...raw };
    for (const field of this.fields) {
      if (!this.isFieldVisible(field) || (this.mode === 'edit' && field.createOnly)) {
        delete value[field.key];
      }
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
