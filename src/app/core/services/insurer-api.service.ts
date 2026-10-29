import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Claim,
  ClaimDetail,
  Policy,
  Member,
  MemberDetail,
  MemberListItem,
  Insurer,
  InsurerNetworkLink,
  EligibilityCheck,
  CoveragePool,
  TreatmentCase,
  PreauthReviewDetail,
  PaginatedResponse,
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

  getMembers(params: {
    page?: number;
    limit?: number;
    search?: string;
    policyId?: string;
    employerId?: string;
    status?: string;
    relationshipType?: string;
    sort?: string;
  } = {}): Observable<PaginatedResponse<MemberListItem>> {
    let query = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) query = query.set('search', params.search.trim());
    if (params.policyId) query = query.set('policyId', params.policyId);
    if (params.employerId) query = query.set('employerId', params.employerId);
    if (params.status) query = query.set('status', params.status);
    if (params.relationshipType) query = query.set('relationshipType', params.relationshipType);
    if (params.sort) query = query.set('sort', params.sort);

    return this.http.get<PaginatedResponse<MemberListItem>>(`${this.base}/insurer/members`, { params: query });
  }

  getMemberDetail(memberId: string): Observable<MemberDetail> {
    return this.http.get<MemberDetail>(`${this.base}/insurer/members/${memberId}`);
  }

  createPolicy(body: Record<string, unknown>): Observable<Policy> {
    return this.http.post<Policy>(`${this.base}/policies`, body);
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

  getClaim(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${this.base}/claims/${id}`);
  }

  getClaims(params: {
    status: string;
    page?: number;
    limit?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentResponsibility?: string;
    minAmount?: number;
    maxAmount?: number;
    sort?: string;
    insuranceCompanyId?: string;
  }): Observable<PaginatedResponse<Claim>> {
    let paramsBuilder = new HttpParams()
      .set('status', params.status)
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) {
      paramsBuilder = paramsBuilder.set('search', params.search.trim());
    }
    if (params.dateFrom) {
      paramsBuilder = paramsBuilder.set('dateFrom', params.dateFrom);
    }
    if (params.dateTo) {
      paramsBuilder = paramsBuilder.set('dateTo', params.dateTo);
    }
    if (params.paymentResponsibility) {
      paramsBuilder = paramsBuilder.set('paymentResponsibility', params.paymentResponsibility);
    }
    if (params.minAmount !== undefined) {
      paramsBuilder = paramsBuilder.set('minAmount', String(params.minAmount));
    }
    if (params.maxAmount !== undefined) {
      paramsBuilder = paramsBuilder.set('maxAmount', String(params.maxAmount));
    }
    if (params.sort) {
      paramsBuilder = paramsBuilder.set('sort', params.sort);
    }
    if (params.insuranceCompanyId) {
      paramsBuilder = paramsBuilder.set('insuranceCompanyId', params.insuranceCompanyId);
    }

    return this.http.get<PaginatedResponse<Claim>>(`${this.base}/claims`, { params: paramsBuilder });
  }

  getClaimAmountBounds(status: string, insuranceCompanyId?: string): Observable<{ min: number; max: number }> {
    let params = new HttpParams().set('status', status);
    if (insuranceCompanyId) {
      params = params.set('insuranceCompanyId', insuranceCompanyId);
    }
    return this.http.get<{ min: number; max: number }>(`${this.base}/claims/amount-bounds`, { params });
  }

  approveClaim(id: string, body: { approvedAmount?: number; comments?: string }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/approve`, body);
  }

  rejectClaim(id: string, body: { reason: string; comments?: string }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/reject`, body);
  }

  requestClaimInfo(id: string, body: { reason: string; comments?: string }): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/request-info`, body);
  }

  processPayment(paymentId: string): Observable<unknown> {
    return this.http.post(`${this.base}/payments/${paymentId}/process`, {});
  }

  getPendingPreauth(params: {
    page?: number;
    limit?: number;
    search?: string;
    tab?: string;
  }): Observable<PaginatedResponse<TreatmentCase>> {
    let query = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20))
      .set('tab', params.tab ?? 'UNDER_REVIEW');
    if (params.search?.trim()) {
      query = query.set('search', params.search.trim());
    }
    return this.http.get<PaginatedResponse<TreatmentCase>>(`${this.base}/preauth/pending`, { params: query });
  }

  getPreauthDetail(treatmentId: string): Observable<PreauthReviewDetail> {
    return this.http.get<PreauthReviewDetail>(`${this.base}/preauth/${treatmentId}`);
  }

  approvePreauth(
    treatmentId: string,
    body?: { comments?: string; approvalScope?: 'FULL' | 'SPECIFIC'; approvedAmount?: number },
  ): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/preauth/${treatmentId}/approve`, body ?? {});
  }

  denyPreauth(treatmentId: string, reason: string): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/preauth/${treatmentId}/deny`, { reason });
  }

  decidePreauth(
    treatmentId: string,
    lines: {
      itemId: string;
      decision: 'APPROVED' | 'DENIED';
      approvedAmount?: number;
      reason?: string;
    }[],
  ): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/preauth/${treatmentId}/decide`, { lines });
  }

  getNetwork(insuranceCompanyId: string): Observable<InsurerNetworkLink[]> {
    return this.http.get<InsurerNetworkLink[]>(`${this.base}/insurers/${insuranceCompanyId}/network`);
  }

  linkProviderToNetwork(insuranceCompanyId: string, providerId: string): Observable<InsurerNetworkLink> {
    return this.http.post<InsurerNetworkLink>(`${this.base}/insurers/${insuranceCompanyId}/network`, { providerId });
  }
}
