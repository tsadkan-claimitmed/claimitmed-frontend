import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { EligibilityCheck, CoveragePool } from '../../../core/models';
import { CoverageLimitModel, TreatmentCasePurpose, TreatmentListTab } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PhotoLightboxComponent } from '../../../shared/components/photo-lightbox/photo-lightbox.component';

type VisitStep = 'eligibility' | 'coverage';

@Component({
  selector: 'app-provider-visit',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ReactiveFormsModule, RouterModule, LoadingSpinnerComponent, PhotoLightboxComponent],
  templateUrl: './provider-visit.component.html',
  styleUrl: './provider-visit.component.scss',
})
export class ProviderVisitComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPreauthRequest = this.route.snapshot.data['purpose'] === TreatmentCasePurpose.PREAUTH;

  readonly visitSteps: { id: VisitStep; label: string }[] = [
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'coverage', label: 'Coverage' },
  ];

  step: VisitStep = 'eligibility';
  maxStepIndex = 0;
  loading = false;
  errorMessage = '';
  openCheckinId: string | null = null;
  eligibility: EligibilityCheck | null = null;
  coverage: CoveragePool[] = [];
  viewingPhotoUrl: string | null = null;

  eligibilityForm = this.fb.group({
    nationalId: ['', [Validators.required, Validators.minLength(5)]],
  });

  checkEligibility(): void {
    if (this.eligibilityForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.openCheckinId = null;
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

  canContinueVisit(): boolean {
    return !!this.eligibility?.eligible;
  }

  continueToCoverage(): void {
    if (!this.eligibility) return;
    this.step = 'coverage';
    this.maxStepIndex = 1;
  }

  continueVisit(): void {
    if (!this.eligibility || !this.canContinueVisit()) return;
    this.loading = true;
    this.errorMessage = '';
    this.openCheckinId = null;
    this.api.createTreatment({
      memberId: this.eligibility.memberId,
      treatmentDate: new Date().toISOString().slice(0, 10),
      purpose: this.isPreauthRequest ? TreatmentCasePurpose.PREAUTH : TreatmentCasePurpose.VISIT,
    }).subscribe({
      next: (treatment) => {
        const base = this.isPreauthRequest ? '/portal/provider/preauth' : '/portal/provider/treatments';
        void this.router.navigate([base, treatment.id]);
      },
      error: (err) => {
        this.errorMessage = err.userMessage
          ?? (this.isPreauthRequest ? 'Unable to start this request.' : 'Unable to start this check-in.');
        this.openCheckinId = typeof err.error?.openCheckinId === 'string' ? err.error.openCheckinId : null;
        this.loading = false;
      },
    });
  }

  cancelVisit(): void {
    if (this.isPreauthRequest) {
      void this.router.navigate(['/portal/provider/preauth']);
      return;
    }
    void this.router.navigate(['/portal/provider/treatments'], {
      queryParams: { tab: TreatmentListTab.IN_PROGRESS },
    });
  }

  goToStep(step: VisitStep): void {
    const index = this.visitSteps.findIndex((entry) => entry.id === step);
    if (index < 0 || index > this.maxStepIndex) return;
    this.step = step;
  }

  isStepComplete(stepId: VisitStep): boolean {
    return this.visitSteps.findIndex((entry) => entry.id === stepId)
      < this.visitSteps.findIndex((entry) => entry.id === this.step);
  }

  isStepActive(stepId: VisitStep): boolean {
    return this.step === stepId;
  }

  isStepReachable(stepId: VisitStep): boolean {
    const index = this.visitSteps.findIndex((entry) => entry.id === stepId);
    return index >= 0 && index <= this.maxStepIndex;
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
}
