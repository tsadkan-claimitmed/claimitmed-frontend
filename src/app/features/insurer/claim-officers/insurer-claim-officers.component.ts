import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { AppUser } from '../../../core/models';

@Component({
  selector: 'app-insurer-claim-officers',
  standalone: true,
  imports: [AdminEntityCrudComponent, FormsModule],
  templateUrl: './insurer-claim-officers.component.html',
  styleUrl: './insurer-claim-officers.component.scss',
})
export class InsurerClaimOfficersComponent implements OnInit {
  private readonly api = inject(InsurerApiService);

  @ViewChild(AdminEntityCrudComponent) crudRef?: AdminEntityCrudComponent;

  items: AppUser[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;
  selectedOfficer: AppUser | null = null;

  confirmResetPassword = false;
  resetPasswordValue = '';
  resettingPassword = false;
  resetPasswordError = '';
  resetPasswordSuccess = '';

  confirmStatusChangeOfficer: AppUser | null = null;
  statusChangeError = '';

  readonly columns: CrudColumn[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+251911000099' },
    { key: 'email', label: 'Email (optional)', type: 'email', placeholder: 'officer@example.com' },
    { key: 'password', label: 'Password', type: 'password', required: true, createOnly: true, placeholder: 'Minimum 6 characters' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.listInsurerClaimOfficers().subscribe({
      next: (officers) => {
        this.items = officers;
        if (this.selectedOfficer) {
          this.selectedOfficer = officers.find((officer) => officer.id === this.selectedOfficer!.id) ?? null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load claim officers.';
        this.loading = false;
      },
    });
  }

  onSelectedOfficerChange(item: unknown | null): void {
    this.selectedOfficer = (item as AppUser | null) ?? null;
    this.resetPasswordSuccess = '';
    this.cancelResetPassword();
    this.cancelStatusChange();
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createInsurerClaimOfficer(this.normalizeCreate(body)).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create claim officer.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateInsurerClaimOfficer(event.id, this.normalizeUpdate(event.body)).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update claim officer.'; this.saving = false; },
    });
  }

  openResetPassword(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.resetPasswordValue = '';
    this.resetPasswordError = '';
    this.crudRef?.lockSearch();
    this.confirmResetPassword = true;
  }

  cancelResetPassword(): void {
    this.confirmResetPassword = false;
    this.resetPasswordValue = '';
    this.resetPasswordError = '';
    this.resettingPassword = false;
    this.crudRef?.unlockSearch();
  }

  confirmResetPasswordAction(): void {
    if (!this.selectedOfficer || this.resetPasswordValue.length < 6) {
      this.resetPasswordError = 'Password must be at least 6 characters.';
      return;
    }

    this.resettingPassword = true;
    this.resetPasswordError = '';
    this.api.resetInsurerClaimOfficerPassword(this.selectedOfficer.id, this.resetPasswordValue).subscribe({
      next: () => {
        this.resettingPassword = false;
        this.resetPasswordSuccess = `Password reset for ${this.selectedOfficer!.phone}. The officer must sign in with the new password.`;
        this.cancelResetPassword();
      },
      error: (err) => {
        this.resetPasswordError = err.userMessage ?? 'Failed to reset password.';
        this.resettingPassword = false;
      },
    });
  }

  requestStatusChange(officer: AppUser, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.confirmStatusChangeOfficer = officer;
    this.statusChangeError = '';
    this.crudRef?.lockSearch();
  }

  cancelStatusChange(): void {
    this.confirmStatusChangeOfficer = null;
    this.statusChangeError = '';
    this.crudRef?.unlockSearch();
  }

  confirmStatusChangeAction(): void {
    if (!this.confirmStatusChangeOfficer) return;

    const officer = this.confirmStatusChangeOfficer;
    const action = officer.status === 'ACTIVE'
      ? this.api.deactivateInsurerClaimOfficer(officer.id)
      : this.api.activateInsurerClaimOfficer(officer.id);

    action.subscribe({
      next: () => {
        this.cancelStatusChange();
        this.load();
      },
      error: (err) => {
        this.statusChangeError = err.userMessage ?? 'Failed to update officer status.';
      },
    });
  }

  private normalizeCreate(body: Record<string, unknown>): { phone: string; email?: string; password: string } {
    const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
    return {
      phone: String(body['phone'] ?? '').trim(),
      password: String(body['password'] ?? ''),
      ...(email ? { email } : {}),
    };
  }

  private normalizeUpdate(body: Record<string, unknown>): { phone?: string; email?: string | null } {
    const value: { phone?: string; email?: string | null } = {};
    if (typeof body['phone'] === 'string') value.phone = body['phone'].trim();
    if (body['email'] !== undefined) {
      const email = typeof body['email'] === 'string' ? body['email'].trim() : '';
      value.email = email || null;
    }
    return value;
  }
}
