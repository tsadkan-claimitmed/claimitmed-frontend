import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { FraudRule } from '../../../core/models';

@Component({
  selector: 'app-admin-fraud',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './admin-fraud.component.html',
})
export class AdminFraudComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  rules: FraudRule[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getFraudRules().subscribe({
      next: (r) => { this.rules = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  toggleRule(rule: FraudRule): void {
    const action = rule.isActive
      ? this.api.deactivateFraudRule(rule.id)
      : this.api.activateFraudRule(rule.id);
    action.subscribe({ next: (updated) => { rule.isActive = updated.isActive; } });
  }
}
