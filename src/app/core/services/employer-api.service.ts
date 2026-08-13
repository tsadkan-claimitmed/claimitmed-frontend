import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Employer } from '../models';

@Injectable({ providedIn: 'root' })
export class EmployerApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return this.config.apiUrl;
  }

  getEmployers(): Observable<Employer[]> {
    return this.http.get<Employer[]>(`${this.base}/employers`);
  }
}
