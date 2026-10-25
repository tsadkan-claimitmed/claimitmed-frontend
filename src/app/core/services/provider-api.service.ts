import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Claim,
  ClaimDetail,
  EligibilityCheck,
  CoveragePool,
  TreatmentCase,
  TreatmentDetail,
  TreatmentDocument,
  CostEstimation,
  Provider,
  PaginatedResponse,
  MedicalService,
  ServiceFeeLookup,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ProviderApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return this.config.apiUrl;
  }

  checkEligibility(nationalId: string): Observable<EligibilityCheck> {
    const params = new HttpParams().set('national_id', nationalId);
    return this.http.get<EligibilityCheck>(`${this.base}/eligibility/check`, { params });
  }

  getCoverage(memberId: string): Observable<CoveragePool[]> {
    const params = new HttpParams().set('member_id', memberId);
    return this.http.get<CoveragePool[]>(`${this.base}/eligibility/coverage`, { params });
  }

  createEstimation(body: {
    memberId: string;
    treatmentCaseId?: string;
    lines: { medicalServiceId: string; unitPrice?: number; quantity?: number }[];
  }): Observable<CostEstimation> {
    return this.http.post<CostEstimation>(`${this.base}/estimations`, body, {
      headers: { 'X-Skip-Success-Notification': 'true' },
    });
  }

  finalizeVisit(body: {
    memberId: string;
    providerId?: string;
    treatmentReference?: string;
    treatmentDate?: string;
    treatingPhysician?: string;
    items: {
      medicalServiceId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/finalize-visit`, body);
  }

  submitPreauthRequest(body: {
    memberId: string;
    providerId?: string;
    treatmentReference?: string;
    treatmentDate?: string;
    treatingPhysician?: string;
    items: {
      medicalServiceId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/submit-preauth-request`, body);
  }

  createTreatment(body: {
    memberId: string;
    providerId?: string;
    treatmentReference?: string;
    treatmentDate?: string;
    treatingPhysician?: string;
    purpose?: string;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments`, body);
  }

  getPreauthRequests(params: {
    tab: string;
    page?: number;
    limit?: number;
    search?: string;
    employer?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<PaginatedResponse<TreatmentCase>> {
    let paramsBuilder = new HttpParams()
      .set('tab', params.tab)
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));
    if (params.search?.trim()) paramsBuilder = paramsBuilder.set('search', params.search.trim());
    if (params.employer?.trim()) paramsBuilder = paramsBuilder.set('employer', params.employer.trim());
    if (params.dateFrom) paramsBuilder = paramsBuilder.set('dateFrom', params.dateFrom);
    if (params.dateTo) paramsBuilder = paramsBuilder.set('dateTo', params.dateTo);
    return this.http.get<PaginatedResponse<TreatmentCase>>(`${this.base}/treatments/preauth`, {
      params: paramsBuilder,
    });
  }

  startVisitFromPreauth(treatmentId: string): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/start-visit`, {});
  }

  requestPreauth(treatmentId: string): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/request-preauth`, {});
  }

  getTreatment(id: string): Observable<TreatmentDetail> {
    return this.http.get<TreatmentDetail>(`${this.base}/treatments/${id}`);
  }

  addTreatmentItem(treatmentId: string, body: {
    medicalServiceId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/items`, body);
  }

  removeTreatmentItem(treatmentId: string, itemId: string): Observable<TreatmentCase> {
    return this.http.delete<TreatmentCase>(`${this.base}/treatments/${treatmentId}/items/${itemId}`);
  }

  addTreatmentDiagnosis(treatmentId: string, body: {
    diagnosisId?: string;
    icd10Code?: string;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/diagnoses`, body);
  }

  updateTreatment(
    treatmentId: string,
    body: { treatingPhysician?: string; treatmentReference?: string },
  ): Observable<TreatmentCase> {
    return this.http.patch<TreatmentCase>(`${this.base}/treatments/${treatmentId}`, body);
  }

  uploadTreatmentDocuments(treatmentId: string, files: File[]): Observable<TreatmentDocument[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post<TreatmentDocument[]>(`${this.base}/treatments/${treatmentId}/documents`, formData);
  }

  removeTreatmentDocument(treatmentId: string, documentId: string) {
    return this.http.delete(`${this.base}/treatments/${treatmentId}/documents/${documentId}`, {
      headers: { 'X-Skip-Success-Notification': 'true' },
    });
  }

  cancelTreatment(
    treatmentId: string,
    body: { reason: string; acknowledgedIrreversible: boolean },
  ): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/cancel`, body, {
      headers: { 'X-Skip-Success-Notification': 'true' },
    });
  }

  completeTreatment(
    treatmentId: string,
    body?: {
      treatingPhysician?: string;
      treatmentReference?: string;
      patientPaidAmount?: number;
      claimAmountScope?: string;
      specificAmount?: number;
      paymentResponsibility?: string;
      claimVarianceReason?: string;
      skipClaim?: boolean;
      submittedClaimAmount?: number;
    },
  ): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/complete`, body ?? {}, {
      headers: { 'X-Skip-Success-Notification': 'true' },
    });
  }

  getTreatments(params: {
    tab: string;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
  }): Observable<PaginatedResponse<TreatmentCase>> {
    let paramsBuilder = new HttpParams()
      .set('tab', params.tab)
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) {
      paramsBuilder = paramsBuilder.set('search', params.search.trim());
    }
    if (params.sort) {
      paramsBuilder = paramsBuilder.set('sort', params.sort);
    }

    return this.http.get<PaginatedResponse<TreatmentCase>>(`${this.base}/treatments`, {
      params: paramsBuilder,
    });
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

    return this.http.get<PaginatedResponse<Claim>>(`${this.base}/claims`, { params: paramsBuilder });
  }

  getClaimAmountBounds(status: string): Observable<{ min: number; max: number }> {
    const params = new HttpParams().set('status', status);
    return this.http.get<{ min: number; max: number }>(`${this.base}/claims/amount-bounds`, { params });
  }

  getDraftClaims(page = 1, limit = 1): Observable<PaginatedResponse<Claim>> {
    return this.getClaims({ status: 'DRAFT', page, limit });
  }

  getClaim(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${this.base}/claims/${id}`);
  }

  submitClaim(
    id: string,
    paymentResponsibility: string,
    claimAmountScope?: string,
    specificAmount?: number,
  ): Observable<Claim> {
    const body: Record<string, unknown> = { paymentResponsibility };
    if (claimAmountScope) {
      body['claimAmountScope'] = claimAmountScope;
    }
    if (specificAmount != null) {
      body['specificAmount'] = specificAmount;
    }
    return this.http.post<Claim>(`${this.base}/claims/${id}/submit`, body);
  }

  uploadDocument(claimId: string, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/claims/${claimId}/documents`, formData);
  }

  resubmitClaim(id: string, options: { files?: File[]; comments?: string }): Observable<Claim> {
    const formData = new FormData();
    if (options.comments?.trim()) {
      formData.append('comments', options.comments.trim());
    }
    for (const file of options.files ?? []) {
      formData.append('files', file, file.name);
    }
    return this.http.post<Claim>(`${this.base}/claims/${id}/resubmit`, formData);
  }

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/providers`);
  }

  searchMedicalServices(search = '', limit = 20): Observable<MedicalService[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<MedicalService[]>(`${this.base}/medical-services`, { params });
  }

  searchPreauthServices(memberId: string, search = '', limit = 20): Observable<MedicalService[]> {
    return this.searchMemberServices(`${this.base}/treatments/preauth-services`, memberId, search, limit);
  }

  searchCheckinServices(memberId: string, search = '', limit = 20): Observable<MedicalService[]> {
    return this.searchMemberServices(`${this.base}/treatments/checkin-services`, memberId, search, limit);
  }

  private searchMemberServices(
    url: string,
    memberId: string,
    search: string,
    limit: number,
  ): Observable<MedicalService[]> {
    let params = new HttpParams()
      .set('memberId', memberId)
      .set('limit', String(limit));
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<MedicalService[]>(url, { params });
  }

  getMedicalService(id: string): Observable<MedicalService> {
    return this.http.get<MedicalService>(`${this.base}/medical-services/${id}`);
  }

  getServiceFee(memberId: string, medicalServiceId: string): Observable<ServiceFeeLookup> {
    const params = new HttpParams()
      .set('memberId', memberId)
      .set('medicalServiceId', medicalServiceId);
    return this.http.get<ServiceFeeLookup>(`${this.base}/treatments/service-fee`, { params });
  }
}
