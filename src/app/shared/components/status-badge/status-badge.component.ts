import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClaimStatus } from '../../../core/models/enums';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="badgeClass">{{ status }}</span>`,
  styles: [`
    .badge { font-size: 0.7rem; }
  `],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;

  get badgeClass(): string {
    const map: Record<string, string> = {
      [ClaimStatus.DRAFT]: 'badge-draft',
      [ClaimStatus.SUBMITTED]: 'badge-submitted',
      [ClaimStatus.UNDER_REVIEW]: 'badge-review',
      [ClaimStatus.APPROVED]: 'badge-approved',
      [ClaimStatus.REJECTED]: 'badge-rejected',
      [ClaimStatus.PAID]: 'badge-paid',
      [ClaimStatus.NEED_INFO]: 'badge-review',
    };
    return map[this.status] ?? 'badge-draft';
  }
}
