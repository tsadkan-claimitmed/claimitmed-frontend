import { Component, ElementRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { ConfigService } from '../../../core/services/config.service';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import {
  CostEstimation,
  CoverageLineStatus,
  TreatmentDetail,
  TreatmentDocument,
  TreatmentItem,
} from '../../../core/models';
import {
  ClaimAmountScope,
  DocumentType,
  PaymentResponsibility,
  PreauthLineDecision,
  PreauthStatus,
  TreatmentCasePurpose,
  TreatmentCaseStatus,
  TreatmentListTab,
} from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ServiceSearchSelectComponent } from '../../../shared/components/service-search-select/service-search-select.component';
import { PhotoLightboxComponent } from '../../../shared/components/photo-lightbox/photo-lightbox.component';

@Component({
  selector: 'app-provider-treatment-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ServiceSearchSelectComponent,
    PhotoLightboxComponent,
  ],
  templateUrl: './provider-treatment-detail.component.html',
  styleUrl: './provider-treatment-detail.component.scss',
})
export class ProviderTreatmentDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);
  private readonly config = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  treatment: TreatmentDetail | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  readonly PreauthStatus = PreauthStatus;
  readonly PreauthLineDecision = PreauthLineDecision;
  readonly TreatmentCasePurpose = TreatmentCasePurpose;
  readonly TreatmentCaseStatus = TreatmentCaseStatus;
  readonly TreatmentListTab = TreatmentListTab;
  readonly ClaimAmountScope = ClaimAmountScope;
  readonly PaymentResponsibility = PaymentResponsibility;

  visitForm = this.fb.group({
    treatingPhysician: [''],
    treatmentReference: [''],
  });

  itemForm = this.fb.group({
    medicalServiceId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0.01)]],
  });

  feeLoading = false;
  selectedServiceRequiresPreauth = false;
  pendingRemoveItem: TreatmentItem | null = null;
  pendingRemoveDocument: TreatmentDocument | null = null;
  showMoreDetails = false;
  showEstimateBreakdown = false;
  showCalcSteps = false;
  showCompleteVisit = false;
  showSkipClaimConfirm = false;
  showSendClaimConfirm = false;
  showCancelVisit = false;
  cancelReason = '';
  cancelAcknowledged = false;
  @ViewChild('varianceReason') varianceReason?: ElementRef<HTMLTextAreaElement>;
  patientPayChoice: 'none' | 'oop' | 'full' | 'custom' = 'none';
  patientPaidCustom = 0;
  claimAmountScope: ClaimAmountScope = ClaimAmountScope.INSURANCE_ONLY;
  claimVarianceReason = '';
  viewingPhotoUrl: string | null = null;
  viewingPhotoTitle = '';
  viewingReceiptUrl: SafeResourceUrl | null = null;
  viewingReceiptHref: string | null = null;
  qrSafeUrl: SafeUrl | null = null;
  estimation: CostEstimation | null = null;
  estimationLoading = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Check-in ID is missing.';
      this.loading = false;
      return;
    }
    this.loadTreatment(id);
  }

  get isOpen(): boolean {
    return this.treatment?.status === TreatmentCaseStatus.OPEN;
  }

  patientName(): string {
    if (!this.treatment) return '—';
    const name = [this.treatment.patient.firstName, this.treatment.patient.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || '—';
  }

  patientInitials(): string {
    if (!this.treatment) return '?';
    const first = (this.treatment.patient.firstName ?? '').trim().slice(0, 1);
    const last = (this.treatment.patient.lastName ?? '').trim().slice(0, 1);
    return (first + last || this.patientName().slice(0, 1) || '?').toUpperCase();
  }

  patientPhotoUrl(): string | null {
    return this.config.resolveAssetUrl(this.treatment?.patient.photoUrl);
  }

  photoDownloadName(): string {
    if (this.viewingPhotoTitle) return this.viewingPhotoTitle;
    return `${this.treatment?.patient.memberNumber ?? 'member'}-photo.jpg`;
  }

  openPhotoViewer(): void {
    const url = this.patientPhotoUrl();
    if (!url) return;
    this.viewingPhotoUrl = url;
    this.viewingPhotoTitle = this.patientName();
  }

  closePhotoViewer(): void {
    this.viewingPhotoUrl = null;
    this.viewingPhotoTitle = '';
  }

  visitReceipts(): TreatmentDocument[] {
    return (this.treatment?.documents ?? []).filter(
      (document) => document.documentType === DocumentType.RECEIPT,
    );
  }

  visitReceipt(): TreatmentDocument | null {
    const receipts = this.visitReceipts();
    return receipts.find((document) => (document.originalFilename ?? '').startsWith('tax-invoice-v6-'))
      ?? receipts.find((document) => (document.originalFilename ?? '').startsWith('tax-invoice-v5-'))
      ?? receipts.find((document) => (document.originalFilename ?? '').startsWith('tax-invoice-v4-'))
      ?? receipts[receipts.length - 1]
      ?? null;
  }

  fiscalInvoice() {
    return this.treatment?.fiscalInvoice ?? null;
  }

  private refreshQrSafeUrl(): void {
    const invoice = this.treatment?.fiscalInvoice;
    const dataUrl = invoice?.qrDataUrl;
    if (dataUrl) {
      this.qrSafeUrl = this.sanitizer.bypassSecurityTrustUrl(dataUrl);
      return;
    }
    const qrUrl = invoice?.qrUrl;
    if (!qrUrl) {
      this.qrSafeUrl = null;
      return;
    }
    const resolved = /^https?:/i.test(qrUrl)
      ? qrUrl
      : `${this.config.apiUrl.replace(/\/api\/v\d+$/, '')}${qrUrl.startsWith('/') ? qrUrl : `/${qrUrl}`}`;
    this.qrSafeUrl = this.sanitizer.bypassSecurityTrustUrl(resolved);
  }

  supportingDocuments(): TreatmentDocument[] {
    return (this.treatment?.documents ?? []).filter(
      (document) => document.documentType !== DocumentType.RECEIPT,
    );
  }

  openReceipt(document?: TreatmentDocument): void {
    const receipt = document ?? this.visitReceipt();
    const url = (receipt ? this.documentUrl(receipt) : null) || this.fiscalInvoice()?.verifyUrl || null;
    if (!url) return;
    this.viewingReceiptHref = url;
    this.viewingReceiptUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closeReceipt(): void {
    this.viewingReceiptUrl = null;
    this.viewingReceiptHref = null;
  }

  printReceipt(): void {
    if (this.viewingReceiptHref) {
      window.open(this.viewingReceiptHref, '_blank', 'noopener');
      return;
    }
    const frame = document.querySelector('.receipt-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  }

  openAttachment(document: TreatmentDocument): void {
    const url = this.documentUrl(document);
    if (!url) return;
    if (document.documentType === DocumentType.RECEIPT) {
      this.openReceipt(document);
      return;
    }
    if (document.isImage) {
      this.viewingPhotoUrl = url;
      this.viewingPhotoTitle = document.originalFilename || 'Attachment';
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  promptRemoveDocument(document: TreatmentDocument): void {
    this.pendingRemoveDocument = document;
  }

  cancelRemoveDocument(): void {
    this.pendingRemoveDocument = null;
  }

  confirmRemoveDocument(): void {
    const document = this.pendingRemoveDocument;
    if (!this.treatment || !document || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.pendingRemoveDocument = null;
    this.api.removeTreatmentDocument(this.treatment.id, document.id).subscribe({
      next: () => {
        this.successMessage = 'Attachment removed.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to remove attachment.';
        this.saving = false;
      },
    });
  }

  checkedInAt(): string | null {
    return this.treatment?.dates.treatmentDate || this.treatment?.dates.createdAt || null;
  }

  requestedAt(): string | null {
    return this.treatment?.dates.preauthRequestedAt
      || this.treatment?.preauthRequestedAt
      || null;
  }

  contextDate(): string | null {
    return this.isPreauthRequest() ? this.requestedAt() : this.checkedInAt();
  }

  isPreauthRequest(): boolean {
    return this.treatment?.purpose === TreatmentCasePurpose.PREAUTH;
  }

  isCompleted(): boolean {
    return this.treatment?.status === TreatmentCaseStatus.COMPLETED;
  }

  billableItems() {
    return (this.treatment?.items ?? []).filter(
      (item) => item.preauthDecision !== PreauthLineDecision.DENIED,
    );
  }

  settlementTotal(): number {
    const invoiceTotal = this.lineAmount(this.fiscalInvoice()?.consideration ?? this.fiscalInvoice()?.grandTotal);
    if (invoiceTotal > 0.005) return invoiceTotal;
    return this.billableItems().reduce((sum, item) => sum + this.lineAmount(item.totalPrice), 0);
  }

  settlementPatientPaid(): number {
    const raw = this.fiscalInvoice()?.patientPaidAmount;
    if (raw != null && raw !== '') return this.lineAmount(raw);
    const recordedClaim = this.lineAmount(this.fiscalInvoice()?.claimedFromInsurer);
    if (recordedClaim > 0.005) {
      return this.roundMoney(Math.max(0, this.settlementTotal() - recordedClaim));
    }
    return 0;
  }

  settlementClaimed(): number {
    if (this.fiscalInvoice()?.skipClaim) return 0;
    const total = this.settlementTotal();
    const paid = this.settlementPatientPaid();
    const remaining = this.roundMoney(Math.max(0, total - paid));
    const fromInvoice = this.lineAmount(this.fiscalInvoice()?.claimedFromInsurer);
    const fromClaim = this.lineAmount(this.treatment?.relatedClaim?.requestedAmount);
    const recorded = fromInvoice > 0.005 ? fromInvoice : fromClaim;
    if (paid > 0.005 && recorded > remaining + 0.005) return remaining;
    if (recorded > 0.005) return recorded;
    return remaining;
  }

  visitStatusLabel(): string {
    if (this.isPreauthRequest() && this.treatment?.status === TreatmentCaseStatus.OPEN) {
      if (this.isPreauthDraft()) return 'Draft';
      if (this.treatment.preauthStatus === PreauthStatus.PENDING) return 'Under Review';
      if (this.treatment.preauthStatus === PreauthStatus.PARTIALLY_APPROVED) return 'Approved';
      if (this.treatment.preauthStatus === PreauthStatus.APPROVED) return 'Approved';
      if (this.treatment.preauthStatus === PreauthStatus.DENIED) return 'Denied';
      return this.formatEnum(this.treatment.preauthStatus);
    }
    if (this.treatment?.status === TreatmentCaseStatus.OPEN) return 'In progress';
    if (this.treatment?.status === TreatmentCaseStatus.COMPLETED) return 'Completed';
    if (this.treatment?.status === TreatmentCaseStatus.CANCELED) {
      return this.isPreauthRequest() ? 'Cancelled' : 'Canceled';
    }
    return this.formatEnum(this.treatment?.status);
  }

  attentionKind(): 'canceled' | 'denied' | 'pending' | 'approved' | 'partial' | 'inactive' | null {
    if (this.treatment?.status === TreatmentCaseStatus.CANCELED) return 'canceled';
    if (this.treatment?.preauthStatus === PreauthStatus.DENIED) return 'denied';
    if (this.treatment?.preauthStatus === PreauthStatus.PENDING) return 'pending';
    if (this.treatment?.preauthStatus === PreauthStatus.PARTIALLY_APPROVED) return 'partial';
    if (this.treatment?.preauthStatus === PreauthStatus.APPROVED) return 'approved';
    const status = this.treatment?.patient.status;
    if (status && status !== 'ACTIVE') return 'inactive';
    return null;
  }

  canStartVisit(): boolean {
    return this.isOpen
      && this.isPreauthRequest()
      && this.hasTreatingPhysician()
      && (
        this.treatment?.preauthStatus === PreauthStatus.APPROVED
        || this.treatment?.preauthStatus === PreauthStatus.PARTIALLY_APPROVED
      );
  }

  isPreauthDraft(): boolean {
    return this.isPreauthRequest()
      && this.isOpen
      && (
        this.treatment?.preauthStatus === PreauthStatus.DRAFT
        || this.treatment?.preauthStatus === PreauthStatus.NOT_REQUIRED
      );
  }

  canRequestPreauth(): boolean {
    return this.isPreauthDraft()
      && this.hasTreatingPhysician()
      && Boolean(this.treatment?.items?.length);
  }

  canAddServices(): boolean {
    if (!this.isOpen) return false;
    if (this.isPreauthRequest()) return this.isPreauthDraft();
    return true;
  }

  canRemoveServices(): boolean {
    return this.canAddServices();
  }

  hasTreatingPhysician(): boolean {
    const fromForm = this.visitForm.getRawValue().treatingPhysician?.trim();
    return Boolean(fromForm || this.treatment?.treatingPhysician?.trim());
  }

  requestPreauth(): void {
    if (!this.treatment || !this.canRequestPreauth()) return;
    this.saving = true;
    this.errorMessage = '';
    const treatingPhysician = this.visitForm.getRawValue().treatingPhysician?.trim();
    const submit = () => {
      this.api.requestPreauth(this.treatment!.id).subscribe({
        next: () => {
          this.successMessage = 'Preauthorization sent to the insurer.';
          this.loadTreatment(this.treatment!.id, false);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.userMessage ?? 'Unable to request preauthorization.';
        },
      });
    };
    if (treatingPhysician && treatingPhysician !== (this.treatment.treatingPhysician ?? '')) {
      this.api.updateTreatment(this.treatment.id, { treatingPhysician }).subscribe({
        next: () => submit(),
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.userMessage ?? 'Unable to save the doctor.';
        },
      });
      return;
    }
    submit();
  }

  startVisitFromPreauth(): void {
    if (!this.treatment || !this.canStartVisit()) return;
    this.saving = true;
    this.errorMessage = '';
    const treatingPhysician = this.visitForm.getRawValue().treatingPhysician?.trim();
    const start = () => {
      this.api.startVisitFromPreauth(this.treatment!.id).subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Check-in started. Add any remaining details, then complete the visit.';
          void this.router.navigate(['/portal/provider/treatments', this.treatment!.id]);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.userMessage ?? 'Unable to start this check-in.';
        },
      });
    };
    if (treatingPhysician && treatingPhysician !== (this.treatment.treatingPhysician ?? '')) {
      this.api.updateTreatment(this.treatment.id, { treatingPhysician }).subscribe({
        next: () => start(),
        error: (err) => {
          this.saving = false;
          this.errorMessage = err.userMessage ?? 'Unable to save the doctor.';
        },
      });
      return;
    }
    start();
  }

  lineDecisionLabel(item: TreatmentItem): string {
    if (!item.requiresPreauth) return '';
    if (this.isPreauthDraft()) return 'Not sent';
    return (item.preauthDecision ?? PreauthLineDecision.PENDING).replaceAll('_', ' ');
  }

  preauthItemsCount(): number {
    return (this.treatment?.items ?? []).filter((item) => item.requiresPreauth).length;
  }

  preauthApprovedDisplay(): number {
    const stored = this.lineAmount(this.treatment?.preauthApprovedAmount);
    if (stored > 0.005) return stored;
    return (this.treatment?.items ?? []).reduce(
      (sum, item) => sum + this.lineAmount(item.preauthApprovedAmount),
      0,
    );
  }

  canComplete(): boolean {
    return Boolean(this.isOpen && this.treatment?.items?.length)
      && !this.isPreauthRequest()
      && this.treatment?.preauthStatus !== PreauthStatus.PENDING
      && this.treatment?.preauthStatus !== PreauthStatus.DENIED;
  }

  canCancel(): boolean {
    return this.isOpen;
  }

  canEditServices(): boolean {
    return this.canAddServices() && !this.isPreauthRequest();
  }

  get visitTotal(): number {
    if (this.estimation) return this.lineAmount(this.estimation.estimatedTotal);
    return this.lineAmount(this.treatment?.costSummary?.totalTreatmentAmount
      ?? this.treatment?.totalEstimatedAmount);
  }

  get insurancePays(): number {
    if (this.estimation) return this.lineAmount(this.estimation.estimatedInsurerAmount);
    return this.lineAmount(this.treatment?.costSummary?.insuranceAmount);
  }

  hasInsuranceCoverage(): boolean {
    return this.roundMoney(this.insurancePays) > 0.005;
  }

  get patientOwes(): number {
    if (this.estimation) return this.lineAmount(this.estimation.estimatedMemberAmount);
    return this.lineAmount(this.treatment?.costSummary?.memberOutOfPocketAmount);
  }

  get remainingNow(): number {
    return this.lineAmount(this.estimation?.remainingCoverageBefore);
  }

  get remainingAfterVisit(): number {
    return this.lineAmount(this.estimation?.remainingCoverageAfter);
  }

  get hasServices(): boolean {
    return (this.treatment?.items?.length ?? 0) > 0;
  }

  get serviceCount(): number {
    return this.treatment?.items?.length ?? 0;
  }

  get insuranceSharePct(): number {
    if (this.visitTotal <= 0) return 0;
    return Math.round((this.insurancePays / this.visitTotal) * 100);
  }

  get patientSharePct(): number {
    if (this.visitTotal <= 0) return 0;
    return Math.max(0, 100 - this.insuranceSharePct);
  }

  lineSplit(item: TreatmentItem): {
    total: number;
    insurer: number;
    member: number;
    covered: boolean;
    coverageStatus: CoverageLineStatus;
    benefitName: string | null;
    remainingAfter: number;
  } {
    const line = this.estimation?.lines.find((entry) => entry.medicalServiceId === item.medicalServiceId);
    const total = this.lineAmount(item.totalPrice);
    const insurer = this.lineAmount(line?.insurerAmount);
    const member = line ? this.lineAmount(line.memberAmount) : Math.max(0, total);
    const coverageStatus = line?.coverageStatus
      ?? (insurer > 0 ? 'COVERED' : 'NOT_COVERED');
    return {
      total,
      insurer,
      member,
      covered: line?.covered ?? insurer > 0,
      coverageStatus,
      benefitName: line?.benefitName ?? null,
      remainingAfter: this.lineAmount(line?.remainingAfter),
    };
  }

  coverageLabel(status: CoverageLineStatus): string {
    if (status === 'COVERED') return 'Covered';
    if (status === 'PARTIAL') return 'Partially covered';
    if (status === 'LIMIT_REACHED') return 'Limit reached';
    return 'Not covered';
  }

  lineInsurerPct(item: TreatmentItem): number {
    const split = this.lineSplit(item);
    if (split.total <= 0) return 0;
    return Math.min(100, Math.round((split.insurer / split.total) * 100));
  }

  openEstimateBreakdown(): void {
    if (!this.hasServices || !this.treatment) return;
    this.showEstimateBreakdown = true;
    this.showCalcSteps = false;
    if (!this.estimation && !this.estimationLoading) {
      this.refreshEstimation(this.treatment);
    }
  }

  closeEstimateBreakdown(): void {
    this.showEstimateBreakdown = false;
    this.showCalcSteps = false;
  }

  toggleCalcSteps(): void {
    this.showCalcSteps = !this.showCalcSteps;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.viewingPhotoUrl) {
      this.closePhotoViewer();
      return;
    }
    if (this.viewingReceiptUrl) {
      this.closeReceipt();
      return;
    }
    if (this.showCancelVisit) {
      this.closeCancelVisit();
      return;
    }
    if (this.showCompleteVisit) {
      this.closeCompleteVisit();
      return;
    }
    if (this.showEstimateBreakdown) {
      this.closeEstimateBreakdown();
      return;
    }
    if (this.pendingRemoveDocument) {
      this.cancelRemoveDocument();
      return;
    }
    if (this.pendingRemoveItem) {
      this.cancelRemoveItem();
    }
  }

  treatmentsListTab(): TreatmentListTab {
    if (this.treatment?.status === TreatmentCaseStatus.CANCELED) {
      return TreatmentListTab.CANCELED;
    }
    if (this.treatment?.status === TreatmentCaseStatus.COMPLETED) {
      return TreatmentListTab.COMPLETED;
    }
    if (
      this.treatment?.preauthStatus === PreauthStatus.PENDING
      || this.treatment?.preauthStatus === PreauthStatus.DENIED
    ) {
      return TreatmentListTab.REQUIRES_PREAUTH;
    }
    return TreatmentListTab.IN_PROGRESS;
  }

  formatEnum(value?: string | null): string {
    return (value ?? '—').replaceAll('_', ' ');
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  onServiceSelected(medicalServiceId: string): void {
    this.populateAgreedFee(medicalServiceId);
  }

  itemLabel(item: TreatmentItem): string {
    return item.serviceName || item.serviceCode || item.medicalServiceId;
  }

  promptRemoveItem(item: TreatmentItem): void {
    this.pendingRemoveItem = item;
  }

  cancelRemoveItem(): void {
    this.pendingRemoveItem = null;
  }

  confirmRemoveItem(): void {
    const item = this.pendingRemoveItem;
    if (!this.treatment || !item || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.pendingRemoveItem = null;
    this.api.removeTreatmentItem(this.treatment.id, item.id).subscribe({
      next: () => {
        this.successMessage = item.requiresPreauth
          ? 'Service removed. Preauthorization hold lifted for this treatment.'
          : 'Service removed.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to remove service.';
        this.saving = false;
      },
    });
  }

  canAddService(): boolean {
    if (this.saving || this.itemForm.invalid || !this.canAddServices()) return false;
    const { quantity, unitPrice, medicalServiceId } = this.itemForm.getRawValue();
    return Boolean(medicalServiceId)
      && (quantity ?? 0) > 0
      && (unitPrice ?? 0) > 0;
  }

  saveVisitDetails(): void {
    if (!this.treatment || !this.isOpen) return;
    const treatingPhysician = this.visitForm.getRawValue().treatingPhysician?.trim() || '';
    const treatmentReference = this.visitForm.getRawValue().treatmentReference?.trim() || '';
    const nextPhysician = treatingPhysician || undefined;
    const nextReference = this.isPreauthRequest() ? undefined : (treatmentReference || undefined);
    if (
      (this.treatment.treatingPhysician ?? '') === treatingPhysician
      && (this.isPreauthRequest() || (this.treatment.treatmentReference ?? '') === treatmentReference)
    ) {
      return;
    }
    this.api.updateTreatment(this.treatment.id, {
      treatingPhysician: nextPhysician,
      ...(this.isPreauthRequest() ? {} : { treatmentReference: nextReference }),
    }).subscribe({
      next: (updated) => {
        if (!this.treatment) return;
        this.treatment = {
          ...this.treatment,
          treatingPhysician: updated.treatingPhysician,
          treatmentReference: updated.treatmentReference,
        };
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to save visit details.';
      },
    });
  }

  addItem(): void {
    if (!this.treatment || !this.canAddService()) return;
    const { quantity, unitPrice, medicalServiceId } = this.itemForm.getRawValue();
    this.saving = true;
    this.errorMessage = '';
    const treatingPhysician = this.visitForm.getRawValue().treatingPhysician?.trim();
    const addService = () => {
      this.api.addTreatmentItem(this.treatment!.id, {
        medicalServiceId: medicalServiceId!,
        quantity: quantity!,
        unitPrice: unitPrice!,
        totalPrice: quantity! * unitPrice!,
      }).subscribe({
        next: () => {
          this.loadTreatment(this.treatment!.id, false);
          this.itemForm.reset({ quantity: 1, unitPrice: 0 });
          this.selectedServiceRequiresPreauth = false;
        },
        error: (err) => {
          this.errorMessage = err.userMessage ?? 'Failed to add item.';
          this.saving = false;
        },
      });
    };
    if (this.isPreauthRequest() && treatingPhysician && treatingPhysician !== (this.treatment.treatingPhysician ?? '')) {
      this.api.updateTreatment(this.treatment.id, { treatingPhysician }).subscribe({
        next: () => addService(),
        error: (err) => {
          this.errorMessage = err.userMessage ?? 'Unable to save the doctor.';
          this.saving = false;
        },
      });
      return;
    }
    addService();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!this.treatment || files.length === 0) return;
    this.saving = true;
    this.errorMessage = '';
    this.api.uploadTreatmentDocuments(this.treatment.id, files).subscribe({
      next: () => {
        this.successMessage = files.length === 1 ? 'File attached.' : `${files.length} files attached.`;
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to attach files.';
        this.saving = false;
      },
    });
  }

  documentUrl(document: TreatmentDocument): string | null {
    return this.config.resolveAssetUrl(document.url);
  }

  openCompleteVisit(): void {
    if (!this.canComplete()) return;
    this.patientPayChoice = this.patientOwes > 0.005 ? 'oop' : 'none';
    this.patientPaidCustom = this.roundMoney(this.patientOwes);
    this.claimAmountScope = ClaimAmountScope.INSURANCE_ONLY;
    this.claimVarianceReason = '';
    this.showSkipClaimConfirm = false;
    this.showSendClaimConfirm = false;
    this.showCompleteVisit = true;
    this.syncClaimChoices();
  }

  closeCompleteVisit(): void {
    this.showCompleteVisit = false;
    this.showSkipClaimConfirm = false;
    this.showSendClaimConfirm = false;
  }

  setPatientPayChoice(choice: 'none' | 'oop' | 'full' | 'custom'): void {
    this.patientPayChoice = choice;
    if (choice === 'custom') {
      this.onPatientPaidCustomChange(this.patientPaidCustom);
      return;
    }
    this.syncClaimChoices();
    this.maybeFocusVarianceReason();
  }

  setClaimAmountScope(scope: ClaimAmountScope): void {
    this.claimAmountScope = scope;
    this.maybeFocusVarianceReason();
  }

  onPatientPaidCustomChange(value: number): void {
    const amount = Number(value);
    this.patientPaidCustom = Number.isFinite(amount) ? amount : 0;
    this.syncClaimChoices();
    this.maybeFocusVarianceReason();
  }

  patientPaidExceedsTotal(): boolean {
    return this.patientPayChoice === 'custom'
      && this.roundMoney(Number(this.patientPaidCustom) || 0) > this.roundMoney(this.visitTotal) + 0.001;
  }

  patientPaidSomething(): boolean {
    return this.patientPaidAmount() > 0.005;
  }

  paidExpectedShare(): boolean {
    if (this.patientPayChoice === 'oop') return true;
    if (!this.patientPaidSomething()) return false;
    return Math.abs(this.patientPaidAmount() - this.roundMoney(this.patientOwes)) <= 0.005;
  }

  paidFullVisit(): boolean {
    if (this.patientPayChoice === 'full') return true;
    return this.patientPaidAmount() > 0.005
      && Math.abs(this.patientPaidAmount() - this.roundMoney(this.visitTotal)) <= 0.005;
  }

  claimLockedToEstimate(): boolean {
    return this.hasInsuranceCoverage() && (this.paidExpectedShare() || this.paidFullVisit());
  }

  isOptimalSettlement(): boolean {
    return this.paidExpectedShare() && !this.claimDiffersFromEstimate() && !this.paysMember();
  }

  showWholeVisitClaim(): boolean {
    return !this.patientPaidSomething();
  }

  showRemainderClaim(): boolean {
    return this.patientPaidSomething()
      && !this.claimLockedToEstimate()
      && this.remainderAfterPatientPaid() > 0.005;
  }

  showClaimFromInsurance(): boolean {
    return this.hasInsuranceCoverage() || this.showWholeVisitClaim() || this.showRemainderClaim();
  }

  canCompleteWithoutClaim(): boolean {
    return !this.hasInsuranceCoverage() && this.patientPaidSomething();
  }

  remainderAfterPatientPaid(): number {
    return this.roundMoney(Math.max(0, this.visitTotal - this.patientPaidAmount()));
  }

  private syncClaimChoices(): void {
    if (this.claimLockedToEstimate()) {
      this.claimAmountScope = ClaimAmountScope.INSURANCE_ONLY;
      return;
    }
    if (!this.hasInsuranceCoverage() && this.claimAmountScope === ClaimAmountScope.INSURANCE_ONLY) {
      if (this.showWholeVisitClaim()) {
        this.claimAmountScope = ClaimAmountScope.ALL;
      } else if (this.showRemainderClaim()) {
        this.claimAmountScope = ClaimAmountScope.SPECIFIC;
      }
      return;
    }
    if (this.patientPaidSomething()) {
      if (this.claimAmountScope === ClaimAmountScope.ALL) {
        this.claimAmountScope = this.hasInsuranceCoverage()
          ? ClaimAmountScope.INSURANCE_ONLY
          : ClaimAmountScope.SPECIFIC;
      }
      return;
    }
    if (this.claimAmountScope === ClaimAmountScope.SPECIFIC) {
      this.claimAmountScope = this.hasInsuranceCoverage()
        ? ClaimAmountScope.INSURANCE_ONLY
        : ClaimAmountScope.ALL;
    }
  }

  patientPaidAmount(): number {
    if (this.patientPayChoice === 'oop') return this.roundMoney(this.patientOwes);
    if (this.patientPayChoice === 'full') return this.roundMoney(this.visitTotal);
    if (this.patientPayChoice === 'custom') {
      const amount = Number(this.patientPaidCustom);
      if (!Number.isFinite(amount) || amount < 0) return 0;
      return this.roundMoney(amount);
    }
    return 0;
  }

  claimRequestedAmount(): number {
    if (this.claimAmountScope === ClaimAmountScope.ALL) return this.roundMoney(this.visitTotal);
    if (this.claimAmountScope === ClaimAmountScope.SPECIFIC) {
      return this.remainderAfterPatientPaid();
    }
    return this.roundMoney(this.insurancePays);
  }

  patientOverpay(): number {
    return Math.max(0, this.roundMoney(this.patientPaidAmount() - this.patientOwes));
  }

  stillToCollect(): number {
    return Math.max(0, this.roundMoney(this.patientOwes - this.patientPaidAmount()));
  }

  paysMember(): boolean {
    return this.patientOverpay() > 0.005;
  }

  paymentResponsibility(): PaymentResponsibility {
    return this.paysMember()
      ? PaymentResponsibility.MEMBER_PAID_CASH
      : PaymentResponsibility.INSURANCE_PAYS_PROVIDER;
  }

  patientPayNote(): string {
    if (this.patientPaidExceedsTotal()) {
      return 'Payment cannot exceed total cost.';
    }
    const paid = this.patientPaidAmount();
    if (this.paysMember()) {
      return `The patient paid ${this.money(this.patientOverpay())} more than they should. The insurer will reimburse the member.`;
    }
    if (this.stillToCollect() > 0.005) {
      return `The patient is expected to pay ${this.money(this.stillToCollect())}.`;
    }
    if (this.patientOwes <= 0.005 && paid <= 0.005) {
      return 'No patient payment is expected for this visit.';
    }
    return 'The patient paid the expected share.';
  }

  payoutNote(): string {
    const amount = this.money(this.claimRequestedAmount());
    if (this.paysMember()) {
      return `The insurer reimburses the member ${amount}.`;
    }
    return `The insurer pays this facility ${amount}.`;
  }

  payoutStory(): string {
    const amount = this.money(this.claimRequestedAmount());
    if (this.claimDiffersFromEstimate()) {
      const estimate = this.money(this.roundMoney(this.insurancePays));
      const diff = this.money(this.roundMoney(Math.abs(this.claimRequestedAmount() - this.insurancePays)));
      const compared = this.claimRequestedAmount() > this.insurancePays ? 'more than' : 'less than';
      return `You are requesting ${amount} from insurance, ${diff} ${compared} the ${estimate} estimate. Don't forget to explain why in the section above.`;
    }
    if (this.paysMember()) {
      return `The patient already paid the full visit at the desk. ${amount} goes to the member, not this facility.`;
    }
    if (this.paidExpectedShare()) {
      return `The patient paid their share. ${amount} is paid to this facility.`;
    }
    if (this.stillToCollect() > 0.005) {
      return `Collect the remaining patient share at the desk. ${amount} is paid to this facility.`;
    }
    return `${amount} is paid to this facility.`;
  }

  private money(amount: number): string {
    return `ETB ${Math.round(amount).toLocaleString('en-ET')}`;
  }

  private clampAmount(value: number, min: number, max: number): number {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return min;
    return this.roundMoney(Math.min(max, Math.max(min, amount)));
  }

  claimDiffersFromEstimate(): boolean {
    return Math.abs(this.claimRequestedAmount() - this.roundMoney(this.insurancePays)) > 0.005;
  }

  amountsValid(): boolean {
    if (this.patientPaidExceedsTotal()) return false;
    const claimed = this.claimRequestedAmount();
    const paid = this.patientPaidAmount();
    const paidOk = paid >= 0 && paid <= this.visitTotal + 0.001;
    const claimedOk = claimed >= 0 && claimed <= this.visitTotal + 0.001;
    return paidOk && claimedOk;
  }

  settlementValid(): boolean {
    if (!this.amountsValid()) return false;
    if (this.claimDiffersFromEstimate() && this.claimVarianceReason.trim().length < 10) {
      return false;
    }
    return true;
  }

  promptSendClaim(): void {
    if (this.saving || !this.settlementValid()) return;
    this.showSendClaimConfirm = true;
  }

  payeeLabel(): string {
    return this.paysMember() ? 'The member' : 'This facility';
  }

  confirmClaimStory(): string {
    const amount = this.money(this.claimRequestedAmount());
    if (this.paysMember()) {
      return `${amount} will be requested from the insurer and paid to the member.`;
    }
    return `${amount} will be requested from the insurer and paid to this facility.`;
  }

  cancelValid(): boolean {
    return this.cancelReason.trim().length >= 10 && this.cancelAcknowledged;
  }

  openCancelVisit(): void {
    if (!this.canCancel() || this.saving) return;
    this.cancelReason = '';
    this.cancelAcknowledged = false;
    this.showCancelVisit = true;
  }

  closeCancelVisit(): void {
    this.showCancelVisit = false;
  }

  confirmCancelVisit(): void {
    if (!this.treatment || !this.cancelValid() || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.api.cancelTreatment(this.treatment.id, {
      reason: this.cancelReason.trim(),
      acknowledgedIrreversible: true,
    }).subscribe({
      next: () => {
        this.showCancelVisit = false;
        this.successMessage = 'Visit canceled. It cannot be reopened.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to cancel this visit.';
        this.saving = false;
      },
    });
  }

  private maybeFocusVarianceReason(): void {
    if (!this.claimDiffersFromEstimate()) return;
    setTimeout(() => this.focusVarianceReason());
  }

  private focusVarianceReason(): void {
    const field = this.varianceReason?.nativeElement;
    if (!field) return;
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus();
  }

  cancelSendClaimConfirm(): void {
    this.showSendClaimConfirm = false;
  }

  confirmSendClaim(): void {
    this.showSendClaimConfirm = false;
    this.completeTreatment(false);
  }

  promptCompleteWithoutClaim(): void {
    if (!this.canCompleteWithoutClaim() || this.saving || !this.amountsValid()) return;
    this.showSkipClaimConfirm = true;
  }

  cancelSkipClaimConfirm(): void {
    this.showSkipClaimConfirm = false;
  }

  confirmCompleteWithoutClaim(): void {
    this.showSkipClaimConfirm = false;
    this.completeTreatment(true);
  }

  completeTreatment(skipClaim = false): void {
    if (!this.treatment) return;
    if (!skipClaim && !this.settlementValid()) return;
    this.saving = true;
    this.errorMessage = '';
    const { treatingPhysician, treatmentReference } = this.visitForm.getRawValue();
    const claimed = this.claimRequestedAmount();
    let claimAmountScope = this.claimAmountScope;
    let specificAmount: number | undefined;
    if (!skipClaim && claimAmountScope === ClaimAmountScope.SPECIFIC) {
      if (Math.abs(claimed - this.roundMoney(this.insurancePays)) <= 0.005) {
        claimAmountScope = ClaimAmountScope.INSURANCE_ONLY;
      } else if (Math.abs(claimed - this.roundMoney(this.visitTotal)) <= 0.005) {
        claimAmountScope = ClaimAmountScope.ALL;
      } else {
        specificAmount = claimed;
      }
    }
    this.api.completeTreatment(this.treatment.id, {
      treatingPhysician: treatingPhysician?.trim() || undefined,
      treatmentReference: treatmentReference?.trim() || undefined,
      patientPaidAmount: this.patientPaidAmount(),
      claimAmountScope,
      paymentResponsibility: this.paymentResponsibility(),
      skipClaim: skipClaim || undefined,
      submittedClaimAmount: skipClaim ? 0 : claimed,
      ...(specificAmount != null ? { specificAmount } : {}),
      ...(!skipClaim && this.claimDiffersFromEstimate()
        ? { claimVarianceReason: this.claimVarianceReason.trim() }
        : {}),
    }).subscribe({
      next: () => {
        this.showCompleteVisit = false;
        this.showSkipClaimConfirm = false;
        this.showSendClaimConfirm = false;
        this.successMessage = skipClaim
          ? 'Visit completed. A digital receipt is on this check-in. No claim was sent because these services are not covered.'
          : this.paysMember()
            ? 'Visit completed. A digital receipt is attached, and a reimbursement claim was sent so the member can be paid back.'
            : 'Visit completed. A digital receipt is attached, and the claim was sent for the insurer to pay this facility.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to complete visit.';
        this.saving = false;
      },
    });
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private loadTreatment(id: string, showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.api.getTreatment(id).subscribe({
      next: (treatment) => {
        this.treatment = treatment;
        this.refreshQrSafeUrl();
        this.visitForm.patchValue({
          treatingPhysician: treatment.treatingPhysician ?? '',
          treatmentReference: treatment.treatmentReference ?? '',
        });
        this.loading = false;
        this.saving = false;
        this.estimation = null;
        if (treatment.status === TreatmentCaseStatus.OPEN) {
          this.refreshEstimation(treatment);
        }
      },
      error: () => {
        this.errorMessage = 'Check-in not found.';
        this.loading = false;
        this.saving = false;
      },
    });
  }

  private refreshEstimation(treatment: TreatmentDetail): void {
    const items = treatment.items ?? [];
    if (items.length === 0) {
      this.estimation = null;
      this.estimationLoading = false;
      return;
    }

    this.estimationLoading = true;
    this.api.createEstimation({
      memberId: treatment.memberId,
      treatmentCaseId: treatment.id,
      lines: items.map((item) => {
        const quantity = item.quantity || 1;
        const unitPrice = this.lineAmount(item.unitPrice) || this.lineAmount(item.totalPrice) / quantity;
        return {
          medicalServiceId: item.medicalServiceId,
          unitPrice,
          quantity,
        };
      }),
    }).subscribe({
      next: (estimation) => {
        this.estimation = this.applyQuantities(estimation, items);
        this.estimationLoading = false;
      },
      error: () => {
        this.estimation = null;
        this.estimationLoading = false;
      },
    });
  }

  private applyQuantities(estimation: CostEstimation, items: TreatmentItem[]): CostEstimation {
    const lines = items.map((item) => {
      const apiLine = estimation.lines.find((line) => line.medicalServiceId === item.medicalServiceId);
      const lineTotal = this.lineAmount(item.totalPrice);
      return {
        medicalServiceId: item.medicalServiceId,
        serviceName: item.serviceName,
        estimatedAmount: lineTotal,
        insurerAmount: this.lineAmount(apiLine?.insurerAmount),
        memberAmount: this.lineAmount(apiLine?.memberAmount ?? lineTotal),
        covered: apiLine?.covered,
        coverageStatus: apiLine?.coverageStatus,
        benefitName: apiLine?.benefitName,
        remainingAfter: apiLine?.remainingAfter,
      };
    });

    return {
      estimatedTotal: this.lineAmount(estimation.estimatedTotal),
      estimatedInsurerAmount: this.lineAmount(estimation.estimatedInsurerAmount),
      estimatedMemberAmount: this.lineAmount(estimation.estimatedMemberAmount),
      remainingCoverageBefore: this.lineAmount(estimation.remainingCoverageBefore),
      remainingCoverageAfter: this.lineAmount(estimation.remainingCoverageAfter),
      pools: estimation.pools ?? [],
      lines,
    };
  }

  private populateAgreedFee(medicalServiceId: string): void {
    const memberId = this.treatment?.memberId;
    if (!memberId || !medicalServiceId) return;

    this.feeLoading = true;
    this.selectedServiceRequiresPreauth = false;
    this.api.getServiceFee(memberId, medicalServiceId).subscribe({
      next: (fee) => {
        if (fee.agreedRate != null) {
          this.itemForm.patchValue({ unitPrice: Number(fee.agreedRate) });
        }
        this.selectedServiceRequiresPreauth = fee.requiresPreauth;
        this.feeLoading = false;
      },
      error: () => {
        this.selectedServiceRequiresPreauth = false;
        this.feeLoading = false;
      },
    });
  }
}
