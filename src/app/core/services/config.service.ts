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
    return this.config.apiUrl;
  }
}
