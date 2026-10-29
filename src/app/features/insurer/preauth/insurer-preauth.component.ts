import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TreatmentCase } from '../../../core/models';
import { PreauthStatus, ProviderPreauthTab } from '../../../core/models/enums';

interface PreauthTab {
  tab: ProviderPreauthTab;
  label: string;
}

@Component({
  selector: 'app-insurer-preauth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-preauth.component.html',
  styleUrl: './insurer-preauth.component.scss',
})
export class InsurerPreauthComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadQueue();
  });

  readonly tabs: PreauthTab[] = [
    { tab: ProviderPreauthTab.UNDER_REVIEW, label: 'Under Review' },
    { tab: ProviderPreauthTab.APPROVED, label: 'Approved' },
    { tab: ProviderPreauthTab.DENIED, label: 'Denied' },
  ];

  readonly ProviderPreauthTab = ProviderPreauthTab;
  readonly PreauthStatus = PreauthStatus;

  treatments: TreatmentCase[] = [];
  loading = true;
  activeTab = ProviderPreauthTab.UNDER_REVIEW;
  searchQuery = '';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  errorMessage = '';

  ngOnInit(): void {
    this.loadQueue();
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

  selectTab(tab: ProviderPreauthTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 1;
    this.loadQueue();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page = 1;
    this.loadQueue();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages) return;
    this.page = nextPage;
    this.loadQueue();
  }

  openRequest(treatment: TreatmentCase): void {
    void this.router.navigate([treatment.id], { relativeTo: this.route });
  }

  emptyTitle(): string {
    if (this.activeTab === ProviderPreauthTab.APPROVED) return 'No approved preauthorizations';
    if (this.activeTab === ProviderPreauthTab.DENIED) return 'No denied preauthorizations';
    return 'No pending preauthorizations';
  }

  emptyMessage(): string {
    if (this.searchQuery.trim()) return 'No preauthorizations match this search.';
    if (this.activeTab === ProviderPreauthTab.APPROVED) return 'Approved requests will appear here.';
    if (this.activeTab === ProviderPreauthTab.DENIED) return 'Denied requests will appear here.';
    return 'All caught up — nothing is waiting for review.';
  }

  private loadQueue(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getPendingPreauth({
      page: this.page,
      limit: this.limit,
      search: this.searchQuery,
      tab: this.activeTab,
    }).subscribe({
      next: (res) => {
        this.treatments = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.page = res.meta.page;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load preauthorizations.';
        this.loading = false;
      },
    });
  }
}
