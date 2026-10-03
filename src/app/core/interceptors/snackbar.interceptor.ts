import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { SnackbarService } from '../services/snackbar.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function shouldSkipNotification(req: HttpRequest<unknown>): boolean {
  const url = req.url.toLowerCase();
  return (
    url.includes('/assets/') ||
    url.endsWith('/assets/config.json') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/login') ||
    url.includes('/auth/change-password') ||
    req.headers.has('X-Skip-Success-Notification')
  );
}

function shouldSkipErrorNotification(req: HttpRequest<unknown>, _error: unknown): boolean {
  return shouldSkipNotification(req);
}

function extractErrorMessage(error: unknown): string {
  const enriched = error as { userMessage?: string };
  if (enriched.userMessage) {
    return enriched.userMessage;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return 'An unexpected error occurred';
  }

  const body = error.error as { detail?: string; title?: string; message?: string | string[] } | null;

  if (body?.detail) {
    return body.detail;
  }

  if (Array.isArray(body?.message)) {
    return body.message.join('; ');
  }

  if (typeof body?.message === 'string') {
    return body.message;
  }

  if (body?.title) {
    return body.title;
  }

  if (error.status === 0) {
    return 'Unable to connect to the server. Please check your connection.';
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error.status >= 500) {
    return 'A server error occurred. Please try again.';
  }

  return 'Request failed. Please try again.';
}

function successMessage(req: HttpRequest<unknown>): string {
  const url = req.url.toLowerCase();
  const method = req.method.toUpperCase();

  if (method === 'DELETE') {
    return 'Deleted successfully';
  }

  if (method === 'POST') {
    if (url.includes('/activate')) {
      return 'Activated successfully';
    }
    if (url.includes('/deactivate')) {
      return 'Deactivated successfully';
    }
    if (url.includes('/logo')) {
      return 'Uploaded successfully';
    }
    return 'Created successfully';
  }

  if (method === 'PATCH' || method === 'PUT') {
    return 'Saved successfully';
  }

  return 'Request completed successfully';
}

export const snackbarInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(SnackbarService);
  const skip = shouldSkipNotification(req);

  return next(req).pipe(
    tap((event) => {
      if (skip || !(event instanceof HttpResponse)) {
        return;
      }

      if (MUTATING_METHODS.has(req.method.toUpperCase()) && event.status >= 200 && event.status < 300) {
        snackbar.success(successMessage(req));
      }
    }),
    catchError((error: unknown) => {
      if (!shouldSkipErrorNotification(req, error)) {
        snackbar.error(extractErrorMessage(error));
      }

      return throwError(() => error);
    }),
  );
};
