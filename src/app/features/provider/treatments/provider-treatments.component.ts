import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TreatmentCase } from '../../../core/models';
import { PreauthStatus, TreatmentListTab } from '../../../core/models/enums';

interface TreatmentTab {
  tab: TreatmentListTab;
  label: string;
}

type SortableTreatmentField =
  | 'memberLastName'
  | 'treatmentReference'
  | 'treatingPhysician'
  | 'treatmentDate'
  | 'status'
  | 'preauthStatus'
  | 'createdAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-provider-treatments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './provider-treatments.component.html',
  styleUrl: './provider-treatments.component.scss',
})
export class ProviderTreatmentsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ProviderApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadTreatments();
  });

  readonly tabs: TreatmentTab[] = [
    { tab: TreatmentListTab.IN_PROGRESS, label: 'In Progress' },
    { tab: TreatmentListTab.REQUIRES_PREAUTH, label: 'Requires Preauth' },
    { tab: TreatmentListTab.COMPLETED, label: 'Completed' },
    { tab: TreatmentListTab.CANCELED, label: 'Canceled' },
  ];

  readonly TreatmentListTab = TreatmentListTab;
  readonly PreauthStatus = PreauthStatus;

  treatments: TreatmentCase[] = [];
  loading = true;
  activeTab = TreatmentListTab.IN_PROGRESS;
  searchQuery = '';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  sortColumn: SortableTreatmentField = 'createdAt';
  sortDirection: SortDirection = 'desc';

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (this.isTreatmentTab(tab)) {
      this.activeTab = tab;
    }
    this.loadTreatments();
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  get showingFrom(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  memberName(treatment: TreatmentCase): string {
    const name = [treatment.memberFirstName, treatment.memberLastName].filter(Boolean).join(' ').trim();
    return name || 'Unknown member';
  }

  selectTab(tab: TreatmentListTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
    this.loadTreatments();
  }

  toggleSort(column: SortableTreatmentField): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'treatmentDate' || column === 'createdAt' ? 'desc' : 'asc';
    }
    this.page = 1;
    this.loadTreatments();
  }

  sortIndicator(column: SortableTreatmentField): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page = 1;
    this.loadTreatments();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    this.loadTreatments();
  }

  openTreatment(treatment: TreatmentCase): void {
    void this.router.navigate(['/portal/provider/treatments', treatment.id]);
  }

  startNewVisit(): void {
    void this.router.navigate(['/portal/provider/treatments/new']);
  }

  preauthLabel(status?: string): string {
    return (status ?? '').replaceAll('_', ' ');
  }

  emptyStateMessage(): string {
    if (this.searchQuery.trim()) {
      return 'Try a different member name.';
    }
    if (this.activeTab === TreatmentListTab.COMPLETED) {
      return 'Completed visits appear here after you finish a patient check-in.';
    }
    if (this.activeTab === TreatmentListTab.CANCELED) {
      return 'Canceled visits appear here. They cannot be reopened.';
    }
    if (this.activeTab === TreatmentListTab.REQUIRES_PREAUTH) {
      return 'Check-ins waiting on insurer preauthorization appear here.';
    }
    return 'Start a new patient check-in to begin.';
  }

  loadTreatments(): void {
    this.loading = true;
    const sortPrefix = this.sortDirection === 'desc' ? '-' : '';
    this.api.getTreatments({
      tab: this.activeTab,
      page: this.page,
      limit: this.limit,
      search: this.searchQuery,
      sort: `${sortPrefix}${this.sortColumn}`,
    }).subscribe({
      next: (res) => {
        this.treatments = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.page = res.meta.page;
        this.limit = res.meta.limit;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private isTreatmentTab(tab: string | null): tab is TreatmentListTab {
    return tab === TreatmentListTab.IN_PROGRESS
      || tab === TreatmentListTab.REQUIRES_PREAUTH
      || tab === TreatmentListTab.COMPLETED
      || tab === TreatmentListTab.CANCELED;
  }
}
