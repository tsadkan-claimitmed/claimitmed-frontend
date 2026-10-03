import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PolicyApiService } from '../../../core/services/policy-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { PolicyListItem } from '../../../core/models';
import { CoverageLimitModel, CoverageScope, PolicyNetworkType } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { EmployerSearchSelectComponent } from '../../components/employer-search-select/employer-search-select.component';
import {
  PolicyPortal,
  PolicyPortalConfig,
  getPolicyPortalConfig,
  policyPortalFromUserType,
} from './policy-portal.config';

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    EmployerSearchSelectComponent,
  ],
  templateUrl: './policy-list.component.html',
  styleUrl: './policy-list.component.scss',
})
export class PolicyListComponent implements OnInit, OnDestroy {
  private readonly api = inject(PolicyApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.appliedSearch = query;
    this.loadPolicies();
  });

  @Input() portal?: PolicyPortal;
  @Input() insuranceCompanyId?: string;
  @Input() embedded = false;
  @Input() pageTitle = 'Policies';
  @Input() subtitle = 'Browse and manage insurance policies';

  policies: PolicyListItem[] = [];
  loading = true;
  errorMessage = '';
  searchQuery = '';
  appliedSearch = '';
  statusFilter = '';
  effectiveFrom = '';
  effectiveTo = '';
  portalConfig!: PolicyPortalConfig;

  showCreateForm = false;
  creatingPolicy = false;
  createErrorMessage = '';
  readonly policyStatuses = ['ACTIVE', 'INACTIVE', 'EXPIRED'];
  readonly coverageLimitModels = [CoverageLimitModel.PER_BENEFIT, CoverageLimitModel.POLICY_WALLET];
  readonly coverageScopes = [CoverageScope.INDIVIDUAL, CoverageScope.FAMILY, CoverageScope.ALL];
  readonly policyNetworkTypes = [
    PolicyNetworkType.IN_NETWORK,
    PolicyNetworkType.OUT_OF_NETWORK,
    PolicyNetworkType.IN_AND_OUT_OF_NETWORK,
  ];
  readonly CoverageLimitModel = CoverageLimitModel;

  createForm = this.fb.group({
    employerId: ['', Validators.required],
    policyNumber: ['', Validators.required],
    policyName: ['', Validators.required],
    effectiveDate: [''],
    expiryDate: [''],
    status: ['ACTIVE', Validators.required],
    insuranceCompanyId: [''],
    coverageLimitModel: [CoverageLimitModel.PER_BENEFIT, Validators.required],
    annualLimit: [null as number | null],
    coverageScope: [''],
    networkType: [PolicyNetworkType.IN_NETWORK, Validators.required],
  });

  ngOnInit(): void {
    const resolvedPortal = this.portal ?? policyPortalFromUserType(this.auth.currentUser?.userType);
    this.portalConfig = getPolicyPortalConfig(resolvedPortal, {
      insurerId: this.insuranceCompanyId,
    });
    this.loadPolicies();
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchHandler.update(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.appliedSearch = '';
    this.loadPolicies();
  }

  onFiltersChanged(): void {
    this.loadPolicies();
  }

  openPolicy(policy: PolicyListItem): void {
    void this.router.navigate([this.portalConfig.policyDetailPath(policy.id)], {
      queryParams: this.insuranceCompanyId ? { insurerId: this.insuranceCompanyId } : undefined,
    });
  }

  openPolicyEdit(event: Event, policy: PolicyListItem): void {
    event.stopPropagation();
    this.openPolicy(policy);
  }

  formatEnumLabel(value: string): string {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  isWalletCreate(): boolean {
    return this.createForm.controls.coverageLimitModel.value === CoverageLimitModel.POLICY_WALLET;
  }

  onCreateModelChange(): void {
    const isWallet = this.isWalletCreate();
    const annualLimit = this.createForm.controls.annualLimit;
    const coverageScope = this.createForm.controls.coverageScope;
    if (isWallet) {
      annualLimit.setValidators([Validators.required, Validators.min(0)]);
      coverageScope.setValidators([Validators.required]);
    } else {
      annualLimit.clearValidators();
      coverageScope.clearValidators();
      annualLimit.setValue(null);
      coverageScope.setValue('');
    }
    annualLimit.updateValueAndValidity();
    coverageScope.updateValueAndValidity();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createErrorMessage = '';
    if (this.showCreateForm) {
      this.createForm.reset({
        employerId: '',
        policyNumber: '',
        policyName: '',
        effectiveDate: '',
        expiryDate: '',
        status: 'ACTIVE',
        insuranceCompanyId: this.insuranceCompanyId ?? '',
        coverageLimitModel: CoverageLimitModel.PER_BENEFIT,
        annualLimit: null,
        coverageScope: '',
        networkType: PolicyNetworkType.IN_NETWORK,
      });
      this.onCreateModelChange();
    }
  }

  submitCreatePolicy(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.creatingPolicy = true;
    this.createErrorMessage = '';

    this.api.createPolicy({
      employerId: value.employerId!,
      policyNumber: value.policyNumber!.trim(),
      policyName: value.policyName!.trim(),
      effectiveDate: value.effectiveDate || undefined,
      expiryDate: value.expiryDate || undefined,
      status: value.status || 'ACTIVE',
      insuranceCompanyId: value.insuranceCompanyId || undefined,
      coverageLimitModel: value.coverageLimitModel || CoverageLimitModel.PER_BENEFIT,
      annualLimit: value.annualLimit ?? undefined,
      coverageScope: value.coverageScope || undefined,
      networkType: value.networkType || PolicyNetworkType.IN_NETWORK,
    }).subscribe({
      next: () => {
        this.creatingPolicy = false;
        this.showCreateForm = false;
        this.loadPolicies();
      },
      error: (err) => {
        this.createErrorMessage = err.userMessage ?? 'Failed to create policy.';
        this.creatingPolicy = false;
      },
    });
  }

  reload(): void {
    this.loadPolicies();
  }

  private loadPolicies(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.listPolicies({
      insuranceCompanyId: this.insuranceCompanyId,
      status: this.statusFilter || undefined,
      search: this.appliedSearch || undefined,
      effectiveFrom: this.effectiveFrom || undefined,
      effectiveTo: this.effectiveTo || undefined,
    }).subscribe({
      next: (policies) => {
        this.policies = policies;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load policies.';
        this.loading = false;
      },
    });
  }
}
