import { Routes } from '@angular/router';
import { authGuard, guestGuard, memberGuard, providerGuard, insurerGuard, adminGuard, employerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'portal', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
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
        path: 'member/reimbursement',
        canActivate: [memberGuard],
        loadComponent: () => import('./features/member/reimbursement/member-reimbursement.component').then(m => m.MemberReimbursementComponent),
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
        loadComponent: () => import('./features/provider/eligibility/provider-eligibility.component').then(m => m.ProviderEligibilityComponent),
      },
      {
        path: 'provider/treatments',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/treatments/provider-treatments.component').then(m => m.ProviderTreatmentsComponent),
      },
      {
        path: 'provider/claims',
        canActivate: [providerGuard],
        loadComponent: () => import('./features/provider/claims/provider-claims.component').then(m => m.ProviderClaimsComponent),
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
        path: 'insurer/members',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/members/insurer-members.component').then(m => m.InsurerMembersComponent),
      },
      {
        path: 'insurer/adjudication',
        canActivate: [insurerGuard],
        loadComponent: () => import('./features/insurer/adjudication/insurer-adjudication.component').then(m => m.InsurerAdjudicationComponent),
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
        path: 'admin/fraud',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/fraud/admin-fraud.component').then(m => m.AdminFraudComponent),
      },
      { path: 'admin/reference', redirectTo: 'admin/benefits', pathMatch: 'full' },
      { path: 'admin/organizations', redirectTo: 'admin/insurers', pathMatch: 'full' },
      // Employer portal
      {
        path: 'employer',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/dashboard/employer-dashboard.component').then(m => m.EmployerDashboardComponent),
      },
      {
        path: 'employer/profile',
        canActivate: [employerGuard],
        loadComponent: () => import('./features/employer/dashboard/employer-dashboard.component').then(m => m.EmployerDashboardComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'portal' },
];
