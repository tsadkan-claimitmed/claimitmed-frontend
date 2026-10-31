import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DualRangeSliderComponent } from '../../../shared/components/dual-range-slider/dual-range-slider.component';
import { Claim, Insurer } from '../../../core/models';
import { ClaimStatus, PaymentResponsibility } from '../../../core/models/enums';
import { claimTypeLabel } from '../../../shared/utils/claim-type-label';

interface ClaimStatusTab {
  status: ClaimStatus;
  label: string;
}

type SortableClaimField = 'claimNumber' | 'requestedAmount' | 'createdAt' | 'submittedAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-insurer-claims',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    DualRangeSliderComponent,
  ],
  templateUrl: './insurer-claims.component.html',
  styleUrl: './insurer-claims.component.scss',
})
export class InsurerClaimsComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly debouncedSearch = inject(DebouncedSearchService);

  readonly showInsurerFilter = this.route.snapshot.data['showInsurerFilter'] === true;
  readonly claimsBasePath = this.route.snapshot.data['claimsBasePath'] ?? '/portal/insurer/claims';
  readonly pageTitle = this.route.snapshot.data['pageTitle'] ?? 'Claims';
  readonly pageSubtitle = this.route.snapshot.data['pageSubtitle']
    ?? 'Review, approve, reject, or request information on submitted claims';
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadClaims();
  });
  private amountRangeHandler = this.debouncedSearch.createDebouncedHandler(() => {
    this.page = 1;
    this.loadClaims();
  });

  readonly statusTabs: ClaimStatusTab[] = [
    { status: ClaimStatus.UNDER_REVIEW, label: 'Need Review' },
    { status: ClaimStatus.REIMBURSEMENT_REVIEW, label: 'Reimbursement' },
    { status: ClaimStatus.NEED_INFO, label: 'Need Info' },
    { status: ClaimStatus.REJECTED, label: 'Rejected' },
    { status: ClaimStatus.APPROVED, label: 'Approved' },
    { status: ClaimStatus.PAID, label: 'Paid' },
  ];

  readonly ClaimStatus = ClaimStatus;
  readonly PaymentResponsibility = PaymentResponsibility;

  readonly paymentTypeOptions: { value: string; label: string }[] = [
    { value: '', label: 'All types' },
    { value: PaymentResponsibility.INSURANCE_PAYS_PROVIDER, label: 'PROVIDER' },
    { value: PaymentResponsibility.MEMBER_PAID_CASH, label: 'MEMBER' },
  ];

  claims: Claim[] = [];
  insurers: Insurer[] = [];
  filterInsuranceCompanyId = '';
  loading = true;
  activeStatus = ClaimStatus.UNDER_REVIEW;
  searchQuery = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterPaymentType = '';
  amountFilterEnabled = false;
  amountBoundsMin = 0;
  amountBoundsMax = 100000;
  amountSelectedMin = 0;
  amountSelectedMax = 100000;
  amountBoundsLoading = false;
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  sortColumn: SortableClaimField = 'submittedAt';
  sortDirection: SortDirection = 'desc';

  ngOnInit(): void {
    if (this.showInsurerFilter) {
      this.filterInsuranceCompanyId = this.route.snapshot.queryParamMap.get('insuranceCompanyId') ?? '';
      this.api.getInsurers().subscribe({
        next: (insurers) => {
          this.insurers = insurers;
        },
      });
      this.route.queryParamMap.subscribe((params) => {
        const insuranceCompanyId = params.get('insuranceCompanyId') ?? '';
        if (insuranceCompanyId === this.filterInsuranceCompanyId) {
          return;
        }
        this.filterInsuranceCompanyId = insuranceCompanyId;
        this.page = 1;
        this.loadClaims();
      });
    }
    this.loadClaims();
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
    this.amountRangeHandler.destroy();
  }

  get amountFilterStep(): number {
    const span = this.amountBoundsMax - this.amountBoundsMin;
    if (span <= 1000) return 10;
    if (span <= 10000) return 100;
    return 500;
  }

  get isAmountFilterActive(): boolean {
    return this.amountFilterEnabled &&
      (this.amountSelectedMin > this.amountBoundsMin || this.amountSelectedMax < this.amountBoundsMax);
  }

  get showingFrom(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  selectTab(status: ClaimStatus): void {
    if (this.activeStatus === status) return;
    this.activeStatus = status;
    this.page = 1;
    if (this.amountFilterEnabled) {
      this.initializeAmountFilter(true);
      return;
    }
    this.loadClaims();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  onInsuranceCompanyChange(value: string): void {
    this.filterInsuranceCompanyId = value;
    this.page = 1;
    if (this.showInsurerFilter) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { insuranceCompanyId: value || null },
        queryParamsHandling: 'merge',
      });
    }
    if (this.amountFilterEnabled) {
      this.initializeAmountFilter(true);
      return;
    }
    this.loadClaims();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterPaymentType = '';
    this.filterInsuranceCompanyId = '';
    this.amountFilterEnabled = false;
    this.page = 1;
    if (this.showInsurerFilter) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { insuranceCompanyId: null },
        queryParamsHandling: 'merge',
      });
    }
    this.loadClaims();
  }

  onAmountFilterToggle(enabled: boolean): void {
    this.amountFilterEnabled = enabled;
    if (!enabled) {
      this.page = 1;
      this.loadClaims();
      return;
    }
    this.initializeAmountFilter(true);
  }

  onAmountRangeChange(range: { low: number; high: number }): void {
    this.amountSelectedMin = range.low;
    this.amountSelectedMax = range.high;
    if (!this.amountFilterEnabled) return;
    this.amountRangeHandler.update(`${range.low}:${range.high}`);
  }

  onPaymentTypeChange(value: string): void {
    this.filterPaymentType = value;
    this.page = 1;
    this.loadClaims();
  }

  paymentTypeLabel(claim: Claim): string {
    return claimTypeLabel(claim);
  }

  onDateFromChange(value: string): void {
    this.filterDateFrom = value;
    if (this.filterDateTo && value && value > this.filterDateTo) {
      this.filterDateTo = value;
    }
    this.page = 1;
    this.loadClaims();
  }

  onDateToChange(value: string): void {
    this.filterDateTo = value;
    if (this.filterDateFrom && value && value < this.filterDateFrom) {
      this.filterDateFrom = value;
    }
    this.page = 1;
    this.loadClaims();
  }

  clearDateRange(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.page = 1;
    this.loadClaims();
  }

  hasDateFilter(): boolean {
    return Boolean(this.filterDateFrom || this.filterDateTo);
  }

  hasActiveFilters(): boolean {
    return Boolean(
      this.searchQuery.trim() ||
      this.filterDateFrom ||
      this.filterDateTo ||
      this.filterPaymentType ||
      this.filterInsuranceCompanyId ||
      this.amountFilterEnabled,
    );
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    this.loadClaims();
  }

  toggleSort(column: SortableClaimField): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'requestedAmount' ? 'desc' : 'asc';
    }
    this.page = 1;
    this.loadClaims();
  }

  sortIndicator(column: SortableClaimField): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  openClaim(claim: Claim): void {
    void this.router.navigate([this.claimsBasePath, claim.id]);
  }

  fraudScoreClass(claim: Claim): string {
    const score = claim.fraudScore;
    if (score == null) return 'fraud-unknown';
    if (score > 50 || claim.fraudResult === 'HIGH_RISK') return 'fraud-high';
    if (score > 25 || claim.fraudResult === 'MEDIUM_RISK') return 'fraud-medium';
    return 'fraud-low';
  }

  fraudScoreLabel(claim: Claim): string {
    if (claim.fraudScore == null) return '—';
    const result = claim.fraudResult ? ` (${claim.fraudResult.replaceAll('_', ' ')})` : '';
    return `${claim.fraudScore}${result}`;
  }

  loadClaims(): void {
    this.loading = true;
    const sortPrefix = this.sortDirection === 'desc' ? '-' : '';
    this.api.getClaims({
      status: this.activeStatus,
      page: this.page,
      limit: this.limit,
      search: this.searchQuery,
      dateFrom: this.filterDateFrom || undefined,
      dateTo: this.filterDateTo || undefined,
      paymentResponsibility: this.filterPaymentType || undefined,
      minAmount: this.amountFilterEnabled ? this.amountSelectedMin : undefined,
      maxAmount: this.amountFilterEnabled ? this.amountSelectedMax : undefined,
      sort: `${sortPrefix}${this.sortColumn}`,
      insuranceCompanyId: this.filterInsuranceCompanyId || undefined,
    }).subscribe({
      next: (res) => {
        this.claims = res.data;
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

  emptyTitle(): string {
    if (this.hasActiveFilters()) return 'No matching claims';
    return `No ${this.activeTabLabel().toLowerCase()} claims`;
  }

  emptyMessage(): string {
    if (this.isAmountFilterActive && (this.filterPaymentType || this.hasDateFilter() || this.searchQuery.trim())) {
      return 'Try different filters or clear them to see more claims.';
    }
    if (this.isAmountFilterActive) {
      return 'No claims fall within this amount range for the selected status.';
    }
    if (this.filterPaymentType && (this.hasDateFilter() || this.searchQuery.trim())) {
      return 'Try different filters or clear them to see more claims.';
    }
    if (this.filterPaymentType) {
      return 'No claims match this payment type for the selected status.';
    }
    if (this.hasDateFilter() && this.searchQuery.trim()) {
      return 'Try a different date range or claim number.';
    }
    if (this.hasDateFilter()) return 'No claims found for this date range. Try different dates or clear the filter.';
    if (this.searchQuery.trim()) return 'Try a different claim number search.';
    return `Claims with ${this.activeTabLabel().toLowerCase()} status will appear here.`;
  }

  private activeTabLabel(): string {
    return this.statusTabs.find((tab) => tab.status === this.activeStatus)?.label ?? 'matching';
  }

  private initializeAmountFilter(reload: boolean): void {
    this.amountBoundsLoading = true;
    this.api.getClaimAmountBounds(this.activeStatus, this.filterInsuranceCompanyId || undefined).subscribe({
      next: (bounds) => {
        this.amountBoundsMin = bounds.min;
        this.amountBoundsMax = Math.max(bounds.max, bounds.min + this.amountFilterStep);
        this.amountSelectedMin = bounds.min;
        this.amountSelectedMax = bounds.max;
        this.amountBoundsLoading = false;
        if (reload) {
          this.page = 1;
          this.loadClaims();
        }
      },
      error: () => {
        this.amountBoundsMin = 0;
        this.amountBoundsMax = 100000;
        this.amountSelectedMin = 0;
        this.amountSelectedMax = 100000;
        this.amountBoundsLoading = false;
        if (reload) {
          this.page = 1;
          this.loadClaims();
        }
      },
    });
  }
}
