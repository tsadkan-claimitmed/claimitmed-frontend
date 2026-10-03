import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { ClaimAttachment, ClaimDetail } from '../../../core/models';
import { ClaimAmountScope, ClaimStatus, PaymentResponsibility } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimAttachmentsComponent } from '../../../shared/components/claim-attachments/claim-attachments.component';

@Component({
  selector: 'app-provider-claim-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ClaimAttachmentsComponent,
  ],
  templateUrl: './provider-claim-detail.component.html',
  styleUrl: './provider-claim-detail.component.scss',
})
export class ProviderClaimDetailComponent implements OnInit {
  private readonly api = inject(ProviderApiService);
  private readonly route = inject(ActivatedRoute);

  readonly ClaimAmountScope = ClaimAmountScope;

  readonly acceptFiles = 'image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

  claim: ClaimDetail | null = null;
  loading = true;
  submitting = false;
  confirmSubmit = false;
  errorMessage = '';
  successMessage = '';
  submitAmountScope = ClaimAmountScope.INSURANCE_ONLY;
  specificAmount: number | null = null;
  resubmitComments = '';
  selectedFiles: File[] = [];
  resubmitting = false;

  ngOnInit(): void {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.errorMessage = 'Claim ID is missing.';
      this.loading = false;
      return;
    }

    this.api.getClaim(claimId).subscribe({
      next: (claim) => {
        this.claim = claim;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'This claim could not be found or you do not have access.';
        this.loading = false;
      },
    });
  }

  get canSubmit(): boolean {
    return this.claim?.status === ClaimStatus.DRAFT;
  }

  get canResubmit(): boolean {
    return this.claim?.status === ClaimStatus.NEED_INFO;
  }

  attachments(): ClaimAttachment[] {
    return this.claim?.attachments ?? [];
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (!incoming.length) {
      return;
    }

    const next = [...this.selectedFiles];
    for (const file of incoming) {
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = `${file.name} is larger than 10 MB.`;
        continue;
      }
      if (next.length >= 10) {
        this.errorMessage = 'You can attach up to 10 files.';
        break;
      }
      next.push(file);
    }
    this.selectedFiles = next;
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  resubmitClaim(): void {
    if (!this.claim || this.resubmitting) {
      return;
    }

    const claimId = this.claim.id;
    this.resubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api
      .resubmitClaim(claimId, {
        files: this.selectedFiles,
        comments: this.resubmitComments,
      })
      .subscribe({
        next: () => {
          this.api.getClaim(claimId).subscribe({
            next: (claim) => {
              this.claim = claim;
              this.selectedFiles = [];
              this.resubmitComments = '';
              this.resubmitting = false;
              this.successMessage = 'Claim sent back for review.';
            },
            error: () => {
              this.resubmitting = false;
            },
          });
        },
        error: (err) => {
          this.resubmitting = false;
          this.errorMessage = err.userMessage ?? 'Failed to resubmit claim.';
        },
      });
  }

  formatEnum(value: string): string {
    return value.replaceAll('_', ' ');
  }

  submitClaim(): void {
    if (!this.claim || this.submitting) return;
    this.submitAmountScope = ClaimAmountScope.INSURANCE_ONLY;
    this.specificAmount = this.amount(this.claim.insuranceAmount ?? this.claim.requestedAmount);
    this.confirmSubmit = true;
  }

  cancelSubmitClaim(): void {
    this.confirmSubmit = false;
  }

  confirmSubmitClaim(memberPaidCash: boolean): void {
    if (!this.claim || this.submitting) return;

    const claimId = this.claim.id;
    const paymentResponsibility = memberPaidCash
      ? PaymentResponsibility.MEMBER_PAID_CASH
      : PaymentResponsibility.INSURANCE_PAYS_PROVIDER;

    if (
      this.submitAmountScope === ClaimAmountScope.SPECIFIC &&
      (this.specificAmount == null || this.specificAmount <= 0)
    ) {
      return;
    }

    this.confirmSubmit = false;
    this.submitting = true;
    this.api
      .submitClaim(
        claimId,
        paymentResponsibility,
        this.submitAmountScope,
        this.submitAmountScope === ClaimAmountScope.SPECIFIC
          ? (this.specificAmount ?? undefined)
          : undefined,
      )
      .subscribe({
        next: () => {
          this.api.getClaim(claimId).subscribe({
            next: (claim) => {
              this.claim = claim;
              this.submitting = false;
            },
            error: () => {
              this.submitting = false;
            },
          });
        },
        error: () => {
          this.submitting = false;
        },
      });
  }

  amount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  totalTreatmentAmount(): number {
    if (!this.claim) return 0;
    return this.amount(this.claim.totalTreatmentAmount ?? this.claim.requestedAmount);
  }

  insuranceAmount(): number {
    if (!this.claim) return 0;
    return this.amount(this.claim.insuranceAmount ?? this.claim.requestedAmount);
  }

  memberOutOfPocketAmount(): number {
    if (!this.claim) return 0;
    return this.amount(this.claim.memberOutOfPocketAmount);
  }

  selectedSubmitAmount(): number {
    switch (this.submitAmountScope) {
      case ClaimAmountScope.ALL:
        return this.totalTreatmentAmount();
      case ClaimAmountScope.SPECIFIC:
        return this.amount(this.specificAmount);
      default:
        return this.insuranceAmount();
    }
  }

  lineAmount(value: number | string | undefined): number {
    return Number(value ?? 0);
  }
}
