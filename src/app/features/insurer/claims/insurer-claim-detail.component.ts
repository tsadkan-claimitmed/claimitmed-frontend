import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { ClaimAttachment, ClaimDetail, ClaimFraudRuleRun } from '../../../core/models';
import { ClaimStatus, ClaimType, PaymentResponsibility } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimAttachmentsComponent } from '../../../shared/components/claim-attachments/claim-attachments.component';

@Component({
  selector: 'app-insurer-claim-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ClaimAttachmentsComponent,
  ],
  templateUrl: './insurer-claim-detail.component.html',
  styleUrl: './insurer-claim-detail.component.scss',
})
export class InsurerClaimDetailComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private paymentPollTimer: ReturnType<typeof setInterval> | null = null;

  readonly readOnly = this.route.snapshot.data['readOnly'] === true;
  readonly showFraudTab = this.route.snapshot.data['showFraudTab'] === true;
  readonly claimsBasePath = this.route.snapshot.data['claimsBasePath'] ?? '/portal/insurer/claims';
  readonly pageTitle = this.route.snapshot.data['pageTitle'] ?? 'Claim Adjudication';

  claim: ClaimDetail | null = null;
  loading = true;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';
  activeAction: 'reject' | 'request-info' | null = null;
  confirmApprove = false;
  activeTab: 'adjudication' | 'treatment' | 'coverage' | 'history' | 'member' | 'fraud' = 'adjudication';

  rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(2)]],
    comments: [''],
  });

  requestInfoForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(2)]],
    comments: [''],
  });

  ngOnInit(): void {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.errorMessage = 'Claim ID is missing.';
      this.loading = false;
      return;
    }
    this.loadClaim(claimId);
  }

  ngOnDestroy(): void {
    this.stopPaymentPolling();
  }

  get canAdjudicate(): boolean {
    if (this.readOnly || !this.claim) return false;
    return (
      this.claim.status === ClaimStatus.UNDER_REVIEW ||
      this.claim.status === ClaimStatus.REIMBURSEMENT_REVIEW ||
      this.claim.status === ClaimStatus.SUBMITTED
    );
  }

  get canRetryPayment(): boolean {
    return !this.readOnly && this.claim?.payment?.status === 'FAILED';
  }

  get paymentInProgress(): boolean {
    const status = this.claim?.payment?.status;
    return status === 'PENDING' || status === 'PROCESSING';
  }

  get paymentHasProblem(): boolean {
    return this.claim?.payment?.status === 'FAILED';
  }

  paymentFailureMessage(): string {
    const transactions = this.claim?.payment?.transactions ?? [];
    const failed = [...transactions].reverse().find((entry) => entry.status === 'FAILED');
    return failed?.failureReason ?? 'Payment processing failed. You can retry the transfer.';
  }

  patientName(): string {
    if (!this.claim) return '—';
    const { firstName, lastName } = this.claim.patient;
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || '—';
  }

  rejectionReasons(): ClaimDetail['decisions'] {
    return (this.claim?.decisions ?? []).filter((decision) => decision.decision === 'REJECTED');
  }

  infoRequests(): ClaimDetail['decisions'] {
    return (this.claim?.decisions ?? []).filter((decision) => decision.decision === 'NEED_INFO');
  }

  attachments(): ClaimAttachment[] {
    return this.claim?.attachments ?? [];
  }

  formatEnum(value: string): string {
    return value.replaceAll('_', ' ');
  }

  claimTypeLabel(): string {
    if (this.claim?.claimType === ClaimType.MEMBER_REIMBURSEMENT) {
      return 'Member reimbursement';
    }
    if (this.claim?.paymentResponsibility === PaymentResponsibility.MEMBER_PAID_CASH) {
      return 'Provider claim — member paid';
    }
    return 'Provider claim';
  }

  setTab(tab: 'adjudication' | 'treatment' | 'coverage' | 'history' | 'member' | 'fraud'): void {
    this.activeTab = tab;
  }

  fraudScoreClass(): string {
    const evaluation = this.claim?.fraudEvaluation;
    const score = evaluation?.overallScore ?? this.claim?.fraudScore;
    const result = evaluation?.overallResult ?? this.claim?.fraudResult;
    if (score == null) return 'fraud-unknown';
    if (score > 50 || result === 'HIGH_RISK') return 'fraud-high';
    if (score > 25 || result === 'MEDIUM_RISK') return 'fraud-medium';
    return 'fraud-low';
  }

  fraudScoreLabel(): string {
    const evaluation = this.claim?.fraudEvaluation;
    const score = evaluation?.overallScore ?? this.claim?.fraudScore;
    if (score == null) return 'Not evaluated';
    const result = (evaluation?.overallResult ?? this.claim?.fraudResult)?.replaceAll('_', ' ');
    return result ? `${score} (${result})` : `${score}`;
  }

  triggeredRules(): ClaimFraudRuleRun[] {
    return (this.claim?.fraudEvaluation?.rules ?? []).filter((rule) => rule.triggered);
  }

  ruleDetailSummary(rule: ClaimFraudRuleRun): string {
    const details = rule.details ?? {};
    const duplicateClaim =
      typeof details['duplicateClaimNumber'] === 'string'
        ? details['duplicateClaimNumber']
        : typeof details['duplicate_of'] === 'string'
          ? details['duplicate_of']
          : null;
    if (duplicateClaim) {
      return `Duplicate of claim ${duplicateClaim}`;
    }
    if (typeof details['remaining_pct'] === 'number') {
      return `Remaining coverage: ${(details['remaining_pct'] * 100).toFixed(1)}%`;
    }
    if (typeof details['message'] === 'string') {
      return details['message'];
    }
    return '—';
  }

  memberRoleLabel(): string {
    const relationship = this.claim?.reviewSummary.relationshipType?.toUpperCase() ?? '';
    if (relationship === 'PRIMARY') return 'Primary (Policy Holder)';
    if (!relationship) return '—';
    const friendly = relationship.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    return `Dependent (${friendly})`;
  }

  coverageLimitModelLabel(): string {
    return this.claim?.reviewSummary.coverageLimitModel === 'POLICY_WALLET'
      ? 'Policy wallet (shared limit)'
      : 'Per benefit';
  }

  employerAddress(): string {
    if (!this.claim?.employer) return '—';
    const parts = [this.claim.employer.streetAddress, this.claim.employer.city, this.claim.employer.state].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  parseAmount(value?: string | number | null): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  showRejectForm(): void {
    this.activeAction = this.activeAction === 'reject' ? null : 'reject';
    this.requestInfoForm.reset();
  }

  showRequestInfoForm(): void {
    this.activeAction = this.activeAction === 'request-info' ? null : 'request-info';
    this.rejectForm.reset();
  }

  showApproveConfirm(): void {
    if (!this.claim || this.actionLoading) return;
    this.confirmApprove = true;
  }

  cancelApprove(): void {
    this.confirmApprove = false;
  }

  confirmApproveClaim(): void {
    if (!this.claim || this.actionLoading) return;
    this.confirmApprove = false;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.approveClaim(this.claim.id, {}).subscribe({
      next: () => {
        this.actionLoading = false;
        this.successMessage = 'Claim approved. Payment processing has started.';
        this.activeAction = null;
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to approve claim.';
      },
    });
  }

  approve(): void {
    this.showApproveConfirm();
  }

  reject(): void {
    if (!this.claim || this.rejectForm.invalid || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.rejectClaim(this.claim.id, this.actionPayload(this.rejectForm.getRawValue())).subscribe({
      next: (updated) => {
        this.actionLoading = false;
        this.successMessage = 'Claim rejected.';
        this.activeAction = null;
        this.rejectForm.reset({ reason: '', comments: '' });
        this.applyActionResult(updated.status);
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to reject claim.';
      },
    });
  }

  requestInfo(): void {
    if (!this.claim || this.requestInfoForm.invalid || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.requestClaimInfo(this.claim.id, this.actionPayload(this.requestInfoForm.getRawValue())).subscribe({
      next: (updated) => {
        this.actionLoading = false;
        this.successMessage = 'Information request sent to provider.';
        this.activeAction = null;
        this.requestInfoForm.reset({ reason: '', comments: '' });
        this.applyActionResult(updated.status);
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to request information.';
      },
    });
  }

  retryPayment(): void {
    if (!this.claim?.payment || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.processPayment(this.claim.payment.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.successMessage = 'Payment retry started.';
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to retry payment.';
      },
    });
  }

  processPayment(): void {
    this.retryPayment();
  }

  private actionPayload(value: { reason?: string | null; comments?: string | null }): {
    reason: string;
    comments?: string;
  } {
    const reason = value.reason?.trim() ?? '';
    const comments = value.comments?.trim();
    return comments ? { reason, comments } : { reason };
  }

  private applyActionResult(status?: string): void {
    if (!this.claim || !status) return;
    this.claim = {
      ...this.claim,
      status: status as ClaimStatus,
      reviewSummary: {
        ...this.claim.reviewSummary,
        status,
      },
    };
  }

  private loadClaim(claimId: string): void {
    this.loading = !this.claim;
    this.api.getClaim(claimId).subscribe({
      next: (claim) => {
        this.claim = claim;
        this.loading = false;
        this.syncPaymentPolling(claimId);
      },
      error: (err) => {
        this.loading = false;
        this.stopPaymentPolling();
        if (!this.claim) {
          this.errorMessage = 'This claim could not be found or you do not have access.';
          return;
        }
        this.errorMessage = err.userMessage ?? 'The decision was saved, but claim details could not be refreshed.';
      },
    });
  }

  private syncPaymentPolling(claimId: string): void {
    const status = this.claim?.payment?.status;
    const shouldPoll =
      this.claim?.status === ClaimStatus.APPROVED &&
      (status === 'PENDING' || status === 'PROCESSING');

    if (shouldPoll) {
      this.startPaymentPolling(claimId);
      return;
    }

    this.stopPaymentPolling();
  }

  private startPaymentPolling(claimId: string): void {
    if (this.paymentPollTimer) {
      return;
    }

    this.paymentPollTimer = setInterval(() => {
      this.api.getClaim(claimId).subscribe({
        next: (claim) => {
          this.claim = claim;
          this.syncPaymentPolling(claimId);
        },
      });
    }, 2_000);
  }

  private stopPaymentPolling(): void {
    if (!this.paymentPollTimer) {
      return;
    }

    clearInterval(this.paymentPollTimer);
    this.paymentPollTimer = null;
  }
}
