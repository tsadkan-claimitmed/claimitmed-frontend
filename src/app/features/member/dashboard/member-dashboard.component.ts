import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { MemberProfile, CoveragePool } from '../../../core/models';

@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, LoadingSpinnerComponent],
  templateUrl: './member-dashboard.component.html',
})
export class MemberDashboardComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  profile: MemberProfile | null = null;
  coverage: CoveragePool[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getProfile().subscribe({
      next: (p) => { this.profile = p; },
    });
    this.api.getCoverage().subscribe({
      next: (c) => { this.coverage = c; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get totalRemaining(): number {
    return this.coverage.reduce((sum, p) => sum + p.remainingAmount, 0);
  }
}
