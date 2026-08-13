import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { Claim } from '../../../core/models';

@Component({
  selector: 'app-insurer-adjudication',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, StatusBadgeComponent],
  templateUrl: './insurer-adjudication.component.html',
})
export class InsurerAdjudicationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InsurerApiService);

  claim: Claim | null = null;
  loading = false;
  actionLoading = false;
  errorMessage = '';
  successMessage = '';

  searchForm = this.fb.group({
    claimId: ['', Validators.required],
  });

  rejectForm = this.fb.group({
    reason: ['', Validators.required],
    comments: [''],
  });

  lookupClaim(): void {
    if (this.searchForm.invalid) return;
    this.loading = true;
    this.errorMessage = '';
    this.claim = null;

    this.api.getClaim(this.searchForm.getRawValue().claimId!).subscribe({
      next: (c) => { this.claim = c; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage; this.loading = false; },
    });
  }

  approve(): void {
    if (!this.claim) return;
    this.actionLoading = true;
    this.api.approveClaim(this.claim.id, {}).subscribe({
      next: (c) => { this.claim = c; this.successMessage = 'Claim approved.'; this.actionLoading = false; },
      error: (err) => { this.errorMessage = err.userMessage; this.actionLoading = false; },
    });
  }

  reject(): void {
    if (!this.claim || this.rejectForm.invalid) return;
    this.actionLoading = true;
    this.api.rejectClaim(this.claim.id, this.rejectForm.getRawValue() as never).subscribe({
      next: (c) => { this.claim = c; this.successMessage = 'Claim rejected.'; this.actionLoading = false; },
      error: (err) => { this.errorMessage = err.userMessage; this.actionLoading = false; },
    });
  }
}
