import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, LoadingSpinnerComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  benefitCount = 0;
  serviceCount = 0;
  providerCount = 0;
  fraudRuleCount = 0;
  loading = true;

  ngOnInit(): void {
    this.api.getBenefits().subscribe({ next: (b) => { this.benefitCount = b.length; } });
    this.api.getMedicalServices().subscribe({ next: (s) => { this.serviceCount = s.length; } });
    this.api.getProviders().subscribe({ next: (p) => { this.providerCount = p.length; } });
    this.api.getFraudRules().subscribe({
      next: (r) => { this.fraudRuleCount = r.length; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
