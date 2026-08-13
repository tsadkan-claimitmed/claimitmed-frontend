import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { TreatmentCase } from '../../../core/models';

@Component({
  selector: 'app-provider-treatments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CurrencyPipe],
  templateUrl: './provider-treatments.component.html',
})
export class ProviderTreatmentsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProviderApiService);

  step: 'create' | 'items' | 'complete' = 'create';
  treatment: TreatmentCase | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  createForm = this.fb.group({
    memberId: ['', Validators.required],
    treatmentReference: [''],
    treatingPhysician: [''],
  });

  itemForm = this.fb.group({
    medicalServiceId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
  });

  createTreatment(): void {
    if (this.createForm.invalid) return;
    this.loading = true;
    this.api.createTreatment(this.createForm.getRawValue() as never).subscribe({
      next: (t) => { this.treatment = t; this.step = 'items'; this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage; this.loading = false; },
    });
  }

  addItem(): void {
    if (!this.treatment || this.itemForm.invalid) return;
    const { quantity, unitPrice } = this.itemForm.getRawValue();
    this.loading = true;
    this.api.addTreatmentItem(this.treatment.id, {
      ...this.itemForm.getRawValue(),
      totalPrice: quantity! * unitPrice!,
    } as never).subscribe({
      next: (t) => { this.treatment = t; this.itemForm.reset({ quantity: 1, unitPrice: 0 }); this.loading = false; },
      error: (err) => { this.errorMessage = err.userMessage; this.loading = false; },
    });
  }

  completeTreatment(): void {
    if (!this.treatment) return;
    this.loading = true;
    this.api.completeTreatment(this.treatment.id).subscribe({
      next: () => {
        this.successMessage = 'Treatment completed! A draft claim has been created.';
        this.step = 'complete';
        this.loading = false;
      },
      error: (err) => { this.errorMessage = err.userMessage; this.loading = false; },
    });
  }
}
