import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FraudRule, FraudRuleCatalogItem } from '../../../core/models';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';

type PanelMode = 'empty' | 'create' | 'view' | 'edit';

@Component({
  selector: 'app-admin-fraud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-fraud.component.html',
  styleUrl: './admin-fraud.component.scss',
})
export class AdminFraudComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.filterQuery = query;
  });

  rules: FraudRule[] = [];
  catalog: FraudRuleCatalogItem[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  mode: PanelMode = 'empty';
  selectedRule: FraudRule | null = null;
  rulePendingDelete: FraudRule | null = null;
  searchQuery = '';
  filterQuery = '';
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  get displayedRules(): FraudRule[] {
    const query = this.filterQuery.trim().toLowerCase();
    let result = [...this.rules];

    if (query) {
      result = result.filter((rule) =>
        [rule.ruleCode, rule.ruleName, rule.severity, rule.entityType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      );
    }

    if (this.sortColumn) {
      const key = this.sortColumn as keyof FraudRule;
      const direction = this.sortDirection === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const left = String(a[key] ?? '').toLowerCase();
        const right = String(b[key] ?? '').toLowerCase();
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
        return 0;
      });
    }

    return result;
  }

  createForm = this.fb.group({
    ruleCode: ['', Validators.required],
    ruleName: ['', Validators.required],
    entityType: ['CLAIM', Validators.required],
    severity: ['MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW', Validators.required],
    conditionJson: ['{}', Validators.required],
    isActive: [true],
  });

  editForm = this.fb.group({
    ruleName: ['', Validators.required],
    entityType: ['', Validators.required],
    severity: ['MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW', Validators.required],
    conditionJson: ['', Validators.required],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
    this.api.getFraudRuleCatalog().subscribe({ next: (c) => { this.catalog = c; } });
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getFraudRules().subscribe({
      next: (rules) => { this.rules = rules; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to load fraud rules.'; this.loading = false; },
    });
  }

  openCreateFromCatalog(item: FraudRuleCatalogItem): void {
    this.selectedRule = null;
    this.mode = 'create';
    this.createForm.reset({
      ruleCode: item.ruleCode,
      ruleName: item.ruleName,
      entityType: item.entityType,
      severity: item.defaultSeverity,
      conditionJson: JSON.stringify(item.defaultCondition, null, 2),
      isActive: true,
    });
    this.errorMessage = '';
  }

  openCreateBlank(): void {
    this.selectedRule = null;
    this.mode = 'create';
    this.createForm.reset({
      ruleCode: '', ruleName: '', entityType: 'CLAIM', severity: 'MEDIUM', conditionJson: '{}', isActive: true,
    });
    this.errorMessage = '';
  }

  viewRule(rule: FraudRule): void {
    this.selectedRule = rule;
    this.mode = 'view';
    this.errorMessage = '';
  }

  openEdit(rule?: FraudRule): void {
    const target = rule ?? this.selectedRule;
    if (!target) return;
    this.selectedRule = target;
    this.mode = 'edit';
    this.editForm.reset({
      ruleName: target.ruleName ?? '',
      entityType: target.entityType ?? 'CLAIM',
      severity: target.severity ?? 'MEDIUM',
      conditionJson: JSON.stringify(target.conditionJson ?? {}, null, 2),
      isActive: target.isActive,
    });
    this.errorMessage = '';
  }

  cancelPanel(): void {
    this.mode = this.selectedRule ? 'view' : 'empty';
    this.errorMessage = '';
  }

  isSelected(rule: FraudRule): boolean {
    return this.selectedRule?.id === rule.id;
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    let conditionJson: Record<string, unknown>;
    try {
      conditionJson = JSON.parse(this.createForm.getRawValue().conditionJson!);
    } catch {
      this.errorMessage = 'Condition JSON must be valid JSON.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const { ruleCode, ruleName, entityType, severity, isActive } = this.createForm.getRawValue();
    this.api.createFraudRule({
      ruleCode: ruleCode!, ruleName: ruleName!, entityType: entityType!,
      conditionJson, severity: severity!, action: 'FLAG', isActive: isActive ?? true,
    }).subscribe({
      next: () => { this.saving = false; this.mode = 'empty'; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create rule.'; this.saving = false; },
    });
  }

  submitEdit(): void {
    if (!this.selectedRule || this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    let conditionJson: Record<string, unknown>;
    try {
      conditionJson = JSON.parse(this.editForm.getRawValue().conditionJson!);
    } catch {
      this.errorMessage = 'Condition JSON must be valid JSON.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const { ruleName, entityType, severity, isActive } = this.editForm.getRawValue();
    this.api.updateFraudRule(this.selectedRule.id, {
      ruleName: ruleName!, entityType: entityType!, conditionJson, severity: severity!, isActive: isActive ?? true,
    }).subscribe({
      next: (updated) => {
        this.saving = false;
        this.selectedRule = updated;
        this.mode = 'view';
        this.load();
      },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update rule.'; this.saving = false; },
    });
  }

  toggleRule(rule: FraudRule): void {
    const action = rule.isActive ? this.api.deactivateFraudRule(rule.id) : this.api.activateFraudRule(rule.id);
    action.subscribe({
      next: (updated) => {
        rule.isActive = updated.isActive;
        if (this.selectedRule?.id === rule.id) this.selectedRule = updated;
      },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to toggle rule.'; },
    });
  }

  deleteRule(rule: FraudRule, event?: Event): void {
    event?.stopPropagation();
    this.rulePendingDelete = rule;
    this.errorMessage = '';
  }

  cancelDelete(): void {
    if (!this.saving) {
      this.rulePendingDelete = null;
    }
  }

  confirmDelete(): void {
    const rule = this.rulePendingDelete;
    if (!rule) return;

    this.saving = true;
    this.errorMessage = '';
    this.api.deleteFraudRule(rule.id).subscribe({
      next: () => {
        this.saving = false;
        this.rulePendingDelete = null;
        if (this.selectedRule?.id === rule.id) {
          this.selectedRule = null;
          this.mode = 'empty';
        }
        this.load();
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to delete rule.';
        this.saving = false;
      },
    });
  }

  get deleteRuleLabel(): string {
    if (!this.rulePendingDelete) return '';
    return this.rulePendingDelete.ruleName ?? this.rulePendingDelete.ruleCode;
  }

  toggleSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  sortIndicator(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterQuery = '';
  }
}
