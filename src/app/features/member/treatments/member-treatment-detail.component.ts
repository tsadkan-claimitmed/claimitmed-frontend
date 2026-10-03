import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { TreatmentCostSummary, TreatmentDetail } from '../../../core/models';
import { PreauthStatus } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-member-treatment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './member-treatment-detail.component.html',
  styleUrl: './member-treatment-detail.component.scss',
})
export class MemberTreatmentDetailComponent implements OnInit {
  private readonly api = inject(MemberApiService);
  private readonly route = inject(ActivatedRoute);

  readonly PreauthStatus = PreauthStatus;

  treatment: TreatmentDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Treatment ID is missing.';
      this.loading = false;
      return;
    }

    this.api.getTreatment(id).subscribe({
      next: (treatment) => {
        this.treatment = treatment;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'This treatment could not be found or you do not have access.';
        this.loading = false;
      },
    });
  }

  patientName(): string {
    if (!this.treatment) return '—';
    const { firstName, lastName, memberNumber } = this.treatment.patient;
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    return name || memberNumber || '—';
  }

  formatEnum(value: string): string {
    return value.replaceAll('_', ' ');
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  treatmentItems() {
    return this.treatment?.items ?? [];
  }

  treatmentDiagnoses() {
    return this.treatment?.diagnoses ?? [];
  }

  costSummary(): TreatmentCostSummary {
    if (this.treatment?.costSummary) {
      return this.treatment.costSummary;
    }

    const total = this.treatment?.totalEstimatedAmount ?? '0';
    return {
      totalTreatmentAmount: total,
      insuranceAmount: '0',
      memberOutOfPocketAmount: total,
    };
  }
}
