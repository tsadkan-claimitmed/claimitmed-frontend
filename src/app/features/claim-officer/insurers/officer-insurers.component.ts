import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { Insurer } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-officer-insurers',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './officer-insurers.component.html',
  styleUrl: './officer-insurers.component.scss',
})
export class OfficerInsurersComponent implements OnInit {
  private readonly api = inject(InsurerApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  insurers: Insurer[] = [];
  loading = true;
  errorMessage = '';

  get managesAllInsurers(): boolean {
    return this.auth.currentUser?.managesAllInsurers === true;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getInsurers().subscribe({
      next: (insurers) => {
        this.insurers = insurers;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load insurers.';
        this.loading = false;
      },
    });
  }

  openClaims(insurer: Insurer): void {
    void this.router.navigate(['/portal/claim-officer/claims'], {
      queryParams: { insuranceCompanyId: insurer.id },
    });
  }
}
