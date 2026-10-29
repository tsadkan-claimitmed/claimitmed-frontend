import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { ClaimDetail } from '../../../core/models';
import { ClaimStatus } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimWorkspaceComponent } from '../../../shared/components/claim-workspace/claim-workspace.component';

@Component({
  selector: 'app-insurer-claim-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, EmptyStateComponent, ClaimWorkspaceComponent],
  template: `
    @if (loading) {
      <app-loading-spinner message="Loading claim details..." />
    } @else if (errorMessage && !claim) {
      <app-empty-state icon="⚠️" title="Unable to load claim" [message]="errorMessage" />
    } @else if (claim) {
      <app-claim-workspace
        [claim]="claim"
        [backLink]="claimsBasePath"
        [canAdjudicate]="canAdjudicate"
        [canRetryPayment]="canRetryPayment"
        [showReviewerExtras]="true"
        [showFraud]="showFraudTab"
        [actionLoading]="actionLoading"
        [errorMessage]="errorMessage"
        [successMessage]="successMessage"
        (approve)="confirmApproveClaim()"
        (retryPayment)="retryPayment()"
        (rejectClaim)="reject($event)"
        (requestInfo)="requestInfo($event)"
      />
    }
  `,
})
export class InsurerClaimDetailComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly route = inject(ActivatedRoute);
  private paymentPollTimer: ReturnType<typeof setInterval> | null = null;

  readonly readOnly = this.route.snapshot.data['readOnly'] === true;
  readonly showFraudTab = this.route.snapshot.data['showFraudTab'] === true;
  readonly claimsBasePath = this.route.snapshot.data['claimsBasePath'] ?? '/portal/insurer/claims';

  claim: ClaimDetail | null = null;
  loading = true;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';

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

  confirmApproveClaim(): void {
    if (!this.claim || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.approveClaim(this.claim.id, {}).subscribe({
      next: () => {
        this.actionLoading = false;
        this.successMessage = 'Claim approved. Payment processing has started.';
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to approve claim.';
      },
    });
  }

  reject(payload: { reason: string; comments?: string }): void {
    if (!this.claim || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.rejectClaim(this.claim.id, payload).subscribe({
      next: () => {
        this.actionLoading = false;
        this.successMessage = 'Claim rejected.';
        this.loadClaim(this.claim!.id);
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err.userMessage ?? 'Failed to reject claim.';
      },
    });
  }

  requestInfo(payload: { reason: string; comments?: string }): void {
    if (!this.claim || this.actionLoading) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.requestClaimInfo(this.claim.id, payload).subscribe({
      next: () => {
        this.actionLoading = false;
        this.successMessage = 'Information request sent to provider.';
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
    if (this.paymentPollTimer) return;
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
    if (!this.paymentPollTimer) return;
    clearInterval(this.paymentPollTimer);
    this.paymentPollTimer = null;
  }
}
