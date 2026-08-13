import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FraudRule, FraudRuleCatalogItem } from '../../../core/models';

type PanelMode = 'empty' | 'create' | 'view' | 'edit';

@Component({
  selector: 'app-admin-fraud',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-fraud.component.html',
  styleUrl: './admin-fraud.component.scss',
})
export class AdminFraudComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminApiService);

  rules: FraudRule[] = [];
  catalog: FraudRuleCatalogItem[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  mode: PanelMode = 'empty';
  selectedRule: FraudRule | null = null;

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
}
