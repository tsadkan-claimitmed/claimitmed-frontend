import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private config: AppConfig = { apiUrl: environment.apiUrl };

  load(): Observable<void> {
    return this.http.get<AppConfig>('/assets/config.json').pipe(
      tap((cfg) => {
        if (cfg?.apiUrl) {
          this.config = cfg;
        }
      }),
      catchError(() => of(null)),
      map(() => undefined)
    );
  }

  get apiUrl(): string {
    return this.config.apiUrl.replace(/\/$/, '');
  }

  /** Origin used for non-API static files when the API URL is absolute. */
  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/v\d+$/, '');
  }

  /**
   * Uploads are stored as `/uploads/...`. Serve them through the API base
   * (`/api/v1/uploads/...`) so same-origin `/api` proxies reach the backend.
   */
  resolveAssetUrl(path: string | null | undefined): string | null {
    if (!path) {
      return null;
    }
    if (/^(https?:|blob:)/i.test(path)) {
      return path;
    }
    const relative = path.startsWith('/') ? path : `/${path}`;
    if (relative.startsWith('/uploads/')) {
      return `${this.apiUrl}${relative}`;
    }
    return `${this.assetBaseUrl}${relative}`;
  }
}
