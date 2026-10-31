import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { AppUser, Employer, Insurer, Provider } from '../../../core/models';
import { UserType } from '../../../core/models/enums';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [AdminEntityCrudComponent, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  @ViewChild(AdminEntityCrudComponent) crudRef?: AdminEntityCrudComponent;

  items: AppUser[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;
  selectedUser: AppUser | null = null;

  confirmResetPassword = false;
  resetPasswordValue = '';
  resettingPassword = false;
  resetPasswordError = '';
  resetPasswordSuccess = '';

  confirmStatusChangeUser: AppUser | null = null;
  statusChangeError = '';

  insurers: Insurer[] = [];
  employers: Employer[] = [];
  providers: Provider[] = [];

  readonly columns: CrudColumn[] = [
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'userType', label: 'Role' },
    { key: 'status', label: 'Status' },
  ];

  fields: CrudField[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      users: this.api.getUsers(),
      insurers: this.api.getInsurers(),
      employers: this.api.getEmployers(),
      providers: this.api.getProviders(),
    }).subscribe({
      next: ({ users, insurers, employers, providers }) => {
        this.items = users;
        this.insurers = insurers;
        this.employers = employers;
        this.providers = providers;
        this.fields = this.buildFields();
        if (this.selectedUser) {
          this.selectedUser = users.find((user) => user.id === this.selectedUser!.id) ?? null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load users.';
        this.loading = false;
      },
    });
  }

  onSelectedUserChange(item: unknown | null): void {
    this.selectedUser = (item as AppUser | null) ?? null;
    this.resetPasswordSuccess = '';
    this.cancelResetPassword();
    this.cancelStatusChange();
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createUser(this.normalizeBody(body, true) as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create user.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateUser(event.id, this.normalizeBody(event.body, false) as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update user.'; this.saving = false; },
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
    if (!this.selectedUser || this.resetPasswordValue.length < 6) {
      this.resetPasswordError = 'Password must be at least 6 characters.';
      return;
    }

    this.resettingPassword = true;
    this.resetPasswordError = '';
    this.api.resetUserPassword(this.selectedUser.id, this.resetPasswordValue).subscribe({
      next: () => {
        this.resettingPassword = false;
        this.resetPasswordSuccess = `Password reset for ${this.selectedUser!.phone}. The user must sign in with the new password.`;
        this.cancelResetPassword();
      },
      error: (err) => {
        this.resetPasswordError = err.userMessage ?? 'Failed to reset password.';
        this.resettingPassword = false;
      },
    });
  }

  requestStatusChange(user: AppUser, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.confirmStatusChangeUser = user;
    this.statusChangeError = '';
    this.crudRef?.lockSearch();
  }

  cancelStatusChange(): void {
    this.confirmStatusChangeUser = null;
    this.statusChangeError = '';
    this.crudRef?.unlockSearch();
  }

  confirmStatusChangeAction(): void {
    if (!this.confirmStatusChangeUser) return;

    const user = this.confirmStatusChangeUser;
    const action = user.status === 'ACTIVE'
      ? this.api.deactivateUser(user.id)
      : this.api.activateUser(user.id);

    action.subscribe({
      next: () => {
        this.cancelStatusChange();
        this.load();
      },
      error: (err) => {
        this.statusChangeError = err.userMessage ?? 'Failed to update user status.';
      },
    });
  }

  private buildFields(): CrudField[] {
    return [
      { key: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+251911000099' },
      { key: 'email', label: 'Email (optional)', type: 'email', placeholder: 'user@example.com' },
      { key: 'password', label: 'Password', type: 'password', required: true, createOnly: true, placeholder: 'Minimum 6 characters' },
      {
        key: 'userType',
        label: 'Role',
        type: 'select',
        required: true,
        readonlyOnEdit: true,
        options: [
          { value: UserType.ADMIN, label: 'Admin' },
          { value: UserType.CLAIM_OFFICER, label: 'Claim Officer' },
          { value: UserType.INSURER, label: 'Insurer' },
          { value: UserType.EMPLOYER, label: 'Employer' },
          { value: UserType.PROVIDER, label: 'Provider' },
          { value: UserType.MEMBER, label: 'Member' },
        ],
      },
      {
        key: 'insuranceCompanyId',
        label: 'Insurer',
        type: 'select',
        required: true,
        showWhen: { field: 'userType', values: [UserType.INSURER] },
        options: this.insurers.map((item) => ({ value: item.id, label: `${item.name} (${item.companyCode})` })),
      },
      {
        key: 'managesAllInsurers',
        label: 'All insurers',
        type: 'checkbox',
        placeholder: 'Give this claim officer access to every insurance company.',
        showWhen: { field: 'userType', values: [UserType.CLAIM_OFFICER] },
      },
      {
        key: 'insuranceCompanyIds',
        label: 'Assigned insurers',
        type: 'multiselect',
        required: true,
        showWhen: { field: 'userType', values: [UserType.CLAIM_OFFICER] },
        hideWhen: { field: 'managesAllInsurers', values: ['true'] },
        options: this.insurers.map((item) => ({ value: item.id, label: `${item.name} (${item.companyCode})` })),
      },
      {
        key: 'employerId',
        label: 'Employer',
        type: 'select',
        required: true,
        showWhen: { field: 'userType', values: [UserType.EMPLOYER] },
        options: this.employers.map((item) => ({ value: item.id, label: `${item.name} (${item.employerCode})` })),
      },
      {
        key: 'providerId',
        label: 'Provider',
        type: 'select',
        required: true,
        showWhen: { field: 'userType', values: [UserType.PROVIDER] },
        options: this.providers.map((item) => ({ value: item.id, label: `${item.name ?? item.providerCode} (${item.providerCode})` })),
      },
      {
        key: 'nationalId',
        label: 'National ID',
        type: 'text',
        required: true,
        showWhen: { field: 'userType', values: [UserType.MEMBER] },
        placeholder: 'ET-1234567890',
        createOnly: true,
      },
    ];
  }

  private normalizeBody(body: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
    const value = { ...body };
    const userType = isCreate
      ? String(value['userType'] ?? '')
      : String(this.selectedUser?.userType ?? value['userType'] ?? '');

    for (const key of ['email', 'insuranceCompanyId', 'employerId', 'providerId', 'nationalId']) {
      if (value[key] === '') {
        delete value[key];
      }
    }

    if (userType !== UserType.INSURER) delete value['insuranceCompanyId'];
    if (userType !== UserType.EMPLOYER) delete value['employerId'];
    if (userType !== UserType.PROVIDER) delete value['providerId'];
    if (userType !== UserType.MEMBER) delete value['nationalId'];

    if (userType === UserType.CLAIM_OFFICER) {
      const managesAll = value['managesAllInsurers'] === true;
      value['managesAllInsurers'] = managesAll;
      if (managesAll) {
        delete value['insuranceCompanyIds'];
      } else if (!Array.isArray(value['insuranceCompanyIds'])) {
        value['insuranceCompanyIds'] = [];
      }
    } else {
      delete value['managesAllInsurers'];
      delete value['insuranceCompanyIds'];
    }

    if (!isCreate) {
      delete value['userType'];
      delete value['password'];
    }
    return value;
  }
}
