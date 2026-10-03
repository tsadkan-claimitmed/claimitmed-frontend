import { Component, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { MemberCoveredService } from '../../../core/models';

@Component({
  selector: 'app-member-reimbursement',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './member-reimbursement.component.html',
  styleUrl: './member-reimbursement.component.scss',
})
export class MemberReimbursementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(MemberApiService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly acceptFiles = 'image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

  loading = false;
  success = false;
  errorMessage = '';
  services: MemberCoveredService[] = [];
  selectedServiceIds = new Set<string>();
  serviceSearch = '';
  servicePickerOpen = false;
  selectedFiles: File[] = [];
  hasBankAccount: boolean | null = null;
  attemptedSubmit = false;
  coverageExpired = false;

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  serviceKey(service: MemberCoveredService): string {
    return service.medicalServiceId ?? service.id;
  }

  ngOnInit(): void {
    this.api.getPolicyOverview().subscribe({
      next: (overview) => {
        const status = overview.member?.status;
        this.coverageExpired = status === 'TERMINATED' || status === 'INACTIVE';
        const seen = new Set<string>();
        this.services = (overview.coveredServices ?? []).filter((service) => {
          const key = this.serviceKey(service);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load covered services.';
      },
    });
    this.api.getBankAccount().subscribe({
      next: (account) => {
        this.hasBankAccount = !!account;
      },
      error: () => {
        this.hasBankAccount = false;
      },
    });
  }

  filteredServices(): MemberCoveredService[] {
    const query = this.serviceSearch.trim().toLowerCase();
    if (!query) {
      return this.services;
    }
    return this.services.filter((service) => {
      const haystack = [
        service.serviceName,
        service.serviceCode,
        service.benefitName,
        service.benefitCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  selectedServices(): MemberCoveredService[] {
    return this.services.filter((service) => this.selectedServiceIds.has(this.serviceKey(service)));
  }

  servicePickerLabel(): string {
    const count = this.selectedServiceIds.size;
    if (count === 0) {
      return 'Search and select services on the receipt';
    }
    if (count === 1) {
      const [service] = this.selectedServices();
      return service ? `${service.serviceName} (${service.serviceCode})` : '1 service selected';
    }
    return `${count} services selected`;
  }

  toggleServicePicker(): void {
    if (!this.services.length) {
      return;
    }
    this.servicePickerOpen = !this.servicePickerOpen;
    if (this.servicePickerOpen) {
      this.serviceSearch = '';
    }
  }

  toggleService(serviceId: string, checked: boolean): void {
    const next = new Set(this.selectedServiceIds);
    if (checked) {
      next.add(serviceId);
    } else {
      next.delete(serviceId);
    }
    this.selectedServiceIds = next;
  }

  onServiceCheckboxChange(serviceId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toggleService(serviceId, input.checked);
  }

  isServiceSelected(serviceId: string): boolean {
    return this.selectedServiceIds.has(serviceId);
  }

  removeService(serviceId: string): void {
    const next = new Set(this.selectedServiceIds);
    next.delete(serviceId);
    this.selectedServiceIds = next;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const picker = this.elementRef.nativeElement.querySelector('.service-picker');
    if (picker && !picker.contains(event.target as Node)) {
      this.servicePickerOpen = false;
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    if (!incoming.length) {
      return;
    }

    const next = [...this.selectedFiles];
    for (const file of incoming) {
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = `${file.name} is larger than 10 MB.`;
        continue;
      }
      if (next.length >= 10) {
        this.errorMessage = 'You can attach up to 10 receipts.';
        break;
      }
      next.push(file);
    }
    this.selectedFiles = next;
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  onSubmit(): void {
    this.servicePickerOpen = false;
    this.attemptedSubmit = true;
    this.form.markAllAsTouched();
    if (this.coverageExpired) {
      this.errorMessage = 'Coverage has expired. Reimbursement requests are no longer available.';
      return;
    }

    const errors: string[] = [];
    if (!this.selectedServiceIds.size) {
      errors.push('Select at least one covered service from the receipt.');
    }
    if (this.form.controls.amount.invalid) {
      errors.push('Enter the amount you paid (at least 1 ETB).');
    }
    if (this.form.controls.description.invalid) {
      errors.push('Add a note of at least 10 characters describing the expense.');
    }
    if (!this.selectedFiles.length) {
      errors.push('Attach at least one receipt image or file.');
    }
    if (errors.length) {
      this.errorMessage = errors[0];
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { amount, description } = this.form.getRawValue();
    this.api.createReimbursement({
      medicalServiceIds: [...this.selectedServiceIds],
      amount: Number(amount),
      description: description!.trim(),
      files: this.selectedFiles,
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
