import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Claim,
  EligibilityCheck,
  CoveragePool,
  TreatmentCase,
  CostEstimation,
  Provider,
  PaginatedResponse,
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
    lines: { medicalServiceId: string }[];
  }): Observable<CostEstimation> {
    return this.http.post<CostEstimation>(`${this.base}/estimations`, body);
  }

  createTreatment(body: {
    memberId: string;
    providerId?: string;
    treatmentReference?: string;
    treatmentDate?: string;
    treatingPhysician?: string;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments`, body);
  }

  getTreatment(id: string): Observable<TreatmentCase> {
    return this.http.get<TreatmentCase>(`${this.base}/treatments/${id}`);
  }

  addTreatmentItem(treatmentId: string, body: {
    medicalServiceId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/items`, body);
  }

  addTreatmentDiagnosis(treatmentId: string, body: {
    diagnosisId?: string;
    icd10Code?: string;
  }): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/diagnoses`, body);
  }

  completeTreatment(treatmentId: string): Observable<TreatmentCase> {
    return this.http.post<TreatmentCase>(`${this.base}/treatments/${treatmentId}/complete`, {});
  }

  getDraftClaims(page = 1, limit = 20): Observable<PaginatedResponse<Claim>> {
    const params = new HttpParams()
      .set('status', 'DRAFT')
      .set('page', page)
      .set('limit', limit);
    return this.http.get<PaginatedResponse<Claim>>(`${this.base}/claims`, { params });
  }

  getClaim(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.base}/claims/${id}`);
  }

  submitClaim(id: string, paymentResponsibility: string): Observable<Claim> {
    return this.http.post<Claim>(`${this.base}/claims/${id}/submit`, { paymentResponsibility });
  }

  uploadDocument(claimId: string, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/claims/${claimId}/documents`, formData);
  }

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/providers`);
  }
}
