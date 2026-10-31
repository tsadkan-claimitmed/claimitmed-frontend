import { Routes } from '@angular/router';
import { authGuard, guestGuard, memberGuard, providerGuard, insurerGuard, claimOfficerGuard, adminGuard, employerGuard, changePasswordGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'portal', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'change-password',
    canActivate: [changePasswordGuard],
    loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent),
  },
  {
    path: 'portal',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/portal-redirect/portal-redirect.component').then(m => m.PortalRedirectComponent),
      },
      // Member portal
      {
        path: 'member',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/dashboard/member-dashboard.component').then(m => m.MemberDashboardComponent),
      },
      {
        path: 'member/coverage',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/coverage/member-coverage.component').then(m => m.MemberCoverageComponent),
      },
      {
        path: 'member/claims',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/claims/member-claims.component').then(m => m.MemberClaimsComponent),
      },
      {
        path: 'member/claims/:id',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/claims/member-claim-detail.component').then(m => m.MemberClaimDetailComponent),
      },
      {
        path: 'member/treatments',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/treatments/member-treatments.component').then(m => m.MemberTreatmentsComponent),
      },
      {
        path: 'member/treatments/:id',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/treatments/member-treatment-detail.component').then(m => m.MemberTreatmentDetailComponent),
      },
      {
        path: 'member/reimbursement',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/reimbursement/member-reimbursement.component').then(m => m.MemberReimbursementComponent),
      },
      {
        path: 'member/settings',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/settings/member-settings.component').then(m => m.MemberSettingsComponent),
      },
      // Provider portal
      {
        path: 'provider',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/dashboard/provider-dashboard.component').then(m => m.ProviderDashboardComponent),
      },
      {
        path: 'provider/eligibility',
        canActivate: [providerGuard],
        redirectTo: 'provider/treatments/new',
        pathMatch: 'full',
      },
      {
        path: 'provider/treatments',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-treatments.component').then(m => m.ProviderTreatmentsComponent),
      },
      {
        path: 'provider/treatments/new',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-visit.component').then(m => m.ProviderVisitComponent),
      },
      {
        path: 'provider/treatments/:id',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-treatment-detail.component').then(m => m.ProviderTreatmentDetailComponent),
      },
      {
        path: 'provider/preauth',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/preauth/provider-preauth.component').then(m => m.ProviderPreauthComponent),
      },
      {
        path: 'provider/preauth/new',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-visit.component').then(m => m.ProviderVisitComponent),
        data: { purpose: 'PREAUTH' },
      },
      {
        path: 'provider/preauth/:id',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-treatment-detail.component').then(m => m.ProviderTreatmentDetailComponent),
      },
      {
        path: 'provider/claims',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/claims/provider-claims.component').then(m => m.ProviderClaimsComponent),
      },
      {
        path: 'provider/claims/:id',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/claims/provider-claim-detail.component').then(m => m.ProviderClaimDetailComponent),
      },
      // Insurer portal
      {
        path: 'insurer',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/dashboard/insurer-dashboard.component').then(m => m.InsurerDashboardComponent),
      },
      {
        path: 'insurer/policies',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/policies/insurer-policies.component').then(m => m.InsurerPoliciesComponent),
      },
      {
        path: 'insurer/policies/:id',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/policies/insurer-policy-detail-page.component').then(m => m.InsurerPolicyDetailPageComponent),
      },
      {
        path: 'insurer/network',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/network/insurer-network.component').then(m => m.InsurerNetworkComponent),
      },
      {
        path: 'insurer/members',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/members/insurer-members.component').then(m => m.InsurerMembersComponent),
      },
      {
        path: 'insurer/members/:id',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/members/insurer-member-detail.component').then(m => m.InsurerMemberDetailComponent),
      },
      {
        path: 'insurer/claim-officers',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/claim-officers/insurer-claim-officers.component').then(m => m.InsurerClaimOfficersComponent),
      },
      {
        path: 'insurer/claims',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claims.component').then(m => m.InsurerClaimsComponent),
        data: {
          pageSubtitle: 'View submitted claims. Claim officers handle approval and other adjudication actions.',
        },
      },
      {
        path: 'insurer/claims/:id',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claim-detail.component').then(m => m.InsurerClaimDetailComponent),
        data: { showFraudTab: true, preauthBasePath: '/portal/insurer/preauth', readOnly: true },
      },
      {
        path: 'insurer/adjudication',
        canActivate: [insurerGuard],
        redirectTo: 'insurer/claims',
        pathMatch: 'full',
      },
      {
        path: 'insurer/preauth',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/preauth/insurer-preauth.component').then(m => m.InsurerPreauthComponent),
      },
      {
        path: 'insurer/preauth/:id',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/preauth/insurer-preauth-detail.component').then(m => m.InsurerPreauthDetailComponent),
        data: { claimsBasePath: '/portal/insurer/claims' },
      },
      // Claim officer portal
      {
        path: 'claim-officer',
        canActivate: [claimOfficerGuard],
        redirectTo: 'claim-officer/claims',
        pathMatch: 'full',
      },
      {
        path: 'claim-officer/insurers',
        canActivate: [claimOfficerGuard],
        loadComponent: () => import('./features/claim-officer/insurers/officer-insurers.component').then(m => m.OfficerInsurersComponent),
      },
      {
        path: 'claim-officer/preauth',
        canActivate: [claimOfficerGuard],
        loadComponent: () => import('./features/insurer/preauth/insurer-preauth.component').then(m => m.InsurerPreauthComponent),
      },
      {
        path: 'claim-officer/preauth/:id',
        canActivate: [claimOfficerGuard],
        loadComponent: () => import('./features/insurer/preauth/insurer-preauth-detail.component').then(m => m.InsurerPreauthDetailComponent),
        data: { claimsBasePath: '/portal/claim-officer/claims' },
      },
      {
        path: 'claim-officer/claims',
        canActivate: [claimOfficerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claims.component').then(m => m.InsurerClaimsComponent),
        data: {
          showInsurerFilter: true,
          claimsBasePath: '/portal/claim-officer/claims',
          pageTitle: 'All Claims',
          pageSubtitle: 'Review and adjudicate claims for the insurers assigned to you.',
        },
      },
      {
        path: 'claim-officer/claims/:id',
        canActivate: [claimOfficerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claim-detail.component').then(m => m.InsurerClaimDetailComponent),
        data: {
          claimsBasePath: '/portal/claim-officer/claims',
          preauthBasePath: '/portal/claim-officer/preauth',
          pageTitle: 'Claim Adjudication',
          showFraudTab: true,
        },
      },
      // Admin portal
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'admin/benefits',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/benefits/admin-benefits.component').then(m => m.AdminBenefitsComponent),
      },
      {
        path: 'admin/medical-services',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/medical-services/admin-medical-services.component').then(m => m.AdminMedicalServicesComponent),
      },
      {
        path: 'admin/diagnoses',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/diagnoses/admin-diagnoses.component').then(m => m.AdminDiagnosesComponent),
      },
      {
        path: 'admin/insurers',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/insurers/admin-insurers.component').then(m => m.AdminInsurersComponent),
      },
      {
        path: 'admin/policies',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/policies/admin-policies.component').then(m => m.AdminPoliciesComponent),
      },
      {
        path: 'admin/policies/:id',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/policies/admin-policy-detail-page.component').then(m => m.AdminPolicyDetailPageComponent),
      },
      {
        path: 'admin/employers',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/employers/admin-employers.component').then(m => m.AdminEmployersComponent),
      },
      {
        path: 'admin/providers',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/providers/admin-providers.component').then(m => m.AdminProvidersComponent),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'admin/fraud',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/fraud/admin-fraud.component').then(m => m.AdminFraudComponent),
      },
      {
        path: 'admin/claims',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claims.component').then(m => m.InsurerClaimsComponent),
        data: {
          showInsurerFilter: true,
          claimsBasePath: '/portal/admin/claims',
          pageTitle: 'All Claims',
          pageSubtitle: 'View claims across all insurers, including attachments returned by providers.',
        },
      },
      {
        path: 'admin/claims/:id',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claim-detail.component').then(m => m.InsurerClaimDetailComponent),
        data: {
          readOnly: true,
          showFraudTab: true,
          claimsBasePath: '/portal/admin/claims',
          pageTitle: 'Claim Detail',
        },
      },
      { path: 'admin/policy-coverage', redirectTo: 'admin/policies', pathMatch: 'full' },
      { path: 'admin/reference', redirectTo: 'admin/benefits', pathMatch: 'full' },
      { path: 'admin/organizations', redirectTo: 'admin/insurers', pathMatch: 'full' },
      // Employer portal
      {
        path: 'employer',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/dashboard/employer-dashboard.component').then(m => m.EmployerDashboardComponent),
      },
      {
        path: 'employer/employees',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/employees/employer-employees.component').then(m => m.EmployerEmployeesComponent),
      },
      {
        path: 'employer/employees/:id',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/employees/employer-employee-detail.component').then(m => m.EmployerEmployeeDetailComponent),
      },
      {
        path: 'employer/policies',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/policies/employer-policies.component').then(m => m.EmployerPoliciesComponent),
      },
      {
        path: 'employer/policies/:id',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/policies/employer-policy-detail-page.component').then(m => m.EmployerPolicyDetailPageComponent),
      },
      {
        path: 'employer/claims',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claims.component').then(m => m.InsurerClaimsComponent),
        data: {
          claimsBasePath: '/portal/employer/claims',
          pageTitle: 'Employee Claims',
          pageSubtitle: 'Claims for employees covered by your policies.',
        },
      },
      {
        path: 'employer/claims/:id',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/insurer/claims/insurer-claim-detail.component').then(m => m.InsurerClaimDetailComponent),
        data: {
          readOnly: true,
          claimsBasePath: '/portal/employer/claims',
          pageTitle: 'Claim Detail',
        },
      },
    ],
  },
  { path: '**', redirectTo: 'portal' },
];
