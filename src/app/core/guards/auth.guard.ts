import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserType } from '../models/enums';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated && auth.currentUser) {
    return true;
  }

  if (auth.isAuthenticated) {
    return auth.fetchMe().pipe(
      take(1),
      map((user) => {
        if (user) return true;
        router.navigate(['/login']);
        return false;
      })
    );
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    router.navigate(['/portal']);
    return false;
  }
  return true;
};

export function roleGuard(...allowedRoles: UserType[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser;

    if (user && allowedRoles.includes(user.userType)) {
      return true;
    }

    router.navigate(['/portal']);
    return false;
  };
}

export const adminGuard = roleGuard(UserType.ADMIN);
export const insurerGuard = roleGuard(UserType.INSURER);
export const providerGuard = roleGuard(UserType.PROVIDER);
export const memberGuard = roleGuard(UserType.MEMBER);
export const employerGuard = roleGuard(UserType.EMPLOYER);
