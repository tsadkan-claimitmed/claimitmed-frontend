import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';

@Component({
  selector: 'app-member-reimbursement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './member-reimbursement.component.html',
})
export class MemberReimbursementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MemberApiService);
  private readonly router = inject(Router);

  loading = false;
  success = false;
  errorMessage = '';

  form = this.fb.group({
    medicalServiceId: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { medicalServiceId, amount, description } = this.form.getRawValue();
    this.api.createReimbursement({
      medicalServiceId: medicalServiceId!,
      amount: amount!,
      description: description!,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/portal/member/claims']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.userMessage ?? 'Failed to create reimbursement request.';
      },
    });
  }
}
