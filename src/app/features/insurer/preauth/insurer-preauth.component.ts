import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TreatmentCase } from '../../../core/models';

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
  ],
  templateUrl: './insurer-preauth.component.html',
  styleUrl: './insurer-preauth.component.scss',
})
export class InsurerPreauthComponent implements OnInit, OnDestroy {
  private readonly api = inject(InsurerApiService);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadPending();
  });

  treatments: TreatmentCase[] = [];
  loading = true;
  searchQuery = '';
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPending();
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  memberName(treatment: TreatmentCase): string {
    const name = [treatment.memberFirstName, treatment.memberLastName].filter(Boolean).join(' ').trim();
    return name || 'Unknown member';
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page = 1;
    this.loadPending();
  }

  private loadPending(): void {
    this.loading = true;
    this.api.getPendingPreauth({
      page: this.page,
      limit: this.limit,
      search: this.searchQuery,
    }).subscribe({
      next: (res) => {
        this.treatments = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.page = res.meta.page;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load pending preauthorizations.';
        this.loading = false;
      },
    });
  }
}
