import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { CostEstimation, EligibilityCheck, CoveragePool } from '../../../core/models';
import { CoverageLimitModel, PreauthStatus, TreatmentListTab } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ServiceSearchSelectComponent } from '../../../shared/components/service-search-select/service-search-select.component';
import { PhotoLightboxComponent } from '../../../shared/components/photo-lightbox/photo-lightbox.component';

type VisitStep = 'eligibility' | 'coverage' | 'treatment' | 'items' | 'review' | 'done';

interface VisitStepConfig {
  id: VisitStep;
  label: string;
}

interface VisitDraftItem {
  id: string;
  medicalServiceId: string;
  serviceName?: string;
  serviceCode?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresPreauth: boolean;
}

@Component({
  selector: 'app-provider-visit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CurrencyPipe, LoadingSpinnerComponent, ServiceSearchSelectComponent, PhotoLightboxComponent],
  templateUrl: './provider-visit.component.html',
  styleUrl: './provider-visit.component.scss',
})
export class ProviderVisitComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);

  readonly visitSteps: VisitStepConfig[] = [
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'items', label: 'Treatment' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Complete' },
  ];

  readonly stepOrder: VisitStep[] = ['eligibility', 'coverage', 'treatment', 'items', 'review', 'done'];

  step: VisitStep = 'eligibility';
  maxStepIndex = 0;
  loading = false;
  estimationLoading = false;
  errorMessage = '';
  successMessage = '';
  eligibility: EligibilityCheck | null = null;
  coverage: CoveragePool[] = [];
  draftItems: VisitDraftItem[] = [];
  costSummary: CostEstimation | null = null;
  pendingRemoveItem: VisitDraftItem | null = null;
  completedTreatmentId: string | null = null;
  preauthSubmitted = false;
  viewingPhotoUrl: string | null = null;

  readonly PreauthStatus = PreauthStatus;
  readonly TreatmentListTab = TreatmentListTab;

  eligibilityForm = this.fb.group({
    nationalId: ['', [Validators.required, Validators.minLength(5)]],
  });

  treatmentForm = this.fb.group({
    treatingPhysician: [''],
    treatmentReference: [''],
  });

  itemForm = this.fb.group({
    medicalServiceId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
  });

  feeLoading = false;
  selectedServiceRequiresPreauth = false;
  selectedServiceName?: string;
  selectedServiceCode?: string | null;

  checkEligibility(): void {
    if (this.eligibilityForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    const nationalId = this.eligibilityForm.getRawValue().nationalId!.trim();
    this.api.checkEligibility(nationalId).subscribe({
      next: (result) => {
        this.eligibility = result;
        if (!result.eligible) {
          this.errorMessage = result.ineligibilityReasons.join(' ');
        }
        this.api.getCoverage(result.memberId).subscribe({
          next: (coverage) => {
            this.coverage = coverage;
            this.loading = false;
          },
          error: (err) => {
            this.coverage = [];
            if (result.eligible) {
              this.errorMessage = err.userMessage ?? 'Unable to load coverage balances.';
            }
            this.loading = false;
          },
        });
      },
      error: (err) => {
        this.eligibility = null;
        this.errorMessage = err.userMessage ?? 'Member not found or not eligible.';
        this.loading = false;
      },
    });
  }

  canContinueToTreatment(): boolean {
    return !!this.eligibility?.eligible;
  }

  startTreatment(): void {
    if (!this.eligibility || !this.canContinueToTreatment()) return;
    this.advanceTo('items');
  }

  onServiceSelected(medicalServiceId: string): void {
    this.populateAgreedFee(medicalServiceId);
  }

  itemLabel(item: Pick<VisitDraftItem, 'serviceName' | 'medicalServiceId'>): string {
    return item.serviceName || item.medicalServiceId.slice(0, 8);
  }

  addItem(): void {
    if (this.itemForm.invalid || !this.eligibility) return;
    const { quantity, unitPrice, medicalServiceId } = this.itemForm.getRawValue();

    this.draftItems = [
      ...this.draftItems,
      {
        id: crypto.randomUUID(),
        medicalServiceId: medicalServiceId!,
        serviceName: this.selectedServiceName,
        serviceCode: this.selectedServiceCode,
        quantity: quantity!,
        unitPrice: unitPrice!,
        totalPrice: quantity! * unitPrice!,
        requiresPreauth: this.selectedServiceRequiresPreauth,
      },
    ];

    this.itemForm.reset({ quantity: 1, unitPrice: 0 });
    this.selectedServiceRequiresPreauth = false;
    this.selectedServiceName = undefined;
    this.selectedServiceCode = undefined;
    this.costSummary = null;
    this.errorMessage = '';
  }

  promptRemoveItem(item: VisitDraftItem): void {
    this.pendingRemoveItem = item;
  }

  cancelRemoveItem(): void {
    this.pendingRemoveItem = null;
  }

  confirmRemoveItem(): void {
    const item = this.pendingRemoveItem;
    if (!item) return;

    this.draftItems = this.draftItems.filter((entry) => entry.id !== item.id);
    this.pendingRemoveItem = null;
    this.costSummary = null;
    if (item.requiresPreauth) {
      this.successMessage = 'Service removed from this visit.';
    }
  }

  proceedToReview(): void {
    if (!this.canProceedToReview()) return;
    this.advanceTo('review');
  }

  completeTreatment(): void {
    if (!this.eligibility || !this.canComplete() || !this.costSummary) return;

    this.loading = true;
    this.errorMessage = '';
    this.api.finalizeVisit({
      memberId: this.eligibility.memberId,
      treatingPhysician: this.treatmentForm.value.treatingPhysician ?? undefined,
      treatmentReference: this.treatmentForm.value.treatmentReference ?? undefined,
      treatmentDate: new Date().toISOString().slice(0, 10),
      items: this.draftItems.map((item) => ({
        medicalServiceId: item.medicalServiceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    }).subscribe({
      next: (treatment) => {
        this.completedTreatmentId = treatment.id;
        this.successMessage = 'Treatment completed and draft claim created.';
        this.advanceTo('done');
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to complete treatment.';
        this.loading = false;
      },
    });
  }

  goToStep(step: VisitStep): void {
    if (!this.canNavigateTo(step)) return;

    if (step === 'items') {
      this.step = this.draftItems.length || this.maxStepIndex >= this.stepOrder.indexOf('items')
        ? 'items'
        : 'treatment';
      return;
    }
    if (step === 'review') {
      this.step = 'review';
      this.loadCostSummary();
      return;
    }

    this.step = step;
  }

  continueToTreatment(): void {
    this.advanceTo('treatment');
  }

  stepperIndex(stepId: VisitStep): number {
    if (stepId === 'items') {
      return Math.max(this.stepOrder.indexOf('treatment'), this.stepOrder.indexOf('items'));
    }
    return this.stepOrder.indexOf(stepId);
  }

  isStepComplete(stepId: VisitStep): boolean {
    return this.displayStepIndex(stepId) < this.displayStepIndex(this.step);
  }

  isStepActive(stepId: VisitStep): boolean {
    if (stepId === 'items') {
      return this.step === 'treatment' || this.step === 'items';
    }
    return this.step === stepId;
  }

  isStepReachable(stepId: VisitStep): boolean {
    const targetStep = stepId === 'items'
      ? (this.maxStepIndex >= this.stepOrder.indexOf('items') ? 'items' : 'treatment')
      : stepId;
    return this.canNavigateTo(targetStep);
  }

  get currentStepIndex(): number {
    return this.stepOrder.indexOf(this.step);
  }

  private displayStepIndex(step: VisitStep): number {
    if (step === 'treatment' || step === 'items') return 2;
    const map: Record<VisitStep, number> = {
      eligibility: 0,
      coverage: 1,
      treatment: 2,
      items: 2,
      review: 3,
      done: 4,
    };
    return map[step];
  }

  canNavigateTo(step: VisitStep): boolean {
    const targetIndex = this.stepOrder.indexOf(step);
    if (targetIndex < 0) return false;
    if (step === 'review' && this.preauthBlocked()) return false;
    if (step === 'done') return this.step === 'done';
    return targetIndex <= this.maxStepIndex;
  }

  continueToCoverage(): void {
    if (!this.eligibility) return;
    this.advanceTo('coverage');
  }

  memberName(): string {
    if (!this.eligibility) return '';
    return `${this.eligibility.firstName} ${this.eligibility.lastName}`.trim();
  }

  memberPhotoUrl(): string | null {
    return this.config.resolveAssetUrl(this.eligibility?.photoUrl);
  }

  photoDownloadName(): string {
    const number = this.eligibility?.memberNumber ?? 'member';
    return `${number}-photo.jpg`;
  }

  openPhotoViewer(): void {
    const url = this.memberPhotoUrl();
    if (!url) return;
    this.viewingPhotoUrl = url;
  }

  closePhotoViewer(): void {
    this.viewingPhotoUrl = null;
  }

  memberInitials(): string {
    if (!this.eligibility) return '';
    const first = this.eligibility.firstName?.charAt(0) ?? '';
    const last = this.eligibility.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '—';
  }

  memberRoleLabel(): string {
    const relationship = this.eligibility?.relationshipType?.toUpperCase() ?? '';
    if (relationship === 'PRIMARY') {
      return 'Primary (Policy Holder)';
    }
    if (!relationship) {
      return '—';
    }
    const friendly = relationship.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    return `Dependent (${friendly})`;
  }

  coverageLimitModelLabel(): string {
    if (this.eligibility?.coverageLimitModel === CoverageLimitModel.POLICY_WALLET) {
      return 'Policy wallet (shared limit)';
    }
    return 'Per benefit';
  }

  policyNetworkTypeLabel(): string {
    const value = this.eligibility?.policyNetworkType ?? 'IN_NETWORK';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  totalQuantity(): number {
    return this.draftItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  totalPrice(): number {
    return this.draftItems.reduce((sum, item) => sum + this.lineAmount(item.totalPrice), 0);
  }

  hasPreauthItem(): boolean {
    return this.draftItems.some((item) => item.requiresPreauth);
  }

  preauthBlocked(): boolean {
    return this.hasPreauthItem();
  }

  canProceedToReview(): boolean {
    return this.draftItems.length > 0 && !this.preauthBlocked();
  }

  canComplete(): boolean {
    return this.canProceedToReview();
  }

  canSubmitPreauthRequest(): boolean {
    return !!this.eligibility?.eligible && this.draftItems.length > 0 && this.preauthBlocked();
  }

  requestPreauthAndWait(): void {
    if (!this.eligibility || !this.canSubmitPreauthRequest()) return;

    this.loading = true;
    this.errorMessage = '';
    this.api.submitPreauthRequest({
      memberId: this.eligibility.memberId,
      treatingPhysician: this.treatmentForm.value.treatingPhysician ?? undefined,
      treatmentReference: this.treatmentForm.value.treatmentReference ?? undefined,
      treatmentDate: new Date().toISOString().slice(0, 10),
      items: this.draftItems.map((item) => ({
        medicalServiceId: item.medicalServiceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    }).subscribe({
      next: (treatment) => {
        this.completedTreatmentId = treatment.id;
        this.preauthSubmitted = true;
        this.successMessage = 'Preauthorization request sent to the insurer. You can continue once it is approved.';
        this.advanceTo('done');
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to submit preauthorization request.';
        this.loading = false;
      },
    });
  }

  cancelVisit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    void this.router.navigate(['/portal/provider/treatments'], {
      queryParams: { tab: TreatmentListTab.IN_PROGRESS },
    });
  }

  memberOutOfPocket(): number {
    if (this.costSummary) return this.costSummary.estimatedMemberAmount;
    return 0;
  }

  insurerAmount(): number {
    if (this.costSummary) return this.costSummary.estimatedInsurerAmount;
    return 0;
  }

  goToTreatments(tab: TreatmentListTab = TreatmentListTab.IN_PROGRESS): void {
    void this.router.navigate(['/portal/provider/treatments'], {
      queryParams: { tab },
    });
  }

  viewSubmittedPreauth(): void {
    if (!this.completedTreatmentId) {
      this.goToTreatments(TreatmentListTab.REQUIRES_PREAUTH);
      return;
    }
    void this.router.navigate(['/portal/provider/treatments', this.completedTreatmentId]);
  }

  viewCompletedTreatment(): void {
    if (!this.completedTreatmentId) {
      this.goToTreatments(TreatmentListTab.COMPLETED);
      return;
    }
    void this.router.navigate(['/portal/provider/treatments', this.completedTreatmentId]);
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  private advanceTo(step: VisitStep): void {
    this.step = step;
    const idx = this.stepOrder.indexOf(step);
    if (idx > this.maxStepIndex) {
      this.maxStepIndex = idx;
    }
    if (step === 'review') {
      this.loadCostSummary();
    }
  }

  private loadCostSummary(): void {
    if (!this.eligibility || !this.draftItems.length || this.preauthBlocked()) {
      this.costSummary = null;
      return;
    }

    this.estimationLoading = true;
    this.errorMessage = '';
    this.api.createEstimation({
      memberId: this.eligibility.memberId,
      lines: this.draftItems.map((item) => ({
        medicalServiceId: item.medicalServiceId,
        unitPrice: this.lineAmount(item.unitPrice),
      })),
    }).subscribe({
      next: (estimation) => {
        this.costSummary = this.applyQuantities(this.normalizeEstimation(estimation));
        this.estimationLoading = false;
      },
      error: (err) => {
        this.costSummary = null;
        this.estimationLoading = false;
        this.errorMessage = err.userMessage ?? 'Unable to calculate cost summary.';
      },
    });
  }

  private normalizeEstimation(estimation: CostEstimation & {
    lines?: Array<CostEstimation['lines'][number] & { unitPrice?: number | string }>;
  }): CostEstimation {
    return {
      estimatedTotal: Number(estimation.estimatedTotal ?? 0),
      estimatedInsurerAmount: Number(estimation.estimatedInsurerAmount ?? 0),
      estimatedMemberAmount: Number(estimation.estimatedMemberAmount ?? 0),
      lines: (estimation.lines ?? []).map((line) => {
        const rawLine = line as CostEstimation['lines'][number] & { unitPrice?: number | string };
        return {
          medicalServiceId: rawLine.medicalServiceId,
          serviceName: rawLine.serviceName,
          estimatedAmount: Number(rawLine.estimatedAmount ?? rawLine.unitPrice ?? 0),
          insurerAmount: Number(rawLine.insurerAmount ?? 0),
          memberAmount: Number(rawLine.memberAmount ?? 0),
        };
      }),
    };
  }

  private applyQuantities(estimation: CostEstimation): CostEstimation {
    if (!this.draftItems.length) return estimation;

    let estimatedTotal = 0;
    let estimatedInsurerAmount = 0;
    let estimatedMemberAmount = 0;

    const lines = this.draftItems.map((item) => {
      const unitLine = estimation.lines.find((line) => line.medicalServiceId === item.medicalServiceId);
      const unitInsurer = unitLine?.insurerAmount ?? 0;
      const unitMember = unitLine?.memberAmount ?? 0;
      const lineTotal = this.lineAmount(item.totalPrice);
      const insurerAmount = unitInsurer * item.quantity;
      const memberAmount = unitMember * item.quantity;

      estimatedTotal += lineTotal;
      estimatedInsurerAmount += insurerAmount;
      estimatedMemberAmount += memberAmount;

      return {
        medicalServiceId: item.medicalServiceId,
        serviceName: item.serviceName,
        estimatedAmount: lineTotal,
        insurerAmount,
        memberAmount,
      };
    });

    return {
      estimatedTotal,
      estimatedInsurerAmount,
      estimatedMemberAmount,
      lines,
    };
  }

  private populateAgreedFee(medicalServiceId: string): void {
    const memberId = this.eligibility?.memberId;
    if (!memberId || !medicalServiceId) return;

    this.feeLoading = true;
    this.selectedServiceRequiresPreauth = false;
    this.selectedServiceName = undefined;
    this.selectedServiceCode = undefined;

    this.api.getMedicalService(medicalServiceId).subscribe({
      next: (service) => {
        this.selectedServiceName = service.serviceName;
        this.selectedServiceCode = service.serviceCode;
      },
    });

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
