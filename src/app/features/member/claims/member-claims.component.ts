import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Claim } from '../../../core/models';

@Component({
  selector: 'app-member-claims',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe, DatePipe, StatusBadgeComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './member-claims.component.html',
  styleUrl: './member-claims.component.scss',
})
export class MemberClaimsComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  claims: Claim[] = [];
  loading = true;

  claimTypeLabel(claimType?: string | null): string {
    if (claimType === 'MEMBER_REIMBURSEMENT') return 'Member reimbursement';
    if (claimType === 'REIMBURSEMENT') return 'Member paid';
    return claimType || '—';
  }

  ngOnInit(): void {
    this.api.getClaims().subscribe({
      next: (res) => { this.claims = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
