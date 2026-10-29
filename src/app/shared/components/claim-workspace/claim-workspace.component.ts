import { Component, EventEmitter, Input, Output, ViewChild, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClaimAttachment, ClaimDetail, ClaimFraudRuleRun, ClaimItem } from '../../../core/models';
import { ClaimStatus, ClaimType, DocumentType, PaymentResponsibility, PreauthLineDecision } from '../../../core/models/enums';
import { ClaimAttachmentsComponent } from '../claim-attachments/claim-attachments.component';

@Component({
  selector: 'app-claim-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    ClaimAttachmentsComponent,
  ],
  templateUrl: './claim-workspace.component.html',
  styleUrl: './claim-workspace.component.scss',
})
export class ClaimWorkspaceComponent {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) claim!: ClaimDetail;
  @Input() backLink = '/portal/claims';
  @Input() backLabel = '← Back to Claims';
  @Input() visitLink: string | null = null;
  @Input() canAdjudicate = false;
  @Input() canResubmit = false;
  @Input() canRetryPayment = false;
  @Input() showReviewerExtras = false;
  @Input() showFraud = false;
  @Input() actionLoading = false;
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() selectedFiles: File[] = [];
  @Input() resubmitComments = '';
  @Input() acceptFiles =
    'image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

  @Output() approve = new EventEmitter<void>();
  @Output() retryPayment = new EventEmitter<void>();
  @Output() rejectClaim = new EventEmitter<{ reason: string; comments?: string }>();
  @Output() requestInfo = new EventEmitter<{ reason: string; comments?: string }>();
  @Output() resubmit = new EventEmitter<void>();
  @Output() filesSelected = new EventEmitter<Event>();
  @Output() removeSelectedFile = new EventEmitter<number>();
  @Output() resubmitCommentsChange = new EventEmitter<string>();

  @ViewChild(ClaimAttachmentsComponent) attachmentsView?: ClaimAttachmentsComponent;

  readonly ClaimStatus = ClaimStatus;
  readonly PreauthLineDecision = PreauthLineDecision;
  showMoreDetails = false;
  extraPanel: 'fraud' | 'history' | 'timeline' = 'fraud';
  activeAction: 'reject' | 'request-info' | null = null;
  confirmApprove = false;

  rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(2)]],
  });

  requestInfoForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(2)]],
  });

  patientName(): string {
    const { firstName, lastName } = this.claim.patient;
    return [firstName, lastName].filter(Boolean).join(' ').trim() || this.claim.patient.memberNumber;
  }

  patientInitials(): string {
    const parts = this.patientName().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'P';
  }

  amount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  formatEnum(value?: string | null): string {
    return (value ?? '').replaceAll('_', ' ') || '—';
  }

  statusLabel(): string {
    if (
      this.claim.status === ClaimStatus.DRAFT ||
      this.claim.status === ClaimStatus.SUBMITTED ||
      this.claim.status === ClaimStatus.UNDER_REVIEW
    ) {
      return 'Under Review';
    }
    if (this.claim.status === ClaimStatus.REIMBURSEMENT_REVIEW) {
      return 'Reimbursement';
    }
    if (this.claim.status === ClaimStatus.NEED_INFO) {
      return 'Need Info';
    }
    return this.formatEnum(this.claim.status);
  }

  heroTone(): 'ok' | 'warn' | 'danger' {
    if (this.claim.status === ClaimStatus.REJECTED) return 'danger';
    if (this.claim.status === ClaimStatus.NEED_INFO) return 'warn';
    return 'ok';
  }

  claimTypeLabel(): string {
    if (this.claim.claimType === ClaimType.MEMBER_REIMBURSEMENT || this.payee() === 'MEMBER') {
      return 'MEMBER';
    }
    return 'PROVIDER';
  }

  visitTotal(): number {
    return this.amount(this.claim.settlement?.visitTotal ?? this.claim.totalTreatmentAmount ?? this.claim.requestedAmount);
  }

  patientPaid(): number {
    return this.amount(this.claim.settlement?.patientPaid ?? this.claim.memberOutOfPocketAmount);
  }

  claimedAmount(): number {
    return this.amount(this.claim.settlement?.claimed ?? this.claim.requestedAmount);
  }

  payee(): 'PROVIDER' | 'MEMBER' {
    if (this.claim.settlement?.payee) return this.claim.settlement.payee;
    if (this.claim.paymentResponsibility === PaymentResponsibility.MEMBER_PAID_CASH) return 'MEMBER';
    return 'PROVIDER';
  }

  payeeLabel(): string {
    return this.payee() === 'MEMBER' ? 'MEMBER' : 'PROVIDER';
  }

  hasPreauth(item: ClaimItem): boolean {
    const decision = item.preauthDecision;
    return item.requiresPreauth === true || (!!decision && decision !== PreauthLineDecision.NOT_REQUIRED);
  }

  preauthLabel(item: ClaimItem): string {
    const decision = item.preauthDecision ?? PreauthLineDecision.NOT_REQUIRED;
    if (decision === PreauthLineDecision.APPROVED) {
      const amount = this.amount(item.preauthApprovedAmount);
      return amount > 0.005 ? `Approved ${this.preauthMoney(amount)}` : 'Approved';
    }
    if (decision === PreauthLineDecision.DENIED) {
      return item.preauthDenialReason ? `Denied — ${item.preauthDenialReason}` : 'Denied';
    }
    if (decision === PreauthLineDecision.PENDING) return 'Pending';
    return 'Preauth';
  }

  preauthTone(item: ClaimItem): 'ok' | 'danger' | 'warn' {
    if (item.preauthDecision === PreauthLineDecision.APPROVED) return 'ok';
    if (item.preauthDecision === PreauthLineDecision.DENIED) return 'danger';
    return 'warn';
  }

  private preauthMoney(amount: number): string {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 2 }).format(amount);
  }

  openTaxInvoice(): void {
    const invoice = this.taxInvoice();
    if (invoice) {
      this.attachmentsView?.viewAttachment(invoice);
    }
  }

  providerName(): string {
    return this.claim.provider?.name || this.claim.provider?.providerCode || this.claim.reviewSummary.providerName;
  }

  attachments(): ClaimAttachment[] {
    return this.claim.attachments ?? [];
  }

  taxInvoice(): ClaimAttachment | null {
    return (
      this.attachments().find(
        (attachment) =>
          attachment.documentType === DocumentType.RECEIPT || attachment.mimeType === 'text/html',
      ) ?? null
    );
  }

  visibleHistory() {
    return (this.claim.workflowHistory ?? []).filter(
      (entry) => entry.toStatus !== ClaimStatus.DRAFT && entry.toStatus !== ClaimStatus.SUBMITTED,
    );
  }

  rejectionReasons() {
    return (this.claim.decisions ?? []).filter((decision) => decision.decision === 'REJECTED');
  }

  infoRequests() {
    return (this.claim.decisions ?? []).filter((decision) => decision.decision === 'NEED_INFO');
  }

  paymentInProgress(): boolean {
    const status = this.claim.payment?.status;
    return status === 'PENDING' || status === 'PROCESSING';
  }

  paymentHasProblem(): boolean {
    return this.claim.payment?.status === 'FAILED';
  }

  paymentFailureMessage(): string {
    const transactions = this.claim.payment?.transactions ?? [];
    const failed = [...transactions].reverse().find((entry) => entry.status === 'FAILED');
    return failed?.failureReason ?? 'Payment processing failed. You can retry the transfer.';
  }

  memberRoleLabel(): string {
    const relationship = this.claim.reviewSummary.relationshipType?.toUpperCase() ?? '';
    if (relationship === 'PRIMARY') return 'Primary (Policy Holder)';
    if (!relationship) return '—';
    return `Dependent (${this.formatEnum(relationship)})`;
  }

  coverageLimitModelLabel(): string {
    return this.claim.reviewSummary.coverageLimitModel === 'POLICY_WALLET'
      ? 'Policy wallet (shared limit)'
      : 'Per benefit';
  }

  fraudScoreClass(): string {
    const evaluation = this.claim.fraudEvaluation;
    const score = evaluation?.overallScore ?? this.claim.fraudScore;
    const result = evaluation?.overallResult ?? this.claim.fraudResult;
    if (score == null) return 'fraud-unknown';
    if (score > 50 || result === 'HIGH_RISK') return 'fraud-high';
    if (score > 25 || result === 'MEDIUM_RISK') return 'fraud-medium';
    return 'fraud-low';
  }

  fraudScoreLabel(): string {
    const evaluation = this.claim.fraudEvaluation;
    const score = evaluation?.overallScore ?? this.claim.fraudScore;
    if (score == null) return 'Not evaluated';
    const result = (evaluation?.overallResult ?? this.claim.fraudResult)?.replaceAll('_', ' ');
    return result ? `${score} (${result})` : `${score}`;
  }

  fraudRiskWord(): string {
    const cls = this.fraudScoreClass();
    if (cls === 'fraud-high') return 'HIGH RISK';
    if (cls === 'fraud-medium') return 'MEDIUM RISK';
    if (cls === 'fraud-low') return 'LOW RISK';
    return 'NOT EVALUATED';
  }

  fraudAttentionCopy(): string {
    const triggered = this.triggeredRules().length;
    if (this.fraudScoreClass() === 'fraud-unknown') {
      return 'No fraud evaluation has run yet. Review services before you decide.';
    }
    if (triggered > 0) {
      return `${triggered} rule${triggered === 1 ? '' : 's'} triggered. Read this before you approve.`;
    }
    return 'No rules triggered. Still confirm the score before you approve.';
  }

  triggeredRules(): ClaimFraudRuleRun[] {
    return (this.claim.fraudEvaluation?.rules ?? []).filter((rule) => rule.triggered);
  }

  ruleDetailSummary(rule: ClaimFraudRuleRun): string {
    const details = rule.details ?? {};
    const related = this.relatedClaimFromRule(rule);
    if (related) return `Duplicate of claim ${related.claimNumber}`;
    if (typeof details['remaining_pct'] === 'number') {
      return `Remaining coverage: ${(details['remaining_pct'] * 100).toFixed(1)}%`;
    }
    if (typeof details['message'] === 'string') return details['message'];
    return '—';
  }

  relatedClaimFromRule(rule: ClaimFraudRuleRun): { id: string | null; claimNumber: string } | null {
    const details = rule.details ?? {};
    const idValue = details['duplicateClaimId'] ?? details['duplicate_claim_id'] ?? details['relatedClaimId'];
    const id = typeof idValue === 'string' && idValue.trim() ? idValue.trim() : null;
    const numberValue =
      details['duplicateClaimNumber'] ?? details['duplicate_of'] ?? details['relatedClaimNumber'];
    const fromDetails = typeof numberValue === 'string' && numberValue.trim() ? numberValue.trim() : null;
    const fromMessage =
      typeof details['message'] === 'string' ? details['message'].match(/CLM-[A-Z0-9-]+/i)?.[0] ?? null : null;
    const claimNumber = fromDetails || fromMessage;
    if (!claimNumber && !id) return null;
    return { id, claimNumber: claimNumber || 'this claim' };
  }

  relatedClaimLink(rule: ClaimFraudRuleRun): string[] | null {
    const related = this.relatedClaimFromRule(rule);
    if (!related?.id) return null;
    return [this.backLink, related.id];
  }

  ruleDetailParts(rule: ClaimFraudRuleRun): Array<{ text: string; link?: string[] }> {
    const summary = this.ruleDetailSummary(rule);
    const related = this.relatedClaimFromRule(rule);
    const link = this.relatedClaimLink(rule);
    if (!related || !summary.includes(related.claimNumber)) {
      return [{ text: summary }];
    }
    const [before, ...rest] = summary.split(related.claimNumber);
    const after = rest.join(related.claimNumber);
    return [
      { text: before },
      { text: related.claimNumber, link: link ?? undefined },
      { text: after },
    ];
  }

  setPanel(panel: 'fraud' | 'history' | 'timeline'): void {
    this.extraPanel = panel;
    if (panel === 'fraud') {
      setTimeout(() => document.getElementById('claim-fraud-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  showRejectForm(): void {
    this.activeAction = this.activeAction === 'reject' ? null : 'reject';
    this.requestInfoForm.reset();
    this.rejectForm.reset({ reason: '' });
  }

  showRequestInfoForm(): void {
    this.activeAction = this.activeAction === 'request-info' ? null : 'request-info';
    this.rejectForm.reset();
    this.requestInfoForm.reset({ reason: '' });
  }

  openApproveConfirm(): void {
    this.confirmApprove = true;
  }

  cancelApprove(): void {
    this.confirmApprove = false;
  }

  confirmApproveClaim(): void {
    this.confirmApprove = false;
    this.approve.emit();
  }

  submitReject(): void {
    if (this.rejectForm.invalid) return;
    const reason = this.rejectForm.getRawValue().reason?.trim() ?? '';
    this.activeAction = null;
    this.rejectClaim.emit({ reason });
  }

  submitRequestInfo(): void {
    if (this.requestInfoForm.invalid) return;
    const reason = this.requestInfoForm.getRawValue().reason?.trim() ?? '';
    this.activeAction = null;
    this.requestInfo.emit({ reason });
  }

  onResubmitComments(value: string): void {
    this.resubmitCommentsChange.emit(value);
  }
}
