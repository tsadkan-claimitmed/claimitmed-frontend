import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MemberApiService } from '../../../core/services/member-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CoveragePool } from '../../../core/models';

@Component({
  selector: 'app-member-coverage',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, LoadingSpinnerComponent],
  templateUrl: './member-coverage.component.html',
})
export class MemberCoverageComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  coverage: CoveragePool[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getCoverage().subscribe({
      next: (c) => { this.coverage = c; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  usagePercent(pool: CoveragePool): number {
    if (pool.annualLimit === 0) return 0;
    return Math.round((pool.consumedAmount / pool.annualLimit) * 100);
  }
}
