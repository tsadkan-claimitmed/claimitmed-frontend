import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MemberApiService } from '../../../core/services/member-api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Claim } from '../../../core/models';

@Component({
  selector: 'app-member-claims',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, StatusBadgeComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './member-claims.component.html',
})
export class MemberClaimsComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  claims: Claim[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getClaims().subscribe({
      next: (res) => { this.claims = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
