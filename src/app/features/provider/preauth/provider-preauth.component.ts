import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TreatmentCase } from '../../../core/models';
import { PreauthStatus, ProviderPreauthTab } from '../../../core/models/enums';

interface PreauthTab {
  tab: ProviderPreauthTab;
  label: string;
}

@Component({
  selector: 'app-provider-preauth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './provider-preauth.component.html',
  styleUrl: './provider-preauth.component.scss',
})
export class ProviderPreauthComponent implements OnInit, OnDestroy {
  private readonly api = inject(ProviderApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadRequests();
  });

  readonly tabs: PreauthTab[] = [
    { tab: ProviderPreauthTab.DRAFT, label: 'Draft' },
    { tab: ProviderPreauthTab.UNDER_REVIEW, label: 'Under Review' },
    { tab: ProviderPreauthTab.APPROVED, label: 'Approved' },
    { tab: ProviderPreauthTab.DENIED, label: 'Denied' },
    { tab: ProviderPreauthTab.CANCELED, label: 'Cancelled' },
  ];

  readonly PreauthStatus = PreauthStatus;
  readonly ProviderPreauthTab = ProviderPreauthTab;

  requests: TreatmentCase[] = [];
  loading = true;
  activeTab = ProviderPreauthTab.DRAFT;
  searchQuery = '';
  employerQuery = '';
  dateFrom = '';
  dateTo = '';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    this.activeTab = this.resolveTab(tab);
    this.loadRequests();
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

  employerLabel(treatment: TreatmentCase): string {
    return treatment.employerName || '—';
  }

  selectTab(tab: ProviderPreauthTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 1;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
    this.loadRequests();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  applyFilters(): void {
    this.page = 1;
    this.loadRequests();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.employerQuery = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.page = 1;
    this.loadRequests();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    this.loadRequests();
  }

  openRequest(treatment: TreatmentCase): void {
    void this.router.navigate(['/portal/provider/preauth', treatment.id]);
  }

  startNewRequest(): void {
    void this.router.navigate(['/portal/provider/preauth/new']);
  }

  preauthLabel(status?: string): string {
    if (status === PreauthStatus.DRAFT || status === PreauthStatus.NOT_REQUIRED) return 'Draft';
    if (status === PreauthStatus.PENDING) return 'Under Review';
    if (status === PreauthStatus.PARTIALLY_APPROVED) return 'Approved';
    if (status === PreauthStatus.APPROVED) return 'Approved';
    if (status === PreauthStatus.DENIED) return 'Denied';
    return (status ?? '').replaceAll('_', ' ');
  }

  emptyStateMessage(): string {
    if (this.searchQuery.trim() || this.employerQuery.trim() || this.dateFrom || this.dateTo) {
      return 'Try a different member, employer, or date range.';
    }
    if (this.activeTab === ProviderPreauthTab.UNDER_REVIEW) {
      return 'Requested preauthorizations wait here until the insurer reviews them.';
    }
    if (this.activeTab === ProviderPreauthTab.APPROVED) {
      return 'Approved requests appear here. Start the check-in when the patient arrives.';
    }
    if (this.activeTab === ProviderPreauthTab.DENIED) {
      return 'Denied requests appear here.';
    }
    if (this.activeTab === ProviderPreauthTab.CANCELED) {
      return 'Cancelled requests appear here.';
    }
    return 'New requests stay in Draft until you send them for insurer review.';
  }

  loadRequests(): void {
    this.loading = true;
    this.api.getPreauthRequests({
      tab: this.activeTab,
      page: this.page,
      limit: this.limit,
      search: this.searchQuery,
      employer: this.employerQuery,
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
    }).subscribe({
      next: (result) => {
        this.requests = result.data;
        this.total = result.meta.total;
        this.totalPages = result.meta.totalPages;
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.total = 0;
        this.totalPages = 1;
        this.loading = false;
      },
    });
  }

  private resolveTab(value: string | null): ProviderPreauthTab {
    if (value === 'WAITING') return ProviderPreauthTab.UNDER_REVIEW;
    if (value === 'READY') return ProviderPreauthTab.APPROVED;
    if (this.isTab(value)) return value;
    return ProviderPreauthTab.DRAFT;
  }

  private isTab(value: string | null): value is ProviderPreauthTab {
    return Object.values(ProviderPreauthTab).includes(value as ProviderPreauthTab);
  }
}
