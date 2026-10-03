import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { ClaimAttachment, ClaimDetail } from '../../../core/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimAttachmentsComponent } from '../../../shared/components/claim-attachments/claim-attachments.component';

@Component({
  selector: 'app-member-claim-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ClaimAttachmentsComponent,
  ],
  templateUrl: './member-claim-detail.component.html',
  styleUrl: './member-claim-detail.component.scss',
})
export class MemberClaimDetailComponent implements OnInit {
  private readonly api = inject(MemberApiService);
  private readonly route = inject(ActivatedRoute);

  claim: ClaimDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Claim ID is missing.';
      this.loading = false;
      return;
    }

    this.api.getClaim(id).subscribe({
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

  claimTypeLabel(): string {
    const claimType = this.claim?.claimType;
    if (claimType === 'MEMBER_REIMBURSEMENT') return 'Member reimbursement';
    if (claimType === 'REIMBURSEMENT') return 'Member paid';
    return claimType || '—';
  }

  patientName(): string {
    if (!this.claim) return '—';
    const { firstName, lastName, memberNumber } = this.claim.patient;
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || memberNumber || '—';
  }

  providerName(): string {
    if (!this.claim) return '—';
    return this.claim.provider?.name || this.claim.provider?.providerCode || '—';
  }

  attachments(): ClaimAttachment[] {
    return this.claim?.attachments ?? [];
  }

  rejectionReasons(): ClaimDetail['decisions'] {
    return (this.claim?.decisions ?? []).filter((decision) => decision.decision === 'REJECTED');
  }

  infoRequests(): ClaimDetail['decisions'] {
    return (this.claim?.decisions ?? []).filter((decision) => decision.decision === 'NEED_INFO');
  }

  formatEnum(value?: string | null): string {
    if (!value) return '—';
    return value.replaceAll('_', ' ');
  }

  amount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }
}
