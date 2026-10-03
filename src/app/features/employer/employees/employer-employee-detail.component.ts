import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { EmployerApiService } from '../../../core/services/employer-api.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { EmployerEmployeeDependent, EmployerEmployeeDetail } from '../../../core/models';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PhotoLightboxComponent } from '../../../shared/components/photo-lightbox/photo-lightbox.component';

@Component({
  selector: 'app-employer-employee-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    PhotoLightboxComponent,
  ],
  templateUrl: './employer-employee-detail.component.html',
  styleUrl: './employer-employee-detail.component.scss',
})
export class EmployerEmployeeDetailComponent implements OnInit, OnDestroy {
  private readonly api = inject(EmployerApiService);
  private readonly config = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackbarService);

  detail: EmployerEmployeeDetail | null = null;
  loading = true;
  errorMessage = '';
  showAddDependentForm = false;
  savingDependent = false;
  editingDependentId: string | null = null;
  savingDependentEdit = false;
  enrollingDependentId: string | null = null;
  refreshingEnrollment = false;
  editingProfile = false;
  savingProfile = false;
  profilePhotoFile: File | null = null;
  profilePhotoPreviewUrl: string | null = null;
  viewingPhotoUrl: string | null = null;
  confirmingTerminate = false;
  terminating = false;

  editProfile = {
    employeeNumber: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    dateOfBirth: '',
    email: '',
    phone: '',
  };

  newDependent = {
    firstName: '',
    lastName: '',
    relationshipType: 'SPOUSE',
    nationalId: '',
    dateOfBirth: '',
  };

  editDependent = {
    firstName: '',
    lastName: '',
    relationshipType: 'SPOUSE',
    nationalId: '',
    dateOfBirth: '',
  };

  readonly relationshipOptions = [
    { value: 'SPOUSE', label: 'Spouse' },
    { value: 'CHILD', label: 'Child' },
  ];

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('id');
    if (!employeeId) {
      this.errorMessage = 'Employee ID is missing.';
      this.loading = false;
      return;
    }

    this.loadDetail(employeeId);
  }

  ngOnDestroy(): void {
    this.clearProfilePhotoSelection();
  }

  employeeName(): string {
    if (!this.detail) return '—';
    return `${this.detail.employee.firstName} ${this.detail.employee.lastName}`.trim();
  }

  employeeInitials(): string {
    if (!this.detail) return '';
    return `${this.detail.employee.firstName.charAt(0)}${this.detail.employee.lastName.charAt(0)}`.toUpperCase();
  }

  employeePhotoUrl(): string | null {
    if (this.profilePhotoPreviewUrl) return this.profilePhotoPreviewUrl;
    return this.config.resolveAssetUrl(this.detail?.employee.photoUrl);
  }

  photoDownloadName(): string {
    const number = this.detail?.employee.employeeNumber ?? 'employee';
    return `${number}-photo.jpg`;
  }

  openPhotoViewer(): void {
    const url = this.employeePhotoUrl();
    if (!url) return;
    this.viewingPhotoUrl = url;
  }

  closePhotoViewer(): void {
    this.viewingPhotoUrl = null;
  }

  isTerminated(): boolean {
    return this.detail?.employee.status === 'TERMINATED';
  }

  startTerminate(): void {
    if (!this.detail || this.isTerminated()) return;
    this.confirmingTerminate = true;
    this.errorMessage = '';
  }

  cancelTerminate(): void {
    this.confirmingTerminate = false;
  }

  confirmTerminate(): void {
    const employeeId = this.detail?.employee.id;
    if (!employeeId || this.terminating) return;

    this.terminating = true;
    this.errorMessage = '';
    this.api.terminateEmployee(employeeId).subscribe({
      next: () => {
        this.terminating = false;
        this.confirmingTerminate = false;
        this.editingProfile = false;
        this.showAddDependentForm = false;
        this.editingDependentId = null;
        this.snackbar.success('Employee terminated. Coverage for the employee and dependents has expired.');
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.terminating = false;
        this.errorMessage = err.userMessage ?? 'Failed to terminate employee.';
      },
    });
  }

  startEditProfile(): void {
    if (!this.detail || this.isTerminated()) return;
    const employee = this.detail.employee;
    this.editingProfile = true;
    this.errorMessage = '';
    this.editProfile = {
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      nationalId: employee.nationalId ?? '',
      dateOfBirth: this.toDateInput(employee.dateOfBirth),
      email: employee.email ?? '',
      phone: employee.phone ?? '',
    };
    this.clearProfilePhotoSelection();
  }

  cancelEditProfile(): void {
    this.editingProfile = false;
    this.clearProfilePhotoSelection();
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearProfilePhotoSelection();
    if (!file) return;
    this.profilePhotoFile = file;
    this.profilePhotoPreviewUrl = URL.createObjectURL(file);
  }

  submitProfile(): void {
    const employeeId = this.detail?.employee.id;
    if (!employeeId) return;

    const employeeNumber = this.editProfile.employeeNumber.trim();
    const firstName = this.editProfile.firstName.trim();
    const lastName = this.editProfile.lastName.trim();
    const nationalId = this.editProfile.nationalId.trim();
    const dateOfBirth = this.editProfile.dateOfBirth;
    const email = this.editProfile.email.trim();
    const phone = this.editProfile.phone.trim();

    if (!employeeNumber || !firstName || !lastName || !nationalId || !dateOfBirth || !email || !phone) {
      this.errorMessage = 'All profile fields are required.';
      return;
    }

    this.savingProfile = true;
    this.errorMessage = '';
    const photo = this.profilePhotoFile;
    this.api.updateEmployee(employeeId, {
      employeeNumber,
      firstName,
      lastName,
      nationalId,
      dateOfBirth,
      email,
      phone,
    }).pipe(
      switchMap((employee) =>
        photo ? this.api.uploadEmployeePhoto(employee.id, photo) : of(employee),
      ),
      finalize(() => {
        this.savingProfile = false;
      }),
    ).subscribe({
      next: () => {
        this.editingProfile = false;
        this.clearProfilePhotoSelection();
        this.snackbar.success('Employee profile updated.');
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update employee profile.';
      },
    });
  }

  private toDateInput(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private clearProfilePhotoSelection(): void {
    if (this.profilePhotoPreviewUrl) {
      URL.revokeObjectURL(this.profilePhotoPreviewUrl);
    }
    this.profilePhotoFile = null;
    this.profilePhotoPreviewUrl = null;
  }

  dependentName(row: EmployerEmployeeDependent): string {
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
    return name || row.memberNumber || '—';
  }

  formatRelationship(value: string): string {
    return value.replace(/_/g, ' ');
  }

  toggleAddDependentForm(): void {
    if (this.isTerminated()) return;
    this.showAddDependentForm = !this.showAddDependentForm;
    if (this.showAddDependentForm) {
      this.editingDependentId = null;
      this.newDependent = {
        firstName: '',
        lastName: '',
        relationshipType: 'SPOUSE',
        nationalId: '',
        dateOfBirth: '',
      };
    }
  }

  canEditDependent(dependent: EmployerEmployeeDependent): boolean {
    return !this.isTerminated() && !!dependent.rosterDependentId && !dependent.isEnrolled;
  }

  startEditDependent(dependent: EmployerEmployeeDependent): void {
    const dependentId = dependent.rosterDependentId ?? dependent.id;
    if (!dependentId || !this.canEditDependent(dependent)) return;

    this.showAddDependentForm = false;
    this.editingDependentId = dependentId;
    this.editDependent = {
      firstName: dependent.firstName,
      lastName: dependent.lastName,
      relationshipType: dependent.relationshipType,
      nationalId: dependent.nationalId ?? '',
      dateOfBirth: dependent.dateOfBirth ?? '',
    };
    this.errorMessage = '';
  }

  cancelEditDependent(): void {
    this.editingDependentId = null;
  }

  submitEditDependent(): void {
    const employeeId = this.detail?.employee.id;
    const dependentId = this.editingDependentId;
    if (!employeeId || !dependentId) return;

    const firstName = this.editDependent.firstName.trim();
    const lastName = this.editDependent.lastName.trim();
    const nationalId = this.editDependent.nationalId.trim();
    const dateOfBirth = this.editDependent.dateOfBirth;

    if (!firstName || !lastName || !nationalId || !dateOfBirth) {
      this.errorMessage = 'All dependent fields are required.';
      return;
    }

    this.savingDependentEdit = true;
    this.errorMessage = '';
    this.api.updateEmployeeDependent(employeeId, dependentId, {
      firstName,
      lastName,
      relationshipType: this.editDependent.relationshipType,
      nationalId,
      dateOfBirth,
    }).subscribe({
      next: () => {
        this.savingDependentEdit = false;
        this.editingDependentId = null;
        this.snackbar.success('Dependent updated successfully.');
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update dependent.';
        this.savingDependentEdit = false;
      },
    });
  }

  submitNewDependent(): void {
    const employeeId = this.detail?.employee.id;
    if (!employeeId) return;

    const firstName = this.newDependent.firstName.trim();
    const lastName = this.newDependent.lastName.trim();
    const nationalId = this.newDependent.nationalId.trim();
    const dateOfBirth = this.newDependent.dateOfBirth;

    if (!firstName || !lastName || !nationalId || !dateOfBirth) {
      this.errorMessage = 'All dependent fields are required.';
      return;
    }

    this.savingDependent = true;
    this.errorMessage = '';
    this.api.addEmployeeDependent(employeeId, {
      firstName,
      lastName,
      relationshipType: this.newDependent.relationshipType,
      nationalId,
      dateOfBirth,
    }).subscribe({
      next: () => {
        this.savingDependent = false;
        this.showAddDependentForm = false;
        this.snackbar.success('Dependent added successfully.');
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to add dependent.';
        this.savingDependent = false;
      },
    });
  }

  enrollDependent(dependent: EmployerEmployeeDependent): void {
    const employeeId = this.detail?.employee.id;
    const dependentId = dependent.rosterDependentId ?? dependent.id;
    if (!employeeId || !dependentId || dependent.isEnrolled) return;

    this.enrollingDependentId = dependentId;
    this.api.enrollEmployeeDependent(employeeId, dependentId).subscribe({
      next: () => {
        this.enrollingDependentId = null;
        this.snackbar.success('Dependent enrolled on the policy.');
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.enrollingDependentId = null;
        this.errorMessage = err.userMessage ?? 'Failed to enroll dependent.';
      },
    });
  }

  canEnrollDependent(dependent: EmployerEmployeeDependent): boolean {
    return (
      !this.isTerminated() &&
      !!this.detail?.employee.memberId &&
      !!this.detail?.policySupportsDependents &&
      !dependent.isEnrolled &&
      !!dependent.rosterDependentId
    );
  }

  canRefreshEnrollment(): boolean {
    return !this.isTerminated() && !!this.detail?.employee.memberId && !!this.detail?.policy;
  }

  refreshEnrollment(): void {
    const employeeId = this.detail?.employee.id;
    if (!employeeId) return;

    this.refreshingEnrollment = true;
    this.errorMessage = '';
    this.api.refreshEmployeeEnrollment(employeeId).subscribe({
      next: (result) => {
        this.refreshingEnrollment = false;
        if (result.enrolledDependentCount > 0) {
          this.snackbar.success(
            `Enrollment refreshed. ${result.enrolledDependentCount} dependent(s) enrolled.`,
          );
        } else {
          this.snackbar.success('Enrollment refreshed. No new dependents to enroll.');
        }
        this.loadDetail(employeeId);
      },
      error: (err) => {
        this.refreshingEnrollment = false;
        this.errorMessage = err.userMessage ?? 'Failed to refresh enrollment.';
      },
    });
  }

  private loadDetail(employeeId: string): void {
    this.loading = true;
    this.api.getEmployeeDetail(employeeId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load employee details.';
        this.loading = false;
      },
    });
  }
}
