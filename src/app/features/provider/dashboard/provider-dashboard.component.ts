import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, LoadingSpinnerComponent],
  templateUrl: './provider-dashboard.component.html',
})
export class ProviderDashboardComponent implements OnInit {
  private readonly api = inject(ProviderApiService);

  inProgressCount = 0;
  reviewCount = 0;
  loading = true;

  ngOnInit(): void {
    this.api.getTreatments({ tab: 'IN_PROGRESS', page: 1, limit: 1 }).subscribe({
      next: (res) => { this.inProgressCount = res.meta.total; },
      error: () => { this.inProgressCount = 0; },
    });
    this.api.getClaims({ status: 'UNDER_REVIEW', page: 1, limit: 1 }).subscribe({
      next: (res) => { this.reviewCount = res.meta.total; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
