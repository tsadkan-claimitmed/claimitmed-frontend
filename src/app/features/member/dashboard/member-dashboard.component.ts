import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MemberProfile, CoveragePool, MemberTreatmentListItem } from '../../../core/models';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatCardComponent,
    LoadingSpinnerComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './member-dashboard.component.html',
  styleUrl: './member-dashboard.component.scss',
})
export class MemberDashboardComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  profile: MemberProfile | null = null;
  coverage: CoveragePool[] = [];
  recentTreatments: MemberTreatmentListItem[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getProfile().subscribe({
      next: (p) => {
        this.profile = p;
      },
    });
    this.api.getCoverage().subscribe({
      next: (c) => {
        this.coverage = c;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.api.getMyTreatments().subscribe({
      next: (rows) => {
        this.recentTreatments = rows.slice(0, 5);
      },
    });
  }

  get totalRemaining(): number {
    return this.coverage.reduce((sum, p) => sum + Number(p.remainingAmount ?? 0), 0);
  }

  policyLabel(): string {
    return this.profile?.policyName ?? this.profile?.policyNumber ?? '—';
  }

  amount(value: string | null | undefined): number {
    return Number(value ?? 0);
  }

  coverageExpired(): boolean {
    const status = this.profile?.status;
    return status === 'TERMINATED' || status === 'INACTIVE';
  }
}
