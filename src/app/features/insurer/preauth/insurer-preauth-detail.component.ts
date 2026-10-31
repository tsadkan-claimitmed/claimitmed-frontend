import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { PreauthReviewDetail, PreauthStatusHistoryEntry, TreatmentDocument, TreatmentItem } from '../../../core/models';
import { DocumentType, PreauthLineDecision, PreauthStatus, TreatmentCaseStatus } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
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
  ],
  templateUrl: './insurer-preauth-detail.component.html',
  styleUrl: './insurer-preauth-detail.component.scss',
})
export class InsurerPreauthDetailComponent implements OnInit {
  private readonly api = inject(InsurerApiService);
  private readonly config = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);

  detail: PreauthReviewDetail | null = null;
  loading = true;
  acting = false;
  errorMessage = '';
  successMessage = '';
  showMoreDetails = false;
  extraPanel: 'coverage' | 'history' | 'member' | 'timeline' = 'coverage';
  readonly claimsBasePath = this.route.snapshot.data['claimsBasePath'] ?? '/portal/insurer/claims';
  showDenyDialog = false;
  showApproveDialog = false;
  showNeedInfoDialog = false;
  denyReason = '';
  needInfoReason = '';
  approvalScope: 'FULL' | 'SPECIFIC' = 'FULL';
  approvedAmountInput = 0;
  readonly PreauthStatus = PreauthStatus;
  readonly PreauthLineDecision = PreauthLineDecision;
  formatEnum = formatEnumLabel;

  formatDateOnly(value?: string | null): string {
    if (!value) return '—';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Date(year, month - 1, day).toLocaleDateString();
  }
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

  isNeedInfo(): boolean {
    return this.detail?.decisionSummary.preauthStatus === PreauthStatus.NEED_INFO;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showNeedInfoDialog) {
      this.cancelNeedInfo();
      return;
    }
    if (this.showApproveDialog) {
      this.cancelApprove();
      return;
    }
    if (this.showDenyDialog) {
      this.cancelDeny();
    }
  }

  parseAmount(value?: string | number | null): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }

  lineAmount(value?: string | number | null): number {
    return this.parseAmount(value);
  }

  setPanel(panel: 'coverage' | 'history' | 'member' | 'timeline'): void {
    this.extraPanel = panel;
  }

  preauthStatusHistory(): PreauthStatusHistoryEntry[] {
    return this.detail?.treatment.preauthStatusHistory ?? [];
  }

  preauthTimelineTitle(entry: PreauthStatusHistoryEntry): string {
    if (entry.action === 'CANCELED') return 'Canceled';
    if (entry.action === 'CHECKED_IN') return 'Check-in started';
    return this.preauthTimelineStatus(entry.toStatus);
  }

  preauthTimelineFrom(entry: PreauthStatusHistoryEntry): string | null {
    if (!entry.fromStatus || entry.fromStatus === entry.toStatus) return null;
    return this.preauthTimelineStatus(entry.fromStatus);
  }

  preauthTimelineStatus(status: string): string {
    if (status === PreauthStatus.PENDING) return 'Under Review';
    if (status === PreauthStatus.NEED_INFO) return 'Need Info';
    if (status === PreauthStatus.PARTIALLY_APPROVED) return 'Partially approved';
    return this.formatEnum(status);
  }

  patientName(): string {
    if (!this.detail) return '';
    const { firstName, lastName, memberNumber } = this.detail.treatment.patient;
    return [firstName, lastName].filter(Boolean).join(' ').trim() || this.detail.decisionSummary.memberName || memberNumber;
  }

  patientInitials(): string {
    const parts = this.patientName().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'P';
  }

  statusLabel(): string {
    const status = this.detail?.decisionSummary.preauthStatus;
    if (this.detail?.treatment.status === TreatmentCaseStatus.COMPLETED) return 'Completed';
    if (status === PreauthStatus.PENDING) return 'Under Review';
    if (status === PreauthStatus.NEED_INFO) return 'Need Info';
    if (status === PreauthStatus.PARTIALLY_APPROVED) return 'Partially approved';
    return this.formatEnum(status ?? '');
  }

  heroTone(): 'ok' | 'warn' | 'danger' {
    const status = this.detail?.decisionSummary.preauthStatus;
    if (this.detail?.treatment.status === TreatmentCaseStatus.COMPLETED) return 'ok';
    if (status === PreauthStatus.DENIED) return 'danger';
    if (status === PreauthStatus.PENDING || status === PreauthStatus.NEED_INFO || status === PreauthStatus.PARTIALLY_APPROVED) return 'warn';
    return 'ok';
  }

  requestedAt(): string | null {
    return this.detail?.treatment.dates.preauthRequestedAt
      ?? this.detail?.treatment.preauthRequestedAt
      ?? this.detail?.treatment.dates.createdAt
      ?? null;
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

  linkedCaseLabel(record: { id: string; treatmentReference?: string | null }): string {
    return record.treatmentReference || record.id.slice(0, 8).toUpperCase();
  }

  openNeedInfoDialog(): void {
    this.needInfoReason = '';
    this.showNeedInfoDialog = true;
  }

  cancelNeedInfo(): void {
    this.showNeedInfoDialog = false;
    this.needInfoReason = '';
  }

  confirmNeedInfo(): void {
    if (!this.detail || !this.isPending() || this.needInfoReason.trim().length < 10) return;
    this.showNeedInfoDialog = false;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.requestPreauthInfo(this.detail.treatment.id, this.needInfoReason.trim()).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = 'The provider was asked for more information.';
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to request more information.';
      },
    });
  }

  hasInfoExchange(): boolean {
    return Boolean(this.detail?.treatment.preauthInfoReason || this.detail?.treatment.preauthInfoResponse);
  }

  infoDocuments(): TreatmentDocument[] {
    const requestedAt = this.detail?.treatment.preauthInfoRequestedAt;
    const start = requestedAt ? new Date(requestedAt).getTime() - 1000 : 0;
    return (this.detail?.treatment.documents ?? []).filter((document) => {
      if (document.documentType === DocumentType.RECEIPT) return false;
      if (!start) return true;
      return new Date(document.uploadedAt).getTime() >= start;
    });
  }

  documentUrl(document: TreatmentDocument): string | null {
    return this.config.resolveAssetUrl(document.url);
  }

  openDocument(document: TreatmentDocument): void {
    const url = this.documentUrl(document);
    if (url) window.open(url, '_blank', 'noopener');
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
