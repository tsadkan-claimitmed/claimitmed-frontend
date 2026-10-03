import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { PolicyApiService } from '../../../core/services/policy-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { MemberListItem, PolicyListItem } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

type SortableMemberField = 'memberNumber' | 'firstName' | 'lastName' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-insurer-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './insurer-members.component.html',
  styleUrl: './insurer-members.component.scss',
})
export class InsurerMembersComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly policyApi = inject(PolicyApiService);
  private readonly router = inject(Router);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadMembers();
  });

  members: MemberListItem[] = [];
  policies: PolicyListItem[] = [];
  loading = true;
  errorMessage = '';

  searchQuery = '';
  filterPolicyId = '';
  filterStatus = '';
  filterRelationship = '';
  page = 1;
  limit = 15;
  total = 0;
  totalPages = 1;
  sortColumn: SortableMemberField = 'createdAt';
  sortDirection: SortDirection = 'desc';

  readonly statusOptions = ['', 'ACTIVE', 'INACTIVE', 'TERMINATED'];
  readonly relationshipOptions = [
    { value: '', label: 'All relationships' },
    { value: 'PRIMARY', label: 'Primary' },
    { value: 'SPOUSE', label: 'Spouse' },
    { value: 'CHILD', label: 'Child' },
  ];

  ngOnInit(): void {
    this.loadPolicies();
    this.loadMembers();
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

  onSearchInput(value: string): void {
    this.searchHandler.update(value);
  }

  onFiltersChanged(): void {
    this.page = 1;
    this.loadMembers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterPolicyId = '';
    this.filterStatus = '';
    this.filterRelationship = '';
    this.page = 1;
    this.searchHandler.clear();
    this.loadMembers();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.filterPolicyId || this.filterStatus || this.filterRelationship);
  }

  toggleSort(column: SortableMemberField): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadMembers();
  }

  sortIndicator(column: SortableMemberField): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  openMember(member: MemberListItem): void {
    void this.router.navigate(['/portal/insurer/members', member.id]);
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    this.loadMembers();
  }

  memberName(member: MemberListItem): string {
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
    return name || member.memberNumber;
  }

  private loadPolicies(): void {
    this.policyApi.listPolicies().subscribe({
      next: (policies) => { this.policies = policies; },
    });
  }

  private loadMembers(): void {
    this.loading = true;
    this.errorMessage = '';
    const sortPrefix = this.sortDirection === 'desc' ? '-' : '';
    this.api.getMembers({
      page: this.page,
      limit: this.limit,
      search: this.searchQuery || undefined,
      policyId: this.filterPolicyId || undefined,
      status: this.filterStatus || undefined,
      relationshipType: this.filterRelationship || undefined,
      sort: `${sortPrefix}${this.sortColumn}`,
    }).subscribe({
      next: (res) => {
        this.members = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load members.';
        this.loading = false;
      },
    });
  }
}
