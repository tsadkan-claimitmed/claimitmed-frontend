import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { MemberDetail } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-insurer-member-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DatePipe,
    CurrencyPipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-member-detail.component.html',
  styleUrl: './insurer-member-detail.component.scss',
})
export class InsurerMemberDetailComponent implements OnInit {
  private readonly api = inject(InsurerApiService);
  private readonly route = inject(ActivatedRoute);

  detail: MemberDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const memberId = this.route.snapshot.paramMap.get('id');
    if (!memberId) {
      this.errorMessage = 'Member ID is missing.';
      this.loading = false;
      return;
    }

    this.api.getMemberDetail(memberId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load member details.';
        this.loading = false;
      },
    });
  }

  memberName(): string {
    if (!this.detail) return '—';
    const member = this.detail.member;
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
    return name || member.memberNumber;
  }

  formatRelationship(value: string): string {
    return value.replace(/_/g, ' ');
  }

  parseAmount(value: string | number): number {
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }
}
