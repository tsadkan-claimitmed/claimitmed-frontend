import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Claim } from '../../../core/models';

@Component({
  selector: 'app-provider-claims',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, StatusBadgeComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './provider-claims.component.html',
})
export class ProviderClaimsComponent implements OnInit {
  private readonly api = inject(ProviderApiService);

  claims: Claim[] = [];
  loading = true;
  submitting: string | null = null;

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.loading = true;
    this.api.getDraftClaims().subscribe({
      next: (res) => { this.claims = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  submitClaim(claim: Claim): void {
    this.submitting = claim.id;
    this.api.submitClaim(claim.id, 'INSURANCE_PAYS_PROVIDER').subscribe({
      next: () => { this.submitting = null; this.loadClaims(); },
      error: () => { this.submitting = null; },
    });
  }
}
