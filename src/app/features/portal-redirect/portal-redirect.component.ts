import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserType } from '../../core/models/enums';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-portal-redirect',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  template: `<app-loading-spinner message="Loading your portal..." />`,
})
export class PortalRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly portalRoutes: Record<UserType, string> = {
    [UserType.MEMBER]: '/portal/member',
    [UserType.PROVIDER]: '/portal/provider',
    [UserType.INSURER]: '/portal/insurer',
    [UserType.CLAIM_OFFICER]: '/portal/claim-officer/claims',
    [UserType.ADMIN]: '/portal/admin',
    [UserType.EMPLOYER]: '/portal/employer',
  };

  ngOnInit(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.router.navigate([this.portalRoutes[user.userType] ?? '/login']);
    } else {
      this.auth.fetchMe().subscribe({
        next: (u) => this.router.navigate([this.portalRoutes[u.userType] ?? '/login']),
        error: () => this.router.navigate(['/login']),
      });
    }
  }
}
