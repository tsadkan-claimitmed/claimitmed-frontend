import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { MemberTreatmentListItem } from '../../../core/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type TreatmentTab = 'mine' | 'family';

@Component({
  selector: 'app-member-treatments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './member-treatments.component.html',
  styleUrl: './member-treatments.component.scss',
})
export class MemberTreatmentsComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  activeTab: TreatmentTab = 'mine';
  myTreatments: MemberTreatmentListItem[] = [];
  familyTreatments: MemberTreatmentListItem[] = [];
  loadingMine = true;
  loadingFamily = true;

  ngOnInit(): void {
    this.api.getMyTreatments().subscribe({
      next: (rows) => {
        this.myTreatments = rows;
        this.loadingMine = false;
      },
      error: () => {
        this.loadingMine = false;
      },
    });

    this.api.getFamilyTreatments().subscribe({
      next: (rows) => {
        this.familyTreatments = rows;
        this.loadingFamily = false;
      },
      error: () => {
        this.loadingFamily = false;
      },
    });
  }

  setTab(tab: TreatmentTab): void {
    this.activeTab = tab;
  }

  activeList(): MemberTreatmentListItem[] {
    return this.activeTab === 'mine' ? this.myTreatments : this.familyTreatments;
  }

  isLoading(): boolean {
    return this.activeTab === 'mine' ? this.loadingMine : this.loadingFamily;
  }

  formatEnum(value: string): string {
    return value.replaceAll('_', ' ');
  }

  amount(value: string | null | undefined): number {
    return Number(value ?? 0);
  }
}
