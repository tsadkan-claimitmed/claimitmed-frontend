import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Employer,
  FamilyGroup,
  Member,
  Policy,
  PolicyDetail,
  PolicyListItem,
  PolicyListParams,
  PolicyServiceCoverage,
  PaginatedResponse,
  Benefit,
  MedicalService,
} from '../models';

@Injectable({ providedIn: 'root' })
export class PolicyApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return this.config.apiUrl;
  }

  listPolicies(params: PolicyListParams = {}): Observable<PolicyListItem[]> {
    let query = new HttpParams();
    if (params.insuranceCompanyId) query = query.set('insuranceCompanyId', params.insuranceCompanyId);
    if (params.employerId) query = query.set('employerId', params.employerId);
    if (params.status) query = query.set('status', params.status);
    if (params.search?.trim()) query = query.set('search', params.search.trim());
    if (params.effectiveFrom) query = query.set('effectiveFrom', params.effectiveFrom);
    if (params.effectiveTo) query = query.set('effectiveTo', params.effectiveTo);
    return this.http.get<PolicyListItem[]>(`${this.base}/policies`, { params: query });
  }

  createPolicy(body: {
    insuranceCompanyId?: string;
    employerId: string;
    policyNumber: string;
    policyName: string;
    effectiveDate?: string;
    expiryDate?: string;
    coverageLimitModel?: string;
    annualLimit?: number;
    coverageScope?: string;
    networkType?: string;
    status?: string;
  }): Observable<Policy> {
    return this.http.post<Policy>(`${this.base}/policies`, body);
  }

  searchEmployers(query = '', limit = 20): Observable<Employer[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (query.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<Employer[]>(`${this.base}/employers/search`, { params });
  }

  getEmployer(employerId: string): Observable<Employer> {
    return this.http.get<Employer>(`${this.base}/employers/${employerId}`);
  }

  listFamilyGroups(policyId: string): Observable<FamilyGroup[]> {
    return this.http.get<FamilyGroup[]>(`${this.base}/policies/${policyId}/family-groups`);
  }

  createFamilyGroup(policyId: string, body: { familyCode: string }): Observable<FamilyGroup> {
    return this.http.post<FamilyGroup>(`${this.base}/policies/${policyId}/family-groups`, body);
  }

  updateFamilyGroup(
    policyId: string,
    familyGroupId: string,
    body: { familyCode: string },
  ): Observable<FamilyGroup> {
    return this.http.patch<FamilyGroup>(
      `${this.base}/policies/${policyId}/family-groups/${familyGroupId}`,
      body,
    );
  }

  listMembers(policyId: string, familyGroupId: string): Observable<PaginatedResponse<Member>> {
    const params = new HttpParams()
      .set('policyId', policyId)
      .set('familyGroupId', familyGroupId)
      .set('limit', '100');
    return this.http.get<PaginatedResponse<Member>>(`${this.base}/members`, { params });
  }

  enrollMember(body: {
    policyId: string;
    familyGroupId: string;
    memberNumber: string;
    relationshipType: string;
    firstName?: string;
    lastName?: string;
    nationalId?: string;
    dateOfBirth?: string;
  }): Observable<Member> {
    return this.http.post<Member>(`${this.base}/members`, body);
  }

  addDependent(
    primaryMemberId: string,
    body: {
      memberNumber: string;
      relationshipType: string;
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      dateOfBirth?: string;
    },
  ): Observable<Member> {
    return this.http.post<Member>(`${this.base}/members/${primaryMemberId}/dependents`, body);
  }

  updateMember(
    memberId: string,
    body: {
      memberNumber?: string;
      firstName?: string;
      lastName?: string;
      nationalId?: string;
      dateOfBirth?: string;
      status?: string;
    },
  ): Observable<Member> {
    return this.http.patch<Member>(`${this.base}/members/${memberId}`, body);
  }

  getPolicyDetail(policyId: string): Observable<PolicyDetail> {
    return this.http.get<PolicyDetail>(`${this.base}/policies/${policyId}`);
  }

  updatePolicy(
    policyId: string,
    body: {
      policyName?: string;
      effectiveDate?: string;
      expiryDate?: string;
      coverageLimitModel?: string;
      annualLimit?: number;
      coverageScope?: string;
      networkType?: string;
      status?: string;
    },
  ): Observable<Policy> {
    return this.http.patch<Policy>(`${this.base}/policies/${policyId}`, body);
  }

  updateCoverage(
    policyId: string,
    coverageId: string,
    body: {
      requiresPreauthorization?: boolean;
      annualLimit?: number;
      coverageScope?: string;
      status?: string;
    },
  ): Observable<PolicyServiceCoverage> {
    return this.http.patch<PolicyServiceCoverage>(
      `${this.base}/policies/${policyId}/coverage/${coverageId}`,
      body,
    );
  }

  deleteCoverage(policyId: string, coverageId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/policies/${policyId}/coverage/${coverageId}`);
  }

  createCoverage(
    policyId: string,
    body: {
      medicalServiceId: string;
      benefitId?: string;
      annualLimit?: number;
      requiresPreauthorization?: boolean;
      coverageScope?: string;
    },
  ): Observable<PolicyServiceCoverage> {
    return this.http.post<PolicyServiceCoverage>(`${this.base}/policies/${policyId}/coverage`, body);
  }

  createBulkCoverage(
    policyId: string,
    body: {
      benefitId?: string;
      annualLimit?: number;
      coverageScope?: string;
      services: { medicalServiceId: string; requiresPreauthorization?: boolean }[];
    },
  ): Observable<{ created: PolicyServiceCoverage[]; skippedCount: number }> {
    return this.http.post<{ created: PolicyServiceCoverage[]; skippedCount: number }>(
      `${this.base}/policies/${policyId}/coverage/bulk`,
      body,
    );
  }

  listBenefits(): Observable<Benefit[]> {
    return this.http.get<Benefit[]>(`${this.base}/benefits`);
  }

  listMedicalServices(): Observable<MedicalService[]> {
    return this.http.get<MedicalService[]>(`${this.base}/medical-services`);
  }
}
