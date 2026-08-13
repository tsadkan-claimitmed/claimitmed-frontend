import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployerApiService } from '../../../core/services/employer-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Employer } from '../../../core/models';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './employer-dashboard.component.html',
})
export class EmployerDashboardComponent implements OnInit {
  private readonly api = inject(EmployerApiService);

  employer: Employer | null = null;
  loading = true;

  ngOnInit(): void {
    this.api.getEmployers().subscribe({
      next: (employers) => {
        this.employer = employers[0] ?? null;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
