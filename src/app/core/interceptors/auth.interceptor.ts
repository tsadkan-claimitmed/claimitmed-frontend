import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const skipRefreshRetry =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/change-password');

      if (error.status === 401 && !skipRefreshRetry) {
        return auth.refreshAccessToken().pipe(
          switchMap((newToken) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            auth.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';
      if (error.error?.detail) {
        message = error.error.detail;
      } else if (error.error?.title) {
        message = error.error.title;
      } else if (error.status === 0) {
        message = 'Unable to connect to the server. Please check your connection.';
      } else if (error.status === 403) {
        message = 'You do not have permission to perform this action.';
      } else       if (error.status === 404) {
        message = 'The requested resource was not found.';
      } else if (Array.isArray(error.error?.message)) {
        message = error.error.message.join('; ');
      } else if (typeof error.error?.message === 'string') {
        message = error.error.message;
      }
      return throwError(() => ({ ...error, userMessage: message }));
    })
  );
};
