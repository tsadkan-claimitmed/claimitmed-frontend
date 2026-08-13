import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Claim,
  Policy,
  Member,
  Insurer,
  EligibilityCheck,
  CoveragePool,
} from '../models';

@Injectable({ providedIn: 'root' })
export class InsurerApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return this.config.apiUrl;
  }

  getInsurers(): Observable<Insurer[]> {
    return this.http.get<Insurer[]>(`${this.base}/insurers`);
  }

  getPolicies(): Observable<Policy[]> {
    return this.http.get<Policy[]>(`${this.base}/policies`);
  }

  createPolicy(body: Record<string, unknown>): Observable<Policy> {
    return this.http.post<Policy>(`${this.base}/policies`, body);
  }

  getMembers(policyId?: string, familyGroupId?: string, page = 1, limit = 20): Observable<{ data: Member[]; total: number }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (policyId) params = params.set('policyId', policyId);
    if (familyGroupId) params = params.set('familyGroupId', familyGroupId);
    return this.http.get<{ data: Member[]; total: number }>(`${this.base}/members`, { params });
  }

  enrollMember(body: Record<string, unknown>): Observable<Member> {
    return this.http.post<Member>(`${this.base}/members`, body);
  }

  checkEligibility(nationalId: string): Observable<EligibilityCheck> {
    const params = new HttpParams().set('national_id', nationalId);
    return this.http.get<EligibilityCheck>(`${this.base}/eligibility/check`, { params });
  }

  getCoverage(memberId: string): Observable<CoveragePool[]> {
    const params = new HttpParams().set('member_id', memberId);
    return this.http.get<CoveragePool[]>(`${this.base}/eligibility/coverage`, { params });
  }

  getClaim(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.base}/claims/${id}`);
  }

  approveClaim(id: string, body: { approvedAmount?: number; comments?: string }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/approve`, body);
  }

  rejectClaim(id: string, body: { reason: string; comments?: string }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/reject`, body);
  }

  processPayment(paymentId: string): Observable<unknown> {
    return this.http.post(`${this.base}/payments/${paymentId}/process`, {});
  }

  getNetwork(insuranceCompanyId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/insurers/${insuranceCompanyId}/network`);
  }
}
