import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfigService } from '../../../core/services/config.service';
import { EmployerApiService } from '../../../core/services/employer-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { EmployerEmployee, EmployerEmployeeListItem, PolicyListItem } from '../../../core/models';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

type SortableEmployeeField = 'employeeNumber' | 'firstName' | 'lastName' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-employer-employees',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './employer-employees.component.html',
  styleUrl: './employer-employees.component.scss',
})
export class EmployerEmployeesComponent implements OnInit, OnDestroy {
  private readonly api = inject(EmployerApiService);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.searchQuery = query;
    this.page = 1;
    this.loadEmployees();
  });

  employees: EmployerEmployeeListItem[] = [];
  policies: PolicyListItem[] = [];
  loading = true;
  errorMessage = '';

  searchQuery = '';
  filterPolicyId = '';
  filterHasPolicy = '';
  filterStatus = '';
  page = 1;
  limit = 15;
  total = 0;
  totalPages = 1;
  sortColumn: SortableEmployeeField = 'createdAt';
  sortDirection: SortDirection = 'desc';

  selectedIds = new Set<string>();
  showAddForm = false;
  showEnrollPanel = false;
  enrollPolicyId = '';
  enrolling = false;
  savingEmployee = false;
  lookingUpEmployee = false;
  alreadyOnRoster = false;
  existingEmployeeId: string | null = null;
  lookupHint = '';
  lookupPhotoUrl: string | null = null;
  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  employeeToTerminate: EmployerEmployeeListItem | null = null;
  terminating = false;
  private nationalIdLookupTimer: ReturnType<typeof setTimeout> | null = null;
  private lookupRequestSeq = 0;

  newEmployee = {
    employeeNumber: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    dateOfBirth: '',
    email: '',
    phone: '',
  };

  readonly hasPolicyOptions = [
    { value: '', label: 'All employees' },
    { value: 'true', label: 'Enrolled on policy' },
    { value: 'false', label: 'Not enrolled' },
  ];

  readonly statusOptions = ['', 'ACTIVE', 'TERMINATED'];

  ngOnInit(): void {
    this.api.listPolicies().subscribe({ next: (policies) => { this.policies = policies; } });
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.clearNationalIdLookupTimer();
    this.clearPhotoSelection();
    this.searchHandler.destroy();
  }

  get showingFrom(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get showingTo(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  get allVisibleSelected(): boolean {
    const selectable = this.employees.filter((row) => row.status !== 'TERMINATED');
    return selectable.length > 0 && selectable.every((row) => this.selectedIds.has(row.id));
  }

  get selectedUnenrolledCount(): number {
    return this.employees.filter((row) => this.selectedIds.has(row.id) && !row.hasPolicy).length;
  }

  onSearchInput(value: string): void {
    this.searchHandler.update(value);
  }

  onFiltersChanged(): void {
    this.page = 1;
    this.loadEmployees();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterPolicyId = '';
    this.filterHasPolicy = '';
    this.filterStatus = '';
    this.page = 1;
    this.searchHandler.clear();
    this.loadEmployees();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.filterPolicyId || this.filterHasPolicy || this.filterStatus);
  }

  toggleSort(column: SortableEmployeeField): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.loadEmployees();
  }

  sortIndicator(column: SortableEmployeeField): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  toggleSelectAll(checked: boolean): void {
    this.employees.forEach((row) => {
      if (row.status === 'TERMINATED') {
        this.selectedIds.delete(row.id);
        return;
      }
      if (checked) this.selectedIds.add(row.id);
      else this.selectedIds.delete(row.id);
    });
  }

  toggleSelect(id: string, checked: boolean, event?: Event): void {
    event?.stopPropagation();
    const employee = this.employees.find((row) => row.id === id);
    if (employee?.status === 'TERMINATED') {
      this.selectedIds.delete(id);
      return;
    }
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  openEmployee(employee: EmployerEmployeeListItem): void {
    void this.router.navigate(['/portal/employer/employees', employee.id]);
  }

  startTerminate(employee: EmployerEmployeeListItem): void {
    if (employee.status === 'TERMINATED') return;
    this.employeeToTerminate = employee;
    this.errorMessage = '';
  }

  cancelTerminate(): void {
    if (this.terminating) return;
    this.employeeToTerminate = null;
  }

  confirmTerminate(): void {
    const employee = this.employeeToTerminate;
    if (!employee || this.terminating) return;

    this.terminating = true;
    this.errorMessage = '';
    this.api.terminateEmployee(employee.id).subscribe({
      next: () => {
        this.terminating = false;
        this.employeeToTerminate = null;
        this.selectedIds.delete(employee.id);
        this.snackbar.success('Employee terminated. Coverage for the employee and dependents has expired.');
        this.loadEmployees();
      },
      error: (err) => {
        this.terminating = false;
        this.errorMessage = err.userMessage ?? 'Failed to terminate employee.';
      },
    });
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages || nextPage === this.page) return;
    this.page = nextPage;
    this.loadEmployees();
  }

  employeeName(employee: EmployerEmployeeListItem): string {
    return `${employee.firstName} ${employee.lastName}`.trim();
  }

  employeeInitials(employee: EmployerEmployeeListItem): string {
    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  }

  employeePhotoUrl(employee: EmployerEmployee | EmployerEmployeeListItem): string | null {
    return this.config.resolveAssetUrl(employee.photoUrl);
  }

  get photoPreviewSrc(): string | null {
    return this.photoPreviewUrl || this.config.resolveAssetUrl(this.lookupPhotoUrl);
  }

  onNationalIdInput(value: string): void {
    this.newEmployee.nationalId = value;
    this.alreadyOnRoster = false;
    this.existingEmployeeId = null;
    this.lookupHint = '';
    this.lookupPhotoUrl = null;
    this.lookupRequestSeq += 1;
    this.clearNationalIdLookupTimer();

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      this.lookingUpEmployee = false;
      return;
    }

    this.lookingUpEmployee = true;
    this.nationalIdLookupTimer = setTimeout(() => this.lookupPreviousEmployee(trimmed), 400);
  }

  openExistingEmployee(): void {
    if (!this.existingEmployeeId) return;
    void this.router.navigate(['/portal/employer/employees', this.existingEmployeeId]);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.clearPhotoSelection();
    if (!file) return;
    this.photoFile = file;
    this.photoPreviewUrl = URL.createObjectURL(file);
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetAddForm();
    } else {
      this.clearNationalIdLookupTimer();
    }
  }

  submitNewEmployee(): void {
    if (this.alreadyOnRoster) {
      this.errorMessage = 'This person is already on your roster.';
      return;
    }
    const employeeNumber = this.newEmployee.employeeNumber.trim();
    const firstName = this.newEmployee.firstName.trim();
    const lastName = this.newEmployee.lastName.trim();
    const nationalId = this.newEmployee.nationalId.trim();
    const dateOfBirth = this.newEmployee.dateOfBirth;
    const email = this.newEmployee.email.trim();
    const phone = this.newEmployee.phone.trim();

    if (
      !employeeNumber ||
      !firstName ||
      !lastName ||
      !nationalId ||
      !dateOfBirth ||
      !email ||
      !phone
    ) {
      this.errorMessage = 'All fields are required.';
      return;
    }

    this.savingEmployee = true;
    this.errorMessage = '';
    const photo = this.photoFile;
    this.api.createEmployee({
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
        this.savingEmployee = false;
      }),
    ).subscribe({
      next: () => {
        this.showAddForm = false;
        this.clearPhotoSelection();
        this.resetLookupState();
        this.snackbar.success('Employee added successfully.');
        this.loadEmployees();
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to add employee.';
      },
    });
  }

  private lookupPreviousEmployee(nationalId: string): void {
    const requestSeq = this.lookupRequestSeq;
    this.api.lookupEmployee(nationalId).subscribe({
      next: (match) => {
        if (requestSeq !== this.lookupRequestSeq) return;
        this.lookingUpEmployee = false;
        this.newEmployee.firstName = match.firstName || this.newEmployee.firstName;
        this.newEmployee.lastName = match.lastName || this.newEmployee.lastName;
        this.newEmployee.dateOfBirth = this.toDateInput(match.dateOfBirth) || this.newEmployee.dateOfBirth;
        this.newEmployee.email = match.email || this.newEmployee.email;
        this.newEmployee.phone = match.phone || this.newEmployee.phone;
        this.lookupPhotoUrl = match.photoUrl ?? null;
        this.alreadyOnRoster = match.alreadyOnRoster;
        this.existingEmployeeId = match.existingEmployeeId ?? null;
        this.lookupHint = match.alreadyOnRoster
          ? 'This person is already on your roster.'
          : 'Previous details were loaded from an earlier record.';
      },
      error: () => {
        if (requestSeq !== this.lookupRequestSeq) return;
        this.lookingUpEmployee = false;
        this.alreadyOnRoster = false;
        this.existingEmployeeId = null;
        this.lookupPhotoUrl = null;
        this.lookupHint = '';
      },
    });
  }

  private resetAddForm(): void {
    this.newEmployee = {
      employeeNumber: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
      email: '',
      phone: '',
    };
    this.errorMessage = '';
    this.resetLookupState();
    this.clearPhotoSelection();
  }

  private resetLookupState(): void {
    this.lookupRequestSeq += 1;
    this.clearNationalIdLookupTimer();
    this.lookingUpEmployee = false;
    this.alreadyOnRoster = false;
    this.existingEmployeeId = null;
    this.lookupHint = '';
    this.lookupPhotoUrl = null;
  }

  private clearNationalIdLookupTimer(): void {
    if (this.nationalIdLookupTimer) {
      clearTimeout(this.nationalIdLookupTimer);
      this.nationalIdLookupTimer = null;
    }
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private clearPhotoSelection(): void {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoFile = null;
    this.photoPreviewUrl = null;
  }

  openEnrollPanel(): void {
    if (!this.selectedIds.size) return;
    this.showEnrollPanel = true;
    this.enrollPolicyId = this.filterPolicyId || this.policies[0]?.id || '';
    this.errorMessage = '';
  }

  cancelEnrollPanel(): void {
    this.showEnrollPanel = false;
  }

  submitBulkEnroll(): void {
    if (!this.enrollPolicyId) {
      this.errorMessage = 'Select a policy to enroll employees.';
      return;
    }

    const employeeIds = [...this.selectedIds].filter((id) => {
      const employee = this.employees.find((row) => row.id === id);
      return employee && !employee.hasPolicy;
    });

    if (!employeeIds.length) {
      this.errorMessage = 'Select employees who are not already enrolled on a policy.';
      return;
    }

    this.enrolling = true;
    this.errorMessage = '';
    this.api.bulkEnrollEmployees({ employeeIds, policyId: this.enrollPolicyId }).subscribe({
      next: (result) => {
        this.enrolling = false;
        this.showEnrollPanel = false;
        this.selectedIds.clear();
        this.snackbar.success(`Enrolled ${result.enrolledCount} employee(s) on the policy.`);
        this.loadEmployees();
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to enroll employees.';
        this.enrolling = false;
      },
    });
  }

  private loadEmployees(): void {
    this.loading = true;
    this.errorMessage = '';
    const sortPrefix = this.sortDirection === 'desc' ? '-' : '';
    this.api.getEmployees({
      page: this.page,
      limit: this.limit,
      search: this.searchQuery || undefined,
      policyId: this.filterPolicyId || undefined,
      status: this.filterStatus || undefined,
      hasPolicy: this.filterHasPolicy === '' ? undefined : this.filterHasPolicy === 'true',
      sort: `${sortPrefix}${this.sortColumn}`,
    }).subscribe({
      next: (res) => {
        this.employees = res.data;
        this.total = res.meta.total;
        this.totalPages = res.meta.totalPages;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load employees.';
        this.loading = false;
      },
    });
  }
}
