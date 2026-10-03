import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '../../../core/services/config.service';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { EligibilityCheck, CoveragePool } from '../../../core/models';

@Component({
  selector: 'app-provider-eligibility',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './provider-eligibility.component.html',
})
export class ProviderEligibilityComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);
  private readonly config = inject(ConfigService);

  loading = false;
  eligibility: EligibilityCheck | null = null;
  coverage: CoveragePool[] = [];
  errorMessage = '';

  form = this.fb.group({
    nationalId: ['', [Validators.required, Validators.minLength(5)]],
  });

  check(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.eligibility = null;
    this.coverage = [];

    const nationalId = this.form.getRawValue().nationalId!;
    this.api.checkEligibility(nationalId).subscribe({
      next: (result) => {
        this.eligibility = result;
        this.api.getCoverage(result.memberId).subscribe({
          next: (c) => { this.coverage = c; this.loading = false; },
          error: () => { this.loading = false; },
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.userMessage ?? 'Member not found or not eligible.';
      },
    });
  }

  memberPhotoUrl(): string | null {
    return this.config.resolveAssetUrl(this.eligibility?.photoUrl);
  }

  memberInitials(): string {
    if (!this.eligibility) return '';
    const first = this.eligibility.firstName?.charAt(0) ?? '';
    const last = this.eligibility.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || '—';
  }

  policyNetworkTypeLabel(): string {
    const value = this.eligibility?.policyNetworkType ?? 'IN_NETWORK';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
