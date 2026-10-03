import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ConfigService } from '../../../core/services/config.service';
import { PolicyApiService } from '../../../core/services/policy-api.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import { ORG_CONTACT_CRUD_FIELDS } from '../../../shared/constants/org-contact-fields';
import { Employer, FamilyGroup, Insurer, Member, PolicyListItem } from '../../../core/models';
import { MemberRelationship } from '../../../core/models/enums';

type EmployerRow = Employer & { policyCount: number };

interface EnrollForm {
  memberNumber: string;
  relationshipType: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
}

interface DependentForm {
  memberNumber: string;
  relationshipType: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
}

interface EditMemberForm {
  memberNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
  status: string;
}

@Component({
  selector: 'app-admin-employers',
  standalone: true,
  imports: [AdminEntityCrudComponent, FormsModule, RouterLink],
  templateUrl: './admin-employers.component.html',
  styleUrl: './admin-employers.component.scss',
})
export class AdminEmployersComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly config = inject(ConfigService);
  private readonly policyApi = inject(PolicyApiService);

  items: EmployerRow[] = [];
  insurers: Insurer[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  savedSuccessfully = 0;

  selectedEmployer: Employer | null = null;
  uploadingLogo = false;
  pendingLogoFile: File | null = null;
  pendingLogoPreviewUrl: string | null = null;
  policies: PolicyListItem[] = [];
  policiesLoading = false;
  panelError = '';
  panelSaving = false;

  expandedPolicyId: string | null = null;
  familyGroupsByPolicy: Record<string, FamilyGroup[]> = {};
  membersByFamily: Record<string, Member[]> = {};

  showAddPolicy = false;
  newPolicy = this.emptyPolicyForm();

  editingPolicyId: string | null = null;
  editPolicy = { policyName: '', effectiveDate: '', expiryDate: '', status: 'ACTIVE' };

  showAddFamilyForPolicyId: string | null = null;
  newFamilyCode = '';

  editingFamily: { policyId: string; familyGroupId: string } | null = null;
  editFamilyCode = '';

  enrollTarget: { policyId: string; familyGroupId: string } | null = null;
  enrollForm: EnrollForm = this.emptyEnrollForm(MemberRelationship.PRIMARY);

  dependentTarget: { policyId: string; familyGroupId: string; primaryMemberId: string } | null = null;
  dependentForm: DependentForm = this.emptyDependentForm();

  editingMember: Member | null = null;
  editMemberForm: EditMemberForm = this.emptyEditMemberForm();

  readonly memberRelationships = [
    { value: MemberRelationship.PRIMARY, label: 'Primary' },
    { value: MemberRelationship.SPOUSE, label: 'Spouse' },
    { value: MemberRelationship.CHILD, label: 'Child' },
  ];

  readonly dependentRelationships = [
    { value: MemberRelationship.SPOUSE, label: 'Spouse' },
    { value: MemberRelationship.CHILD, label: 'Child' },
  ];

  readonly policyStatuses = ['ACTIVE', 'INACTIVE', 'EXPIRED'];
  readonly memberStatuses = ['ACTIVE', 'INACTIVE', 'TERMINATED'];

  readonly columns: CrudColumn[] = [
    { key: 'employerCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'policyCount', label: 'Policies' },
    { key: 'city', label: 'City' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'employerCode', label: 'Employer Code', required: true, placeholder: 'e.g. TECHCO', readonlyOnEdit: true },
    { key: 'name', label: 'Employer Name', required: true, placeholder: 'TechCo PLC' },
    ...ORG_CONTACT_CRUD_FIELDS,
  ];

  ngOnInit(): void {
    this.loadInsurers();
    this.load();
  }

  ngOnDestroy(): void {
    this.clearPendingLogo();
  }

  loadInsurers(): void {
    this.api.getInsurers().subscribe({
      next: (items) => { this.insurers = items.filter((row) => row.status === 'ACTIVE'); },
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      employers: this.api.getEmployers(),
      policies: this.policyApi.listPolicies(),
    }).subscribe({
      next: ({ employers, policies }) => {
        const counts = new Map<string, number>();
        for (const policy of policies) {
          counts.set(policy.employerId, (counts.get(policy.employerId) ?? 0) + 1);
        }
        this.items = employers.map((employer) => ({
          ...employer,
          policyCount: counts.get(employer.id) ?? 0,
        }));
        if (this.selectedEmployer) {
          this.selectedEmployer = this.items.find((row) => row.id === this.selectedEmployer!.id) ?? null;
          if (this.selectedEmployer) this.loadPolicies(this.selectedEmployer.id);
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load employers.';
        this.loading = false;
      },
    });
  }

  onSelectedItemChange(item: unknown): void {
    this.selectedEmployer = (item as Employer | null) ?? null;
    this.clearPendingLogo();
    this.resetPanelState();
    if (this.selectedEmployer) {
      this.loadPolicies(this.selectedEmployer.id);
    } else {
      this.policies = [];
    }
  }

  loadPolicies(employerId: string): void {
    this.policiesLoading = true;
    this.panelError = '';
    this.policyApi.listPolicies({ employerId }).subscribe({
      next: (policies) => {
        this.policies = policies;
        this.policiesLoading = false;
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to load policies.';
        this.policiesLoading = false;
      },
    });
  }

  togglePolicy(policyId: string): void {
    if (this.expandedPolicyId === policyId) {
      this.expandedPolicyId = null;
      return;
    }
    this.expandedPolicyId = policyId;
    this.loadPolicyFamilies(policyId);
  }

  loadPolicyFamilies(policyId: string): void {
    this.policyApi.listFamilyGroups(policyId).subscribe({
      next: (groups) => {
        this.familyGroupsByPolicy[policyId] = groups;
        if (!groups.length) {
          return;
        }
        forkJoin(
          groups.map((group) =>
            this.policyApi.listMembers(policyId, group.id),
          ),
        ).subscribe({
          next: (responses) => {
            groups.forEach((group, index) => {
              this.membersByFamily[group.id] = responses[index].data;
            });
          },
          error: (err) => {
            this.panelError = err.userMessage ?? 'Failed to load family members.';
          },
        });
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to load family groups.';
      },
    });
  }

  startAddPolicy(): void {
    this.showAddPolicy = true;
    this.newPolicy = this.emptyPolicyForm();
    this.panelError = '';
  }

  cancelAddPolicy(): void {
    this.showAddPolicy = false;
  }

  submitNewPolicy(): void {
    if (!this.selectedEmployer) return;
    const body = {
      ...this.newPolicy,
      employerId: this.selectedEmployer.id,
      effectiveDate: this.newPolicy.effectiveDate || undefined,
      expiryDate: this.newPolicy.expiryDate || undefined,
    };
    if (!body.insuranceCompanyId || !body.policyNumber.trim() || !body.policyName.trim()) {
      this.panelError = 'Insurer, policy number, and policy name are required.';
      return;
    }

    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.createPolicy(body).subscribe({
      next: () => {
        this.panelSaving = false;
        this.showAddPolicy = false;
        this.load();
        if (this.selectedEmployer) this.loadPolicies(this.selectedEmployer.id);
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to create policy.';
        this.panelSaving = false;
      },
    });
  }

  startEditPolicy(policy: PolicyListItem): void {
    this.editingPolicyId = policy.id;
    this.editPolicy = {
      policyName: policy.policyName,
      effectiveDate: policy.effectiveDate?.slice(0, 10) ?? '',
      expiryDate: policy.expiryDate?.slice(0, 10) ?? '',
      status: policy.status,
    };
    this.panelError = '';
  }

  cancelEditPolicy(): void {
    this.editingPolicyId = null;
  }

  submitEditPolicy(policyId: string): void {
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.updatePolicy(policyId, {
      policyName: this.editPolicy.policyName,
      effectiveDate: this.editPolicy.effectiveDate || undefined,
      expiryDate: this.editPolicy.expiryDate || undefined,
      status: this.editPolicy.status,
    }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.editingPolicyId = null;
        if (this.selectedEmployer) {
          this.loadPolicies(this.selectedEmployer.id);
          this.load();
        }
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to update policy.';
        this.panelSaving = false;
      },
    });
  }

  startAddFamily(policyId: string): void {
    this.showAddFamilyForPolicyId = policyId;
    this.newFamilyCode = '';
    this.panelError = '';
  }

  cancelAddFamily(): void {
    this.showAddFamilyForPolicyId = null;
  }

  submitNewFamily(policyId: string): void {
    if (!this.newFamilyCode.trim()) {
      this.panelError = 'Family code is required.';
      return;
    }
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.createFamilyGroup(policyId, { familyCode: this.newFamilyCode.trim() }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.showAddFamilyForPolicyId = null;
        this.loadPolicyFamilies(policyId);
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to create family group.';
        this.panelSaving = false;
      },
    });
  }

  startEditFamily(policyId: string, group: FamilyGroup): void {
    this.editingFamily = { policyId, familyGroupId: group.id };
    this.editFamilyCode = group.familyCode;
    this.panelError = '';
  }

  cancelEditFamily(): void {
    this.editingFamily = null;
  }

  submitEditFamily(): void {
    if (!this.editingFamily || !this.editFamilyCode.trim()) return;
    const { policyId, familyGroupId } = this.editingFamily;
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.updateFamilyGroup(policyId, familyGroupId, { familyCode: this.editFamilyCode.trim() }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.editingFamily = null;
        this.loadPolicyFamilies(policyId);
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to update family group.';
        this.panelSaving = false;
      },
    });
  }

  startEnroll(policyId: string, familyGroupId: string): void {
    this.enrollTarget = { policyId, familyGroupId };
    this.enrollForm = this.emptyEnrollForm(MemberRelationship.PRIMARY);
    this.dependentTarget = null;
    this.editingMember = null;
    this.panelError = '';
  }

  cancelEnroll(): void {
    this.enrollTarget = null;
  }

  submitEnroll(): void {
    if (!this.enrollTarget) return;
    if (!this.enrollForm.memberNumber.trim()) {
      this.panelError = 'Member number is required.';
      return;
    }
    const { policyId, familyGroupId } = this.enrollTarget;
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.enrollMember({
      policyId,
      familyGroupId,
      memberNumber: this.enrollForm.memberNumber.trim(),
      relationshipType: this.enrollForm.relationshipType,
      firstName: this.enrollForm.firstName.trim() || undefined,
      lastName: this.enrollForm.lastName.trim() || undefined,
      nationalId: this.enrollForm.nationalId.trim() || undefined,
      dateOfBirth: this.enrollForm.dateOfBirth || undefined,
    }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.enrollTarget = null;
        this.loadPolicyFamilies(policyId);
        this.load();
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to enroll member.';
        this.panelSaving = false;
      },
    });
  }

  startAddDependent(policyId: string, familyGroupId: string, primaryMemberId: string): void {
    this.dependentTarget = { policyId, familyGroupId, primaryMemberId };
    this.dependentForm = this.emptyDependentForm();
    this.enrollTarget = null;
    this.editingMember = null;
    this.panelError = '';
  }

  cancelAddDependent(): void {
    this.dependentTarget = null;
  }

  submitDependent(): void {
    if (!this.dependentTarget) return;
    if (!this.dependentForm.memberNumber.trim()) {
      this.panelError = 'Member number is required.';
      return;
    }
    const { policyId, primaryMemberId } = this.dependentTarget;
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.addDependent(primaryMemberId, {
      memberNumber: this.dependentForm.memberNumber.trim(),
      relationshipType: this.dependentForm.relationshipType,
      firstName: this.dependentForm.firstName.trim() || undefined,
      lastName: this.dependentForm.lastName.trim() || undefined,
      nationalId: this.dependentForm.nationalId.trim() || undefined,
      dateOfBirth: this.dependentForm.dateOfBirth || undefined,
    }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.dependentTarget = null;
        this.loadPolicyFamilies(policyId);
        this.load();
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to add dependent.';
        this.panelSaving = false;
      },
    });
  }

  startEditMember(member: Member): void {
    this.editingMember = member;
    this.editMemberForm = {
      memberNumber: member.memberNumber,
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      nationalId: member.nationalId ?? '',
      dateOfBirth: member.dateOfBirth?.slice(0, 10) ?? '',
      status: member.status,
    };
    this.enrollTarget = null;
    this.dependentTarget = null;
    this.panelError = '';
  }

  cancelEditMember(): void {
    this.editingMember = null;
  }

  submitEditMember(): void {
    if (!this.editingMember) return;
    const policyId = this.editingMember.policyId;
    this.panelSaving = true;
    this.panelError = '';
    this.policyApi.updateMember(this.editingMember.id, {
      memberNumber: this.editMemberForm.memberNumber.trim(),
      firstName: this.editMemberForm.firstName.trim() || undefined,
      lastName: this.editMemberForm.lastName.trim() || undefined,
      nationalId: this.editMemberForm.nationalId.trim() || undefined,
      dateOfBirth: this.editMemberForm.dateOfBirth || undefined,
      status: this.editMemberForm.status,
    }).subscribe({
      next: () => {
        this.panelSaving = false;
        this.editingMember = null;
        this.loadPolicyFamilies(policyId);
      },
      error: (err) => {
        this.panelError = err.userMessage ?? 'Failed to update member.';
        this.panelSaving = false;
      },
    });
  }

  familyGroupsFor(policyId: string): FamilyGroup[] {
    return this.familyGroupsByPolicy[policyId] ?? [];
  }

  membersFor(familyGroupId: string): Member[] {
    return this.membersByFamily[familyGroupId] ?? [];
  }

  primaryMember(familyGroupId: string): Member | undefined {
    return this.membersFor(familyGroupId).find((m) => m.relationshipType === MemberRelationship.PRIMARY);
  }

  logoUrl(employer: Employer | null): string | null {
    return this.config.resolveAssetUrl(employer?.logoUrl);
  }

  previewLogoUrl(): string | null {
    return this.pendingLogoPreviewUrl ?? this.logoUrl(this.selectedEmployer);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.selectedEmployer) {
      this.setPendingLogo(file);
      input.value = '';
      return;
    }

    this.uploadingLogo = true;
    this.errorMessage = '';
    this.api.uploadEmployerLogo(this.selectedEmployer.id, file).subscribe({
      next: (updated) => {
        this.uploadingLogo = false;
        const index = this.items.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.items[index] = { ...this.items[index], ...updated };
        this.selectedEmployer = { ...this.selectedEmployer!, ...updated };
        input.value = '';
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to upload logo.';
        this.uploadingLogo = false;
        input.value = '';
      },
    });
  }

  private setPendingLogo(file: File): void {
    this.clearPendingLogo();
    this.pendingLogoFile = file;
    this.pendingLogoPreviewUrl = URL.createObjectURL(file);
  }

  private clearPendingLogo(): void {
    if (this.pendingLogoPreviewUrl) {
      URL.revokeObjectURL(this.pendingLogoPreviewUrl);
    }
    this.pendingLogoFile = null;
    this.pendingLogoPreviewUrl = null;
  }

  memberLabel(member: Member): string {
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
    return name || member.memberNumber;
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createEmployer(body as never).subscribe({
      next: (created) => {
        const file = this.pendingLogoFile;
        this.clearPendingLogo();
        if (!file) {
          this.saving = false;
          this.savedSuccessfully++;
          this.load();
          return;
        }
        this.api.uploadEmployerLogo(created.id, file).subscribe({
          next: () => {
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
          error: (err) => {
            this.errorMessage = err.userMessage ?? 'Employer created, but logo upload failed.';
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
        });
      },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to create employer.'; this.saving = false; },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateEmployer(event.id, event.body as never).subscribe({
      next: () => { this.saving = false; this.savedSuccessfully++; this.load(); },
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update employer.'; this.saving = false; },
    });
  }

  onToggleStatus(item: unknown): void {
    const employer = item as Employer;
    const action = employer.status === 'ACTIVE'
      ? this.api.deactivateEmployer(employer.id)
      : this.api.activateEmployer(employer.id);

    action.subscribe({
      next: () => this.load(),
      error: (err) => { this.errorMessage = err.userMessage ?? 'Failed to update employer status.'; },
    });
  }

  private resetPanelState(): void {
    this.expandedPolicyId = null;
    this.familyGroupsByPolicy = {};
    this.membersByFamily = {};
    this.showAddPolicy = false;
    this.editingPolicyId = null;
    this.showAddFamilyForPolicyId = null;
    this.editingFamily = null;
    this.enrollTarget = null;
    this.dependentTarget = null;
    this.editingMember = null;
    this.panelError = '';
  }

  private emptyPolicyForm() {
    return {
      insuranceCompanyId: '',
      policyNumber: '',
      policyName: '',
      effectiveDate: '',
      expiryDate: '',
      status: 'ACTIVE',
    };
  }

  private emptyEnrollForm(relationshipType: string): EnrollForm {
    return {
      memberNumber: '',
      relationshipType,
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
    };
  }

  private emptyDependentForm(): DependentForm {
    return {
      memberNumber: '',
      relationshipType: MemberRelationship.SPOUSE,
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
    };
  }

  private emptyEditMemberForm(): EditMemberForm {
    return {
      memberNumber: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
      status: 'ACTIVE',
    };
  }
}
