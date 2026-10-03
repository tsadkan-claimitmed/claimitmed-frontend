import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PolicyApiService } from '../../../core/services/policy-api.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import {
  Benefit,
  MedicalService,
  PolicyCoverageDetailItem,
  PolicyDetail,
  PolicyOrgSummary,
} from '../../../core/models';
import { CoverageLimitModel, CoverageScope, PolicyNetworkType } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { formatEnumLabel, formatOrgAddress } from './policy-detail.utils';
import {
  PolicyPortal,
  PolicyPortalConfig,
  getPolicyPortalConfig,
  policyPortalFromUserType,
} from './policy-portal.config';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DatePipe,
    CurrencyPipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './policy-detail.component.html',
  styleUrl: './policy-detail.component.scss',
})
export class PolicyDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PolicyApiService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  private readonly route = inject(ActivatedRoute);

  @Input() portal?: PolicyPortal;
  @Input() backPath?: string;

  policy: PolicyDetail | null = null;
  loading = true;
  savingPolicy = false;
  savingCoverage = false;
  addingCoverage = false;
  errorMessage = '';
  portalConfig!: PolicyPortalConfig;
  readonly coverageScopes = [CoverageScope.INDIVIDUAL, CoverageScope.FAMILY, CoverageScope.ALL];
  readonly coverageLimitModels = [CoverageLimitModel.PER_BENEFIT, CoverageLimitModel.POLICY_WALLET];
  readonly policyNetworkTypes = [
    PolicyNetworkType.IN_NETWORK,
    PolicyNetworkType.OUT_OF_NETWORK,
    PolicyNetworkType.IN_AND_OUT_OF_NETWORK,
  ];
  readonly CoverageLimitModel = CoverageLimitModel;
  activeTab: 'overview' | 'coverage' = 'overview';

  editingPolicy = false;
  confirmPolicySave = false;
  editingCoverage = false;
  confirmCoverageSave = false;
  showAddCoverageForm = false;
  coverageDraft: PolicyCoverageDetailItem[] = [];
  coverageActionLoadingId: string | null = null;
  confirmCoverageAction: 'deactivate' | 'remove' | null = null;
  pendingCoverageRow: PolicyCoverageDetailItem | null = null;
  bulkPreauthByServiceId: Record<string, boolean> = {};
  bulkSelectedServiceIds = new Set<string>();

  benefits: Benefit[] = [];
  medicalServices: MedicalService[] = [];
  catalogsLoaded = false;

  policyForm = this.fb.group({
    policyName: ['', Validators.required],
    effectiveDate: [''],
    expiryDate: [''],
    status: ['ACTIVE', Validators.required],
    coverageLimitModel: [CoverageLimitModel.PER_BENEFIT, Validators.required],
    annualLimit: [null as number | null],
    coverageScope: [''],
    networkType: [PolicyNetworkType.IN_NETWORK, Validators.required],
  });

  addCoverageForm = this.fb.group({
    benefitId: [''],
    medicalServiceId: [''],
    annualLimit: [0],
    coverageScope: [CoverageScope.INDIVIDUAL],
    requiresPreauthorization: [false],
  });

  ngOnInit(): void {
    const resolvedPortal = this.portal ?? policyPortalFromUserType(this.auth.currentUser?.userType);
    const insurerId = this.route.snapshot.queryParamMap.get('insurerId') ?? undefined;
    this.portalConfig = getPolicyPortalConfig(resolvedPortal, { insurerId });

    const policyId = this.route.snapshot.paramMap.get('id');
    if (!policyId) {
      this.errorMessage = 'Policy ID is missing.';
      this.loading = false;
      return;
    }
    this.loadPolicy(policyId);
    if (this.portalConfig.canManageCoverage) {
      this.loadCatalogs();
    }
  }

  get resolvedBackPath(): string {
    return this.backPath ?? this.portalConfig.defaultBackPath;
  }

  formatAddress(org: PolicyOrgSummary): string {
    return formatOrgAddress(org);
  }

  formatEnum = formatEnumLabel;

  isWalletPolicy(): boolean {
    return this.policy?.coverageLimitModel === CoverageLimitModel.POLICY_WALLET;
  }

  walletLimitDisplay(): string {
    if (!this.policy?.annualLimit) return '—';
    return Number(this.policy.annualLimit).toLocaleString('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 0,
    });
  }

  onPolicyModelChange(): void {
    const isWallet = this.policyForm.controls.coverageLimitModel.value === CoverageLimitModel.POLICY_WALLET;
    const annualLimit = this.policyForm.controls.annualLimit;
    const coverageScope = this.policyForm.controls.coverageScope;
    if (isWallet) {
      annualLimit.setValidators([Validators.required, Validators.min(0)]);
      coverageScope.setValidators([Validators.required]);
    } else {
      annualLimit.clearValidators();
      coverageScope.clearValidators();
    }
    annualLimit.updateValueAndValidity();
    coverageScope.updateValueAndValidity();
  }

  preauthCount(): number {
    return this.activeCoverage().filter((row) => row.requiresPreauthorization).length;
  }

  activeCoverage(): PolicyCoverageDetailItem[] {
    return (this.policy?.coverage ?? []).filter((row) => !this.isCoverageInactive(row));
  }

  coveredServicesCount(): number {
    return this.activeCoverage().length;
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  setTab(tab: 'overview' | 'coverage'): void {
    if (tab === 'coverage' && this.editingPolicy) {
      this.cancelPolicyEdit();
    }
    if (tab === 'overview' && (this.editingCoverage || this.showAddCoverageForm)) {
      this.cancelCoverageEdit();
      this.cancelAddCoverage();
    }
    this.activeTab = tab;
  }

  startPolicyEdit(): void {
    if (!this.policy) return;
    this.editingPolicy = true;
    this.policyForm.patchValue({
      policyName: this.policy.policyName,
      effectiveDate: this.policy.effectiveDate ?? '',
      expiryDate: this.policy.expiryDate ?? '',
      status: this.policy.status,
      coverageLimitModel: (this.policy.coverageLimitModel ?? CoverageLimitModel.PER_BENEFIT) as CoverageLimitModel,
      annualLimit: this.policy.annualLimit ? Number(this.policy.annualLimit) : null,
      coverageScope: this.policy.coverageScope ?? '',
      networkType: (this.policy.networkType ?? PolicyNetworkType.IN_NETWORK) as PolicyNetworkType,
    });
    this.onPolicyModelChange();
  }

  cancelPolicyEdit(): void {
    this.editingPolicy = false;
    this.confirmPolicySave = false;
    if (this.policy) {
      this.policyForm.patchValue({
        policyName: this.policy.policyName,
        effectiveDate: this.policy.effectiveDate ?? '',
        expiryDate: this.policy.expiryDate ?? '',
        status: this.policy.status,
        coverageLimitModel: (this.policy.coverageLimitModel ?? CoverageLimitModel.PER_BENEFIT) as CoverageLimitModel,
        annualLimit: this.policy.annualLimit ? Number(this.policy.annualLimit) : null,
        coverageScope: this.policy.coverageScope ?? '',
      });
      this.onPolicyModelChange();
    }
  }

  requestPolicySave(): void {
    if (!this.policy || this.policyForm.invalid) return;
    this.confirmPolicySave = true;
  }

  confirmSavePolicy(): void {
    if (!this.policy || this.policyForm.invalid) return;
    this.savingPolicy = true;
    this.errorMessage = '';
    const value = this.policyForm.getRawValue();
    this.api.updatePolicy(this.policy.id, {
      policyName: value.policyName ?? undefined,
      effectiveDate: value.effectiveDate || undefined,
      expiryDate: value.expiryDate || undefined,
      status: value.status ?? undefined,
      coverageLimitModel: value.coverageLimitModel ?? undefined,
      annualLimit: value.annualLimit ?? undefined,
      coverageScope: value.coverageScope || undefined,
      networkType: value.networkType ?? undefined,
    }).subscribe({
      next: () => {
        this.savingPolicy = false;
        this.confirmPolicySave = false;
        this.editingPolicy = false;
        this.snackbar.success('Policy details saved successfully.');
        this.loadPolicy(this.policy!.id);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to save policy.';
        this.savingPolicy = false;
      },
    });
  }

  startCoverageEdit(): void {
    this.showAddCoverageForm = false;
    this.coverageDraft = structuredClone(
      (this.policy?.coverage ?? []).filter((row) => !this.isCoverageInactive(row)),
    );
    this.editingCoverage = true;
  }

  cancelCoverageEdit(): void {
    this.editingCoverage = false;
    this.confirmCoverageSave = false;
    this.coverageDraft = [];
  }

  requestCoverageSave(): void {
    if (!this.policy || this.coverageDraft.length === 0) return;
    this.confirmCoverageSave = true;
  }

  confirmSaveCoverage(): void {
    if (!this.policy || this.coverageDraft.length === 0) return;
    this.savingCoverage = true;
    this.errorMessage = '';

    const updates = this.coverageDraft.map((row) =>
      this.api.updateCoverage(this.policy!.id, row.id, this.isWalletPolicy()
        ? { requiresPreauthorization: row.requiresPreauthorization }
        : {
            annualLimit: this.lineAmount(row.annualLimit),
            coverageScope: row.coverageScope ?? undefined,
            requiresPreauthorization: row.requiresPreauthorization,
          }),
    );

    forkJoin(updates).subscribe({
      next: () => {
        this.savingCoverage = false;
        this.confirmCoverageSave = false;
        this.editingCoverage = false;
        this.coverageDraft = [];
        this.snackbar.success('Coverage rules saved successfully.');
        this.loadPolicy(this.policy!.id);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to save coverage rules.';
        this.savingCoverage = false;
      },
    });
  }

  openAddCoverageForm(): void {
    this.editingCoverage = false;
    this.coverageDraft = [];
    this.showAddCoverageForm = true;
    this.resetAddCoverageForm();
    this.resetBulkCoverageSelection();
    this.errorMessage = '';
  }

  private resetBulkCoverageSelection(): void {
    this.bulkSelectedServiceIds = new Set();
    this.bulkPreauthByServiceId = {};
    for (const service of this.availableBulkServices()) {
      this.bulkPreauthByServiceId[service.id] = false;
    }
  }

  availableBulkServices(): MedicalService[] {
    if (!this.catalogsLoaded) return [];
    const benefitId = this.addCoverageForm.controls.benefitId.value;
    return this.medicalServices.filter((service) => {
      if (this.isWalletPolicy()) {
        return !this.isServiceTaken(service.id);
      }
      if (!benefitId) return true;
      return !this.isCoverageCombinationTaken(benefitId, service.id);
    });
  }

  allBulkServicesSelected(): boolean {
    const available = this.availableBulkServices();
    return available.length > 0 && available.every((service) => this.bulkSelectedServiceIds.has(service.id));
  }

  someBulkServicesSelected(): boolean {
    return this.bulkSelectedServiceIds.size > 0 && !this.allBulkServicesSelected();
  }

  toggleSelectAllBulk(checked: boolean): void {
    const next = new Set(this.bulkSelectedServiceIds);
    for (const service of this.availableBulkServices()) {
      if (checked) {
        next.add(service.id);
      } else {
        next.delete(service.id);
      }
    }
    this.bulkSelectedServiceIds = next;
  }

  toggleBulkService(serviceId: string, checked: boolean): void {
    const next = new Set(this.bulkSelectedServiceIds);
    if (checked) {
      next.add(serviceId);
    } else {
      next.delete(serviceId);
    }
    this.bulkSelectedServiceIds = next;
  }

  isBulkServiceSelected(serviceId: string): boolean {
    return this.bulkSelectedServiceIds.has(serviceId);
  }

  onBulkBenefitChange(): void {
    this.resetBulkCoverageSelection();
  }

  selectedBulkCount(): number {
    return this.bulkSelectedServiceIds.size;
  }

  private resetAddCoverageForm(): void {
    if (this.isWalletPolicy()) {
      this.addCoverageForm.reset({
        benefitId: '',
        medicalServiceId: '',
        annualLimit: 0,
        coverageScope: CoverageScope.INDIVIDUAL,
        requiresPreauthorization: false,
      });
      this.addCoverageForm.controls.benefitId.clearValidators();
      this.addCoverageForm.controls.annualLimit.clearValidators();
      this.addCoverageForm.controls.coverageScope.clearValidators();
    } else {
      this.addCoverageForm.reset({
        benefitId: '',
        medicalServiceId: '',
        annualLimit: 0,
        coverageScope: CoverageScope.INDIVIDUAL,
        requiresPreauthorization: false,
      });
      this.addCoverageForm.controls.benefitId.setValidators([Validators.required]);
      this.addCoverageForm.controls.annualLimit.setValidators([Validators.required, Validators.min(0)]);
      this.addCoverageForm.controls.coverageScope.setValidators([Validators.required]);
    }
    this.addCoverageForm.controls.benefitId.updateValueAndValidity();
    this.addCoverageForm.controls.annualLimit.updateValueAndValidity();
    this.addCoverageForm.controls.coverageScope.updateValueAndValidity();
  }

  cancelAddCoverage(): void {
    this.showAddCoverageForm = false;
    this.resetAddCoverageForm();
    this.bulkSelectedServiceIds = new Set();
    this.bulkPreauthByServiceId = {};
  }

  submitAddCoverage(): void {
    if (!this.policy) return;

    if (this.bulkSelectedServiceIds.size === 0) {
      this.errorMessage = 'Select at least one service to add.';
      return;
    }

    if (!this.isWalletPolicy() && this.addCoverageForm.invalid) {
      this.addCoverageForm.markAllAsTouched();
      return;
    }

    this.addingCoverage = true;
    this.errorMessage = '';

    const services = [...this.bulkSelectedServiceIds].map((medicalServiceId) => ({
      medicalServiceId,
      requiresPreauthorization: !!this.bulkPreauthByServiceId[medicalServiceId],
    }));

    const value = this.addCoverageForm.getRawValue();
    const payload = this.isWalletPolicy()
      ? { services }
      : {
          benefitId: value.benefitId!,
          annualLimit: Number(value.annualLimit ?? 0),
          coverageScope: value.coverageScope ?? CoverageScope.INDIVIDUAL,
          services,
        };

    this.api.createBulkCoverage(this.policy.id, payload).subscribe({
      next: (result) => {
        this.addingCoverage = false;
        this.showAddCoverageForm = false;
        const skipped = result.skippedCount > 0 ? ` (${result.skippedCount} already on policy)` : '';
        this.snackbar.success(`${result.created.length} service(s) added to the policy${skipped}.`);
        this.loadPolicy(this.policy!.id);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to add coverage rules.';
        this.addingCoverage = false;
      },
    });
  }

  isCoverageCombinationTaken(benefitId: string, medicalServiceId: string): boolean {
    return (this.policy?.coverage ?? []).some(
      (row) => row.benefitId === benefitId && row.medicalServiceId === medicalServiceId,
    );
  }

  isServiceTaken(medicalServiceId: string): boolean {
    return (this.policy?.coverage ?? []).some((row) => row.medicalServiceId === medicalServiceId);
  }

  benefitLabel(benefit: Benefit): string {
    return `${benefit.name} (${benefit.benefitCode})`;
  }

  serviceLabel(service: MedicalService): string {
    return `${service.serviceName} (${service.serviceCode})`;
  }

  isCoverageInactive(row: PolicyCoverageDetailItem): boolean {
    return row.status === 'INACTIVE';
  }

  requestDeactivateCoverage(row: PolicyCoverageDetailItem): void {
    this.pendingCoverageRow = row;
    this.confirmCoverageAction = 'deactivate';
    this.errorMessage = '';
  }

  requestRemoveCoverage(row: PolicyCoverageDetailItem): void {
    this.pendingCoverageRow = row;
    this.confirmCoverageAction = 'remove';
    this.errorMessage = '';
  }

  cancelCoverageAction(): void {
    this.confirmCoverageAction = null;
    this.pendingCoverageRow = null;
  }

  confirmCoverageActionSubmit(): void {
    if (!this.policy || !this.pendingCoverageRow || !this.confirmCoverageAction) return;

    const row = this.pendingCoverageRow;
    this.coverageActionLoadingId = row.id;
    this.errorMessage = '';

    if (this.confirmCoverageAction === 'remove') {
      this.api.deleteCoverage(this.policy.id, row.id).subscribe({
        next: () => {
          this.coverageActionLoadingId = null;
          this.confirmCoverageAction = null;
          this.pendingCoverageRow = null;
          this.snackbar.success('Coverage rule removed from the policy.');
          this.loadPolicy(this.policy!.id);
        },
        error: (err) => {
          this.errorMessage = err.userMessage ?? 'Failed to remove coverage rule.';
          this.coverageActionLoadingId = null;
        },
      });
      return;
    }

    this.api.updateCoverage(this.policy.id, row.id, { status: 'INACTIVE' }).subscribe({
      next: () => {
        this.coverageActionLoadingId = null;
        this.confirmCoverageAction = null;
        this.pendingCoverageRow = null;
        this.snackbar.success('Coverage rule deactivated.');
        this.loadPolicy(this.policy!.id);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to deactivate coverage rule.';
        this.coverageActionLoadingId = null;
      },
    });
  }

  reactivateCoverage(row: PolicyCoverageDetailItem): void {
    if (!this.policy) return;
    this.coverageActionLoadingId = row.id;
    this.errorMessage = '';
    this.api.updateCoverage(this.policy.id, row.id, { status: 'ACTIVE' }).subscribe({
      next: () => {
        this.coverageActionLoadingId = null;
        this.snackbar.success('Coverage rule reactivated.');
        this.loadPolicy(this.policy!.id);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to reactivate coverage rule.';
        this.coverageActionLoadingId = null;
      },
    });
  }

  private loadCatalogs(): void {
    forkJoin({
      benefits: this.api.listBenefits(),
      medicalServices: this.api.listMedicalServices(),
    }).subscribe({
      next: ({ benefits, medicalServices }) => {
        this.benefits = benefits;
        this.medicalServices = medicalServices;
        this.catalogsLoaded = true;
        if (this.showAddCoverageForm) {
          this.resetBulkCoverageSelection();
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load benefits and services catalog.';
      },
    });
  }

  private loadPolicy(id: string): void {
    this.loading = true;
    this.api.getPolicyDetail(id).subscribe({
      next: (policy) => {
        this.policy = policy;
        this.policyForm.patchValue({
          policyName: policy.policyName,
          effectiveDate: policy.effectiveDate ?? '',
          expiryDate: policy.expiryDate ?? '',
          status: policy.status,
          coverageLimitModel: (policy.coverageLimitModel ?? CoverageLimitModel.PER_BENEFIT) as CoverageLimitModel,
          annualLimit: policy.annualLimit ? Number(policy.annualLimit) : null,
          coverageScope: policy.coverageScope ?? '',
          networkType: (policy.networkType ?? PolicyNetworkType.IN_NETWORK) as PolicyNetworkType,
        });
        this.onPolicyModelChange();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Policy not found or access denied.';
        this.loading = false;
      },
    });
  }
}
