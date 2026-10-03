import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserType } from '../models/enums';

function ensureAuthenticated(auth: AuthService, router: Router) {
  if (auth.isAuthenticated && auth.currentUser) {
    return { authenticated: true as const, user: auth.currentUser };
  }

  if (auth.isAuthenticated) {
    return null;
  }

  router.navigate(['/login']);
  return { authenticated: false as const, user: null };
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const immediate = ensureAuthenticated(auth, router);
  if (immediate) {
    if (immediate.authenticated && immediate.user.mustChangePassword) {
      router.navigate(['/change-password']);
      return false;
    }
    return immediate.authenticated;
  }

  return auth.fetchMe().pipe(
    take(1),
    map((user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      if (user.mustChangePassword) {
        router.navigate(['/change-password']);
        return false;
      }
      return true;
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    if (auth.mustChangePassword) {
      router.navigate(['/change-password']);
    } else {
      router.navigate(['/portal']);
    }
    return false;
  }
  return true;
};

export const changePasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  if (auth.currentUser) {
    if (!auth.currentUser.mustChangePassword) {
      router.navigate(['/portal']);
      return false;
    }
    return true;
  }

  return auth.fetchMe().pipe(
    take(1),
    map((user) => {
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      if (!user.mustChangePassword) {
        router.navigate(['/portal']);
        return false;
      }
      return true;
    })
  );
};

export function roleGuard(...allowedRoles: UserType[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser;

    if (user?.mustChangePassword) {
      router.navigate(['/change-password']);
      return false;
    }

    if (user && allowedRoles.includes(user.userType)) {
      return true;
    }

    router.navigate(['/portal']);
    return false;
  };
}

export const adminGuard = roleGuard(UserType.ADMIN);
export const insurerGuard = roleGuard(UserType.INSURER);
export const claimOfficerGuard = roleGuard(UserType.CLAIM_OFFICER);
export const providerGuard = roleGuard(UserType.PROVIDER);
export const memberGuard = roleGuard(UserType.MEMBER);
export const employerGuard = roleGuard(UserType.EMPLOYER);
