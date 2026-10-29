import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserType } from '../../../core/models/enums';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user$ = this.auth.currentUser$;
  sidebarCollapsed = false;

  constructor() {
    this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  get navItems(): NavItem[] {
    const user = this.auth.currentUser;
    if (!user) return [];

    const navMap: Record<UserType, NavItem[]> = {
      [UserType.MEMBER]: [
        { label: 'Dashboard', route: '/portal/member', icon: '🏠' },
        { label: 'My Coverage', route: '/portal/member/coverage', icon: '🛡️' },
        { label: 'Treatments', route: '/portal/member/treatments', icon: '🩺' },
        { label: 'My Claims', route: '/portal/member/claims', icon: '📋' },
        { label: 'Reimbursement', route: '/portal/member/reimbursement', icon: '💰' },
        { label: 'Settings', route: '/portal/member/settings', icon: '⚙️' },
      ],
      [UserType.PROVIDER]: [
        { label: 'Dashboard', route: '/portal/provider', icon: '🏠' },
        { label: 'Patient checkin', route: '/portal/provider/treatments', icon: '🩺' },
        { label: 'Preauth', route: '/portal/provider/preauth', icon: '📝' },
        { label: 'Claims', route: '/portal/provider/claims', icon: '📋' },
      ],
      [UserType.INSURER]: [
        { label: 'Dashboard', route: '/portal/insurer', icon: '🏠' },
        { label: 'Policies', route: '/portal/insurer/policies', icon: '📄' },
        { label: 'Network', route: '/portal/insurer/network', icon: '🏥' },
        { label: 'Members', route: '/portal/insurer/members', icon: '👥' },
        { label: 'Preauth', route: '/portal/insurer/preauth', icon: '📝' },
        { label: 'Claims', route: '/portal/insurer/claims', icon: '⚖️' },
      ],
      [UserType.CLAIM_OFFICER]: [
        { label: 'Preauth', route: '/portal/claim-officer/preauth', icon: '📝' },
        { label: 'Claims', route: '/portal/claim-officer/claims', icon: '📋' },
      ],
      [UserType.ADMIN]: [
        { label: 'Dashboard', route: '/portal/admin', icon: '🏠' },
        { label: 'Benefits', route: '/portal/admin/benefits', icon: '💊' },
        { label: 'Medical Services', route: '/portal/admin/medical-services', icon: '🩺' },
        { label: 'Diagnoses', route: '/portal/admin/diagnoses', icon: '📋' },
        { label: 'Insurers', route: '/portal/admin/insurers', icon: '🛡️' },
        { label: 'Policies', route: '/portal/admin/policies', icon: '📄' },
        { label: 'Employers', route: '/portal/admin/employers', icon: '🏢' },
        { label: 'Providers', route: '/portal/admin/providers', icon: '🏥' },
        { label: 'Users', route: '/portal/admin/users', icon: '👤' },
        { label: 'Claims', route: '/portal/admin/claims', icon: '⚖️' },
        { label: 'Fraud Rules', route: '/portal/admin/fraud', icon: '🔍' },
      ],
      [UserType.EMPLOYER]: [
        { label: 'Dashboard', route: '/portal/employer', icon: '🏠' },
        { label: 'Employees', route: '/portal/employer/employees', icon: '👥' },
        { label: 'Policies', route: '/portal/employer/policies', icon: '📄' },
        { label: 'Claims', route: '/portal/employer/claims', icon: '📋' },
      ],
    };

    return navMap[user.userType] ?? [];
  }

  get portalLabel(): string {
    const user = this.auth.currentUser;
    if (!user) return '';
    const labels: Record<UserType, string> = {
      [UserType.MEMBER]: 'Member Portal',
      [UserType.PROVIDER]: 'Provider Portal',
      [UserType.INSURER]: 'Insurer Portal',
      [UserType.CLAIM_OFFICER]: 'Claims Officer Portal',
      [UserType.ADMIN]: 'Admin Portal',
      [UserType.EMPLOYER]: 'Employer Portal',
    };
    return labels[user.userType] ?? 'Portal';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
