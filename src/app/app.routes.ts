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
        path: 'admin/reference',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/reference/admin-reference.component').then(m => m.AdminReferenceComponent),
      },
      {
        path: 'admin/organizations',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/organizations/admin-organizations.component').then(m => m.AdminOrganizationsComponent),
      },
      {
        path: 'admin/fraud',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/fraud/admin-fraud.component').then(m => m.AdminFraudComponent),
      },
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
