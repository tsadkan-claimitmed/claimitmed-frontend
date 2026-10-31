import { Component, Input, Output, EventEmitter, inject, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
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
  type?: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'number' | 'email' | 'tel' | 'password';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  readonlyOnEdit?: boolean;
  createOnly?: boolean;
  showWhen?: { field: string; values: string[] };
  hideWhen?: { field: string; values: string[] };
  format?: (value: unknown, item: Record<string, unknown> | null) => string;
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
export class AdminEntityCrudComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.filterQuery = query;
    this.page = 1;
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
  @Input() pageSize = 15;
  readonly pageSizeOptions = [10, 15, 25, 50];

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
  statusFilter = '';
  page = 1;
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
      if (field.createOnly || this.isInternalIdField(field)) {
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

    if (this.statusFilter) {
      result = result.filter((item) => {
        const record = item as Record<string, unknown>;
        return String(record[this.statusKey] ?? '') === this.statusFilter;
      });
    }

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

  get pagedItems(): unknown[] {
    const start = (this.page - 1) * this.pageSize;
    return this.displayedItems.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.displayedItems.length / this.pageSize));
  }

  get showingFrom(): number {
    if (this.displayedItems.length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.pageSize, this.displayedItems.length);
  }

  get searchHint(): string {
    const labels = this.columns
      .filter((col) => col.key !== this.statusKey && col.key !== 'status')
      .slice(0, 2)
      .map((col) => col.label.toLowerCase());
    return labels.length ? `Search by ${labels.join(' or ')}...` : 'Search this list...';
  }

  get hasStatusFilter(): boolean {
    return this.columns.some((col) => col.key === this.statusKey || col.key === 'status')
      || this.enableStatusToggle
      || this.items.some((item) => (item as Record<string, unknown>)[this.statusKey] != null);
  }

  get statusFilterOptions(): string[] {
    const values = new Set<string>();
    for (const item of this.items) {
      const status = (item as Record<string, unknown>)[this.statusKey];
      if (status != null && status !== '') {
        values.add(String(status));
      }
    }
    return [...values].sort();
  }

  get detailHasStatus(): boolean {
    return this.detailColumns.some((field) => field.key === this.statusKey || field.key === 'status');
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }

  goToPage(page: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, page));
  }

  onPageSizeChange(size: string | number): void {
    this.pageSize = Number(size) || 15;
    this.page = 1;
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter = value;
    this.page = 1;
  }

  toggleSort(column: CrudColumn): void {
    if (column.sortable === false) return;
    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.key;
      this.sortDirection = 'asc';
    }
    this.page = 1;
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
    const field = this.fields.find((entry) => entry.key === key);
    return this.formatDisplayValue(record[key], field, record);
  }

  isMultiSelected(fieldKey: string, optionValue: string): boolean {
    const value = this.form?.get(fieldKey)?.value;
    return Array.isArray(value) && value.includes(optionValue);
  }

  toggleMultiSelect(fieldKey: string, optionValue: string): void {
    const control = this.form?.get(fieldKey);
    if (!control || control.disabled) return;
    const current = Array.isArray(control.value) ? [...control.value] : [];
    const next = current.includes(optionValue)
      ? current.filter((value) => value !== optionValue)
      : [...current, optionValue];
    control.setValue(next);
    control.markAsTouched();
    control.markAsDirty();
  }

  detailValue(key: string): string {
    if (!this.selectedItem) return '—';
    const field = this.fields.find((entry) => entry.key === key);
    return this.formatDisplayValue(this.selectedItem[key], field, this.selectedItem);
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
    if (field.showWhen && !this.matchesCondition(field.showWhen)) {
      return false;
    }
    if (field.hideWhen && this.matchesCondition(field.hideWhen)) {
      return false;
    }
    return true;
  }

  clearSearch(): void {
    if (this.searchLocked) return;
    this.searchQuery = '';
    this.filterQuery = '';
    this.page = 1;
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

  private isInternalIdField(field: CrudField): boolean {
    if (field.format || field.options?.length) {
      return false;
    }
    return field.key === 'id' || /Ids?$/.test(field.key);
  }

  private isDbId(value: unknown): boolean {
    return typeof value === 'string' && this.uuidPattern.test(value);
  }

  formatLabel(value: unknown): string {
    if (value == null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (this.isDbId(value)) return '—';
    const text = String(value);
    if (/^[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(text)) {
      return text
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }
    return text;
  }

  private formatDisplayValue(
    value: unknown,
    field?: CrudField,
    item: Record<string, unknown> | null = null,
  ): string {
    if (field?.format) {
      return field.format(value, item);
    }
    if (field?.type === 'checkbox') {
      return value === true ? 'Yes' : 'No';
    }
    if (field?.type === 'select' && field.options?.length) {
      const match = field.options.find((option) => option.value === String(value ?? ''));
      return match?.label ?? this.formatLabel(value);
    }
    if (field?.type === 'multiselect' && Array.isArray(value)) {
      const labels = (field.options ?? [])
        .filter((option) => value.includes(option.value))
        .map((option) => option.label);
      return labels.length > 0 ? labels.join(', ') : '—';
    }
    if (Array.isArray(value)) {
      const labels = value
        .filter((entry) => !this.isDbId(entry))
        .map((entry) => this.formatLabel(entry));
      return labels.length > 0 ? labels.join(', ') : '—';
    }
    return this.formatLabel(value);
  }

  private matchesCondition(condition: { field: string; values: string[] }): boolean {
    const source = this.form?.get(condition.field)?.value ?? this.selectedItem?.[condition.field];
    if (source == null || source === '') {
      return condition.values.includes('') || condition.values.includes('false');
    }
    return condition.values.includes(String(source));
  }

  private emptyValueFor(field: CrudField): unknown {
    if (field.type === 'checkbox') return false;
    if (field.type === 'multiselect') return [];
    return '';
  }

  private validatorsFor(field: CrudField) {
    if (!field.required) {
      return [];
    }
    if (field.type === 'multiselect') {
      return [Validators.minLength(1)];
    }
    if (field.type === 'checkbox') {
      return [];
    }
    return [Validators.required];
  }

  private buildForm(record: Record<string, unknown>): void {
    const group: Record<string, unknown> = {};
    for (const field of this.fields) {
      if (this.mode === 'edit' && field.createOnly) {
        continue;
      }
      const disabled = this.mode === 'edit' && field.readonlyOnEdit;
      let value: unknown = record[field.key] ?? this.emptyValueFor(field);
      if (field.type === 'checkbox') {
        value = record[field.key] === true;
      } else if (field.type === 'multiselect') {
        value = Array.isArray(record[field.key]) ? record[field.key] : [];
      }
      group[field.key] = [{ value, disabled }, this.validatorsFor(field)];
    }
    this.form = this.fb.group(group);
    this.bindConditionalFields();
  }

  private bindConditionalFields(): void {
    this.conditionalFieldSubscription?.unsubscribe();
    this.syncConditionalFields();

    const driverFields = [
      ...new Set(
        this.fields.flatMap((field) => {
          const drivers: string[] = [];
          if (field.showWhen) drivers.push(field.showWhen.field);
          if (field.hideWhen) drivers.push(field.hideWhen.field);
          return drivers;
        }),
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
        control.setValue(this.emptyValueFor(field), { emitEvent: false });
        control.updateValueAndValidity({ emitEvent: false });
        continue;
      }

      control.setValidators(this.validatorsFor(field));
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private normalizeFormValue(raw: Record<string, unknown>): Record<string, unknown> {
    const value = { ...raw };
    for (const field of this.fields) {
      if (!this.isFieldVisible(field) || (this.mode === 'edit' && field.createOnly)) {
        delete value[field.key];
      }
      if (field.type === 'checkbox' && field.key in value) {
        value[field.key] = value[field.key] === true;
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
