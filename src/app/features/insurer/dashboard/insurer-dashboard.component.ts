import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-insurer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, LoadingSpinnerComponent],
  templateUrl: './insurer-dashboard.component.html',
})
export class InsurerDashboardComponent implements OnInit {
  private readonly api = inject(InsurerApiService);

  policyCount = 0;
  memberCount = 0;
  loading = true;

  ngOnInit(): void {
    this.api.getPolicies().subscribe({
      next: (p) => { this.policyCount = p.length; },
    });
    this.api.getMembers().subscribe({
      next: (m) => { this.memberCount = m.total; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
