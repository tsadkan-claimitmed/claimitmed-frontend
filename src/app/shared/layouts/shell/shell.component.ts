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

  get navItems(): NavItem[] {
    const user = this.auth.currentUser;
    if (!user) return [];

    const navMap: Record<UserType, NavItem[]> = {
      [UserType.MEMBER]: [
        { label: 'Dashboard', route: '/portal/member', icon: '🏠' },
        { label: 'My Coverage', route: '/portal/member/coverage', icon: '🛡️' },
        { label: 'My Claims', route: '/portal/member/claims', icon: '📋' },
        { label: 'Reimbursement', route: '/portal/member/reimbursement', icon: '💰' },
      ],
      [UserType.PROVIDER]: [
        { label: 'Dashboard', route: '/portal/provider', icon: '🏠' },
        { label: 'Eligibility', route: '/portal/provider/eligibility', icon: '✅' },
        { label: 'Treatments', route: '/portal/provider/treatments', icon: '🩺' },
        { label: 'Draft Claims', route: '/portal/provider/claims', icon: '📋' },
      ],
      [UserType.INSURER]: [
        { label: 'Dashboard', route: '/portal/insurer', icon: '🏠' },
        { label: 'Policies', route: '/portal/insurer/policies', icon: '📄' },
        { label: 'Members', route: '/portal/insurer/members', icon: '👥' },
        { label: 'Adjudication', route: '/portal/insurer/adjudication', icon: '⚖️' },
      ],
      [UserType.ADMIN]: [
        { label: 'Dashboard', route: '/portal/admin', icon: '🏠' },
        { label: 'Reference Data', route: '/portal/admin/reference', icon: '📚' },
        { label: 'Organizations', route: '/portal/admin/organizations', icon: '🏢' },
        { label: 'Fraud Rules', route: '/portal/admin/fraud', icon: '🔍' },
      ],
      [UserType.EMPLOYER]: [
        { label: 'Dashboard', route: '/portal/employer', icon: '🏠' },
        { label: 'Organization', route: '/portal/employer/profile', icon: '🏢' },
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
