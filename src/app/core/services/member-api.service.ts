import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Claim,
  MemberProfile,
  CoveragePool,
  PaginatedResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/member`;

  getProfile(): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`${this.base}/me`);
  }

  getCoverage(): Observable<CoveragePool[]> {
    return this.http.get<CoveragePool[]>(`${this.base}/coverage`);
  }

  getClaims(page = 1, limit = 20): Observable<PaginatedResponse<Claim>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Claim>>(`${this.base}/claims`, { params });
  }

  createReimbursement(body: {
    medicalServiceId: string;
    amount: number;
    description: string;
  }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/reimbursements`, body);
  }
}
