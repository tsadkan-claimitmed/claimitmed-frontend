import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { TreatmentDetail, TreatmentItem } from '../../../core/models';
import { PreauthStatus, TreatmentCaseStatus, TreatmentListTab } from '../../../core/models/enums';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ServiceSearchSelectComponent } from '../../../shared/components/service-search-select/service-search-select.component';

@Component({
  selector: 'app-provider-treatment-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CurrencyPipe,
    DatePipe,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    ServiceSearchSelectComponent,
  ],
  templateUrl: './provider-treatment-detail.component.html',
  styleUrl: './provider-treatment-detail.component.scss',
})
export class ProviderTreatmentDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);
  private readonly route = inject(ActivatedRoute);

  treatment: TreatmentDetail | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  readonly PreauthStatus = PreauthStatus;
  readonly TreatmentCaseStatus = TreatmentCaseStatus;
  readonly TreatmentListTab = TreatmentListTab;

  itemForm = this.fb.group({
    medicalServiceId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
  });

  feeLoading = false;
  selectedServiceRequiresPreauth = false;
  pendingRemoveItem: TreatmentItem | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Treatment ID is missing.';
      this.loading = false;
      return;
    }
    this.loadTreatment(id);
  }

  get isOpen(): boolean {
    return this.treatment?.status === TreatmentCaseStatus.OPEN;
  }

  patientName(): string {
    if (!this.treatment) return '—';
    const name = [this.treatment.patient.firstName, this.treatment.patient.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || '—';
  }

  preauthItemsCount(): number {
    return (this.treatment?.items ?? []).filter((item) => item.requiresPreauth).length;
  }

  canComplete(): boolean {
    return Boolean(this.isOpen && this.treatment?.items?.length) &&
      this.treatment?.preauthStatus !== PreauthStatus.PENDING &&
      this.treatment?.preauthStatus !== PreauthStatus.DENIED;
  }

  treatmentsListTab(): TreatmentListTab {
    if (this.treatment?.status === TreatmentCaseStatus.COMPLETED) {
      return TreatmentListTab.COMPLETED;
    }
    if (
      this.treatment?.preauthStatus === PreauthStatus.PENDING
      || this.treatment?.preauthStatus === PreauthStatus.DENIED
    ) {
      return TreatmentListTab.REQUIRES_PREAUTH;
    }
    return TreatmentListTab.IN_PROGRESS;
  }

  formatEnum(value: string): string {
    return value.replaceAll('_', ' ');
  }

  lineAmount(value: number | string | null | undefined): number {
    return Number(value ?? 0);
  }

  onServiceSelected(medicalServiceId: string): void {
    this.populateAgreedFee(medicalServiceId);
  }

  itemLabel(item: TreatmentItem): string {
    return item.serviceName || item.serviceCode || item.medicalServiceId;
  }

  promptRemoveItem(item: TreatmentItem): void {
    this.pendingRemoveItem = item;
  }

  cancelRemoveItem(): void {
    this.pendingRemoveItem = null;
  }

  confirmRemoveItem(): void {
    const item = this.pendingRemoveItem;
    if (!this.treatment || !item || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.pendingRemoveItem = null;
    this.api.removeTreatmentItem(this.treatment.id, item.id).subscribe({
      next: () => {
        this.successMessage = item.requiresPreauth
          ? 'Service removed. Preauthorization hold lifted for this treatment.'
          : 'Service removed.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to remove service.';
        this.saving = false;
      },
    });
  }

  addItem(): void {
    if (!this.treatment || this.itemForm.invalid) return;
    const { quantity, unitPrice, medicalServiceId } = this.itemForm.getRawValue();
    this.saving = true;
    this.errorMessage = '';
    this.api.addTreatmentItem(this.treatment.id, {
      medicalServiceId: medicalServiceId!,
      quantity: quantity!,
      unitPrice: unitPrice!,
      totalPrice: quantity! * unitPrice!,
    }).subscribe({
      next: () => {
        this.loadTreatment(this.treatment!.id, false);
        this.itemForm.reset({ quantity: 1, unitPrice: 0 });
        this.selectedServiceRequiresPreauth = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to add item.';
        this.saving = false;
      },
    });
  }

  completeTreatment(): void {
    if (!this.treatment) return;
    this.saving = true;
    this.errorMessage = '';
    this.api.completeTreatment(this.treatment.id).subscribe({
      next: () => {
        this.successMessage = 'Treatment completed and draft claim created.';
        this.loadTreatment(this.treatment!.id, false);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Unable to complete treatment.';
        this.loadTreatment(this.treatment!.id, false);
      },
    });
  }

  private loadTreatment(id: string, showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.api.getTreatment(id).subscribe({
      next: (treatment) => {
        this.treatment = treatment;
        this.loading = false;
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'Treatment not found.';
        this.loading = false;
        this.saving = false;
      },
    });
  }

  private populateAgreedFee(medicalServiceId: string): void {
    const memberId = this.treatment?.memberId;
    if (!memberId || !medicalServiceId) return;

    this.feeLoading = true;
    this.selectedServiceRequiresPreauth = false;
    this.api.getServiceFee(memberId, medicalServiceId).subscribe({
      next: (fee) => {
        if (fee.agreedRate != null) {
          this.itemForm.patchValue({ unitPrice: Number(fee.agreedRate) });
        }
        this.selectedServiceRequiresPreauth = fee.requiresPreauth;
        this.feeLoading = false;
      },
      error: () => {
        this.selectedServiceRequiresPreauth = false;
        this.feeLoading = false;
      },
    });
  }
}
