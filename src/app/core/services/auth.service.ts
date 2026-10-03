import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, filter, take, switchMap, map } from 'rxjs';
import { AuthTokens, AuthUser, LoginRequest } from '../models';
import { ConfigService } from './config.service';

const TOKEN_KEY = 'claimitmed_access_token';
const REFRESH_KEY = 'claimitmed_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get apiUrl(): string {
    return this.config.apiUrl;
  }

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private refreshInProgress = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  get accessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get mustChangePassword(): boolean {
    return this.currentUser?.mustChangePassword === true;
  }

  login(credentials: LoginRequest): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((tokens) => this.storeTokens(tokens)),
      switchMap((tokens) =>
        this.fetchMe().pipe(map(() => tokens))
      )
    );
  }

  fetchMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  updateAccount(body: { phone?: string; email?: string | null }): Observable<AuthUser> {
    return this.http.patch<AuthUser>(`${this.apiUrl}/auth/me`, body).pipe(
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(
        tap((tokens) => {
          this.storeTokens(tokens);
          const current = this.currentUserSubject.value;
          if (current) {
            this.currentUserSubject.next({
              ...current,
              mustChangePassword: tokens.mustChangePassword ?? false,
            });
          }
        })
      );
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    if (this.refreshInProgress) {
      return this.refreshSubject.pipe(
        filter((token): token is string => token !== null),
        take(1)
      );
    }

    this.refreshInProgress = true;
    this.refreshSubject.next(null);

    return this.http
      .post<AuthTokens>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((tokens) => {
          this.storeTokens(tokens);
          this.refreshInProgress = false;
          this.refreshSubject.next(tokens.accessToken);
        }),
        switchMap((tokens) => [tokens.accessToken]),
        catchError((err) => {
          this.refreshInProgress = false;
          this.logout();
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.currentUserSubject.next(null);
  }

  initializeAuth(): Observable<AuthUser | null> {
    if (!this.isAuthenticated) {
      return new Observable((observer) => {
        observer.next(null);
        observer.complete();
      });
    }
    return this.fetchMe().pipe(
      catchError(() => {
        this.logout();
        return new Observable<null>((observer) => {
          observer.next(null);
          observer.complete();
        });
      })
    );
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }
}
