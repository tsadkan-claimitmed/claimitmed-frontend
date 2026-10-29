import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClaimStatus } from '../../../core/models/enums';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="badgeClass">{{ displayStatus }}</span>`,
  styles: [`
    .badge { font-size: 0.7rem; }
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;

  get badgeClass(): string {
    const map: Record<string, string> = {
      [ClaimStatus.DRAFT]: 'badge-review',
      [ClaimStatus.SUBMITTED]: 'badge-review',
      [ClaimStatus.UNDER_REVIEW]: 'badge-review',
      [ClaimStatus.APPROVED]: 'badge-approved',
      [ClaimStatus.REJECTED]: 'badge-rejected',
      [ClaimStatus.PAID]: 'badge-paid',
      [ClaimStatus.NEED_INFO]: 'badge-review',
      [ClaimStatus.REIMBURSEMENT_REVIEW]: 'badge-review',
      TERMINATED: 'badge-rejected',
      INACTIVE: 'badge-draft',
      EXPIRED: 'badge-rejected',
      ACTIVE: 'badge-approved',
      OPEN: 'badge-submitted',
      COMPLETED: 'badge-approved',
      CLAIMED: 'badge-paid',
      PENDING: 'badge-review',
      PARTIALLY_APPROVED: 'badge-review',
      DENIED: 'badge-rejected',
    };
    return map[this.status] ?? 'badge-draft';
  }

  get displayStatus(): string {
    const labels: Record<string, string> = {
      [ClaimStatus.DRAFT]: 'UNDER REVIEW',
      [ClaimStatus.SUBMITTED]: 'UNDER REVIEW',
      [ClaimStatus.UNDER_REVIEW]: 'UNDER REVIEW',
      [ClaimStatus.REIMBURSEMENT_REVIEW]: 'REIMBURSEMENT',
      [ClaimStatus.NEED_INFO]: 'NEED INFO',
      [ClaimStatus.APPROVED]: 'APPROVED',
      [ClaimStatus.REJECTED]: 'REJECTED',
      [ClaimStatus.PAID]: 'PAID',
      PENDING: 'UNDER REVIEW',
      PARTIALLY_APPROVED: 'APPROVED',
    };
    return labels[this.status] ?? this.status.replaceAll('_', ' ');
  }
}
