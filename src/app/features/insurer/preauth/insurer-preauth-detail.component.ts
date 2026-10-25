import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { PreauthReviewDetail, TreatmentItem } from '../../../core/models';
import { PreauthLineDecision, PreauthStatus } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { formatEnumLabel } from '../../../shared/features/policies/policy-detail.utils';

@Component({
  selector: 'app-insurer-preauth-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-preauth-detail.component.html',
  styleUrl: './insurer-preauth-detail.component.scss',
})
export class InsurerPreauthDetailComponent implements OnInit {
  private readonly api = inject(InsurerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detail: PreauthReviewDetail | null = null;
  loading = true;
  acting = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'treatment' | 'coverage' | 'history' | 'member' = 'treatment';
  showDenyDialog = false;
  showApproveDialog = false;
  denyReason = '';
  approvalScope: 'FULL' | 'SPECIFIC' = 'FULL';
  approvedAmountInput = 0;
  readonly PreauthStatus = PreauthStatus;
  readonly PreauthLineDecision = PreauthLineDecision;
  formatEnum = formatEnumLabel;
  lineDrafts: Record<string, { decision: 'APPROVED' | 'DENIED' | ''; amount: number; reason: string }> = {};

  ngOnInit(): void {
    const treatmentId = this.route.snapshot.paramMap.get('id');
    if (!treatmentId) {
      this.errorMessage = 'Treatment ID is missing.';
      this.loading = false;
      return;
    }
    this.loadDetail(treatmentId);
  }

  isPending(): boolean {
    return this.detail?.decisionSummary.preauthStatus === PreauthStatus.PENDING;
  }

  parseAmount(value?: string | number | null): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }

  lineAmount(value?: string | number | null): number {
    return this.parseAmount(value);
  }

  setTab(tab: 'treatment' | 'coverage' | 'history' | 'member'): void {
    this.activeTab = tab;
  }

  preauthItems(): TreatmentItem[] {
    return (this.detail?.treatment.items ?? []).filter((item) => item.requiresPreauth);
  }

  preauthRequestedTotal(): number {
    return this.preauthItems().reduce((sum, item) => sum + this.lineAmount(item.totalPrice), 0);
  }

  draftFor(item: TreatmentItem) {
    return this.lineDrafts[item.id] ?? { decision: '' as const, amount: this.lineAmount(item.totalPrice), reason: '' };
  }

  setLineDecision(item: TreatmentItem, decision: 'APPROVED' | 'DENIED'): void {
    const current = this.draftFor(item);
    this.lineDrafts[item.id] = {
      ...current,
      decision,
      amount: current.amount || this.lineAmount(item.totalPrice),
    };
  }

  denyAllLines(): void {
    this.openDenyDialog();
  }

  lineDecisionsValid(): boolean {
    return this.preauthItems().every((item) => {
      const draft = this.draftFor(item);
      if (draft.decision === 'APPROVED') {
        return draft.amount > 0.005 && draft.amount <= this.lineAmount(item.totalPrice) + 0.001;
      }
      if (draft.decision === 'DENIED') {
        return draft.reason.trim().length >= 10;
      }
      return false;
    });
  }

  submitLineDecisions(): void {
    if (!this.detail || !this.isPending() || !this.lineDecisionsValid()) return;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const lines = this.preauthItems().map((item) => {
      const draft = this.draftFor(item);
      return {
        itemId: item.id,
        decision: draft.decision as 'APPROVED' | 'DENIED',
        approvedAmount: draft.decision === 'APPROVED' ? draft.amount : undefined,
        reason: draft.decision === 'DENIED' ? draft.reason.trim() : undefined,
      };
    });
    this.api.decidePreauth(this.detail.treatment.id, lines).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = 'Preauthorization decisions saved.';
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to save preauthorization decisions.';
      },
    });
  }

  approvedAmount(): number {
    return this.lineAmount(
      this.detail?.decisionSummary.preauthApprovedAmount
        ?? this.detail?.treatment.preauthApprovedAmount,
    );
  }

  selectedApprovedAmount(): number {
    if (this.approvalScope === 'FULL') return this.preauthRequestedTotal();
    const amount = Number(this.approvedAmountInput);
    return Number.isFinite(amount) ? amount : 0;
  }

  approveValid(): boolean {
    const amount = this.selectedApprovedAmount();
    return amount > 0.005 && amount <= this.preauthRequestedTotal() + 0.001;
  }

  setApprovalScope(scope: 'FULL' | 'SPECIFIC'): void {
    this.approvalScope = scope;
    if (scope === 'SPECIFIC' && this.approvedAmountInput <= 0) {
      this.approvedAmountInput = this.preauthRequestedTotal();
    }
  }

  openApproveDialog(): void {
    this.approvalScope = 'FULL';
    this.approvedAmountInput = this.preauthRequestedTotal();
    this.showApproveDialog = true;
  }

  cancelApprove(): void {
    this.showApproveDialog = false;
  }

  confirmApprove(): void {
    if (!this.detail || !this.isPending() || !this.approveValid()) return;
    this.showApproveDialog = false;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const amount = this.selectedApprovedAmount();
    this.api.approvePreauth(this.detail.treatment.id, {
      approvalScope: this.approvalScope,
      approvedAmount: this.approvalScope === 'SPECIFIC' ? amount : undefined,
    }).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = `Preauthorization approved for ETB ${Math.round(amount).toLocaleString('en-ET')}.`;
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to approve preauthorization.';
      },
    });
  }

  openDenyDialog(): void {
    this.denyReason = '';
    this.showDenyDialog = true;
  }

  cancelDeny(): void {
    this.showDenyDialog = false;
    this.denyReason = '';
  }

  confirmDeny(): void {
    if (!this.detail || !this.denyReason.trim()) return;
    this.showDenyDialog = false;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const reason = this.denyReason.trim();
    for (const item of this.preauthItems()) {
      this.lineDrafts[item.id] = { decision: 'DENIED', amount: this.lineAmount(item.totalPrice), reason };
    }
    this.api.denyPreauth(this.detail.treatment.id, reason).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = 'Preauthorization denied.';
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to deny preauthorization.';
      },
    });
  }

  formatRelationship(value?: string): string {
    return formatEnumLabel(value ?? '');
  }

  employerAddress(): string {
    if (!this.detail?.employer) return '—';
    const parts = [
      this.detail.employer.streetAddress,
      this.detail.employer.city,
      this.detail.employer.state,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  private loadDetail(treatmentId: string): void {
    this.loading = true;
    this.api.getPreauthDetail(treatmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.lineDrafts = {};
        for (const item of this.preauthItems()) {
          this.lineDrafts[item.id] = {
            decision: item.preauthDecision === 'APPROVED' || item.preauthDecision === 'DENIED'
              ? item.preauthDecision
              : '',
            amount: this.lineAmount(item.preauthApprovedAmount ?? item.totalPrice),
            reason: item.preauthDenialReason ?? '',
          };
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load preauthorization review.';
        this.loading = false;
      },
    });
  }
}
