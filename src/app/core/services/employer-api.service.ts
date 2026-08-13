import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employer } from '../models';

@Injectable({ providedIn: 'root' })
export class EmployerApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getEmployers(): Observable<Employer[]> {
    return this.http.get<Employer[]>(`${this.base}/employers`);
  }
}
