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

  draftCount = 0;
  loading = true;

  ngOnInit(): void {
    this.api.getDraftClaims().subscribe({
      next: (res) => { this.draftCount = res.total; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
