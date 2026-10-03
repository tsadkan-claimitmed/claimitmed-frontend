import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MemberApiService } from '../../../core/services/member-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { MemberBankAccount, MemberProfile } from '../../../core/models';

@Component({
  selector: 'app-member-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './member-settings.component.html',
  styleUrl: './member-settings.component.scss',
})
export class MemberSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly memberApi = inject(MemberApiService);

  profile: MemberProfile | null = null;
  bankAccount: MemberBankAccount | null = null;
  loading = true;
  contactSaving = false;
  passwordSaving = false;
  bankSaving = false;
  contactMessage = '';
  contactError = '';
  passwordMessage = '';
  passwordError = '';
  bankMessage = '';
  bankError = '';

  contactForm = this.fb.group({
    phone: [''],
    email: [''],
  });

  passwordForm = this.fb.group({
    currentPassword: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  bankForm = this.fb.group({
    bankName: ['', Validators.required],
    accountNumber: ['', Validators.required],
    accountHolderName: [''],
    currency: ['ETB'],
  });

  ngOnInit(): void {
    this.memberApi.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        const user = this.auth.currentUser;
        this.contactForm.patchValue({
          phone: user?.phone ?? '',
          email: user?.email ?? '',
        });
        this.bankForm.patchValue({
          accountHolderName: `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.memberApi.getBankAccount().subscribe({
      next: (account) => {
        this.bankAccount = account;
        if (account) {
          this.bankForm.patchValue({
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName ?? '',
            currency: account.currency ?? 'ETB',
          });
        }
      },
    });
  }

  saveContact(): void {
    const { phone, email } = this.contactForm.getRawValue();
    if (!phone || phone.length < 8) {
      this.contactError = 'Phone number must be at least 8 characters.';
      this.contactMessage = '';
      return;
    }

    this.contactSaving = true;
    this.contactError = '';
    this.contactMessage = '';

    this.auth.updateAccount({ phone, email: email || null }).subscribe({
      next: () => {
        this.contactSaving = false;
        this.contactMessage = 'Contact details updated.';
      },
      error: (err: { userMessage?: string }) => {
        this.contactSaving = false;
        this.contactError = err.userMessage ?? 'Failed to update contact details.';
      },
    });
  }

  savePassword(): void {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (!currentPassword || currentPassword.length < 6) {
      this.passwordError = 'Current password must be at least 6 characters.';
      this.passwordMessage = '';
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters.';
      this.passwordMessage = '';
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError = 'New password and confirmation do not match.';
      this.passwordMessage = '';
      return;
    }

    this.passwordSaving = true;
    this.passwordError = '';
    this.passwordMessage = '';

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordSaving = false;
        this.passwordMessage = 'Password updated successfully.';
        this.passwordForm.reset();
      },
      error: (err: { userMessage?: string }) => {
        this.passwordSaving = false;
        this.passwordError = err.userMessage ?? 'Failed to update password.';
      },
    });
  }

  saveBankAccount(): void {
    if (this.bankForm.invalid) {
      this.bankError = 'Bank name and account number are required.';
      this.bankMessage = '';
      return;
    }

    this.bankSaving = true;
    this.bankError = '';
    this.bankMessage = '';

    const value = this.bankForm.getRawValue();
    this.memberApi.saveBankAccount({
      bankName: value.bankName!,
      accountNumber: value.accountNumber!,
      accountHolderName: value.accountHolderName || undefined,
      currency: value.currency || 'ETB',
    }).subscribe({
      next: (account) => {
        this.bankAccount = account;
        this.bankSaving = false;
        this.bankMessage = 'Reimbursement bank account saved.';
      },
      error: (err: { userMessage?: string }) => {
        this.bankSaving = false;
        this.bankError = err.userMessage ?? 'Failed to save bank account.';
      },
    });
  }
}
