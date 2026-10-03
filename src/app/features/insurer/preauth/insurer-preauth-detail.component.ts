import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { PreauthReviewDetail } from '../../../core/models';
import { PreauthStatus } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { formatEnumLabel } from '../../../shared/features/policies/policy-detail.utils';

@Component({
  selector: 'app-insurer-preauth-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-preauth-detail.component.html',
  styleUrl: './insurer-preauth-detail.component.scss',
})
export class InsurerPreauthDetailComponent implements OnInit {
  private readonly api = inject(InsurerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  detail: PreauthReviewDetail | null = null;
  loading = true;
  acting = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'treatment' | 'coverage' | 'history' | 'member' = 'treatment';
  showDenyDialog = false;
  denyReason = '';
  readonly PreauthStatus = PreauthStatus;
  formatEnum = formatEnumLabel;

  ngOnInit(): void {
    const treatmentId = this.route.snapshot.paramMap.get('id');
    if (!treatmentId) {
      this.errorMessage = 'Treatment ID is missing.';
      this.loading = false;
      return;
    }
    this.loadDetail(treatmentId);
  }

  isPending(): boolean {
    return this.detail?.decisionSummary.preauthStatus === PreauthStatus.PENDING;
  }

  parseAmount(value?: string | number | null): number {
    if (value === null || value === undefined || value === '') return 0;
    return Number(value);
  }

  lineAmount(value?: string | number | null): number {
    return this.parseAmount(value);
  }

  setTab(tab: 'treatment' | 'coverage' | 'history' | 'member'): void {
    this.activeTab = tab;
  }

  approve(): void {
    if (!this.detail || !this.isPending()) return;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.approvePreauth(this.detail.treatment.id).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = 'Preauthorization approved.';
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to approve preauthorization.';
      },
    });
  }

  openDenyDialog(): void {
    this.denyReason = '';
    this.showDenyDialog = true;
  }

  cancelDeny(): void {
    this.showDenyDialog = false;
    this.denyReason = '';
  }

  confirmDeny(): void {
    if (!this.detail || !this.denyReason.trim()) return;
    this.showDenyDialog = false;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.denyPreauth(this.detail.treatment.id, this.denyReason.trim()).subscribe({
      next: () => {
        this.acting = false;
        this.successMessage = 'Preauthorization denied.';
        this.loadDetail(this.detail!.treatment.id);
      },
      error: (err) => {
        this.acting = false;
        this.errorMessage = err.userMessage ?? 'Failed to deny preauthorization.';
      },
    });
  }

  formatRelationship(value?: string): string {
    return formatEnumLabel(value ?? '');
  }

  employerAddress(): string {
    if (!this.detail?.employer) return '—';
    const parts = [
      this.detail.employer.streetAddress,
      this.detail.employer.city,
      this.detail.employer.state,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  private loadDetail(treatmentId: string): void {
    this.loading = true;
    this.api.getPreauthDetail(treatmentId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load preauthorization review.';
        this.loading = false;
      },
    });
  }
}
