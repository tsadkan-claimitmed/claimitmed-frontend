import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Claim,
  ClaimDetail,
  MemberProfile,
  MemberPolicyOverview,
  MemberInNetworkProvider,
  MemberBankAccount,
  MemberTreatmentListItem,
  CoveragePool,
  PaginatedResponse,
  TreatmentDetail,
} from '../models';

@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return `${this.config.apiUrl}/member`;
  }

  getProfile(): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`${this.base}/me`);
  }

  getCoverage(): Observable<CoveragePool[]> {
    return this.http.get<CoveragePool[]>(`${this.base}/coverage`);
  }

  getPolicyOverview(): Observable<MemberPolicyOverview> {
    return this.http.get<MemberPolicyOverview>(`${this.base}/policy`);
  }

  getInNetworkProviders(): Observable<MemberInNetworkProvider[]> {
    return this.http.get<MemberInNetworkProvider[]>(`${this.base}/policy/in-network-providers`);
  }

  getBankAccount(): Observable<MemberBankAccount | null> {
    return this.http.get<MemberBankAccount | null>(`${this.base}/bank-account`);
  }

  saveBankAccount(body: {
    bankName: string;
    accountNumber: string;
    accountHolderName?: string;
    currency?: string;
  }): Observable<MemberBankAccount> {
    return this.http.post<MemberBankAccount>(`${this.base}/bank-account`, body);
  }

  getClaims(page = 1, limit = 20): Observable<PaginatedResponse<Claim>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<Claim>>(`${this.base}/claims`, { params });
  }

  getClaim(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${this.base}/claims/${id}`);
  }

  createReimbursement(body: {
    medicalServiceIds: string[];
    amount: number;
    description: string;
    files?: File[];
  }): Observable<Claim> {
    const formData = new FormData();
    for (const serviceId of body.medicalServiceIds) {
      formData.append('medicalServiceIds', serviceId);
    }
    formData.append('amount', String(body.amount));
    formData.append('description', body.description);
    for (const file of body.files ?? []) {
      formData.append('files', file, file.name);
    }
    return this.http.post<Claim>(`${this.base}/reimbursements`, formData);
  }

  getMyTreatments(): Observable<MemberTreatmentListItem[]> {
    return this.http.get<MemberTreatmentListItem[]>(`${this.base}/treatments`);
  }

  getFamilyTreatments(): Observable<MemberTreatmentListItem[]> {
    return this.http.get<MemberTreatmentListItem[]>(`${this.base}/treatments/family`);
  }

  getTreatment(id: string): Observable<TreatmentDetail> {
    return this.http.get<TreatmentDetail>(`${this.base}/treatments/${id}`);
  }
}
