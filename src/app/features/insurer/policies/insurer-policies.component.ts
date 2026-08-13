import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Policy } from '../../../core/models';

@Component({
  selector: 'app-insurer-policies',
  standalone: true,
  imports: [CommonModule, DatePipe, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './insurer-policies.component.html',
})
export class InsurerPoliciesComponent implements OnInit {
  private readonly api = inject(InsurerApiService);

  policies: Policy[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getPolicies().subscribe({
      next: (p) => { this.policies = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
