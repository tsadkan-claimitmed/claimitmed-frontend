import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  Benefit,
  MedicalService,
  Diagnosis,
  Insurer,
  InsurerNetworkLink,
  Employer,
  Provider,
  FraudRule,
  FraudRuleCatalogItem,
  AdminDashboardStats,
  AppUser,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base(): string {
    return this.config.apiUrl;
  }

  getDashboardStats(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.base}/admin/dashboard/stats`);
  }

  // Users
  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.base}/users`);
  }

  createUser(body: {
    phone: string;
    email?: string;
    password: string;
    userType: string;
    insuranceCompanyId?: string;
    insuranceCompanyIds?: string[];
    managesAllInsurers?: boolean;
    employerId?: string;
    providerId?: string;
    nationalId?: string;
  }): Observable<AppUser> {
    return this.http.post<AppUser>(`${this.base}/users`, body);
  }

  updateUser(id: string, body: {
    phone?: string;
    email?: string | null;
    password?: string;
    insuranceCompanyId?: string | null;
    insuranceCompanyIds?: string[];
    managesAllInsurers?: boolean;
    employerId?: string | null;
    providerId?: string | null;
    memberId?: string | null;
  }): Observable<AppUser> {
    return this.http.patch<AppUser>(`${this.base}/users/${id}`, body);
  }

  activateUser(id: string): Observable<AppUser> {
    return this.http.post<AppUser>(`${this.base}/users/${id}/activate`, {});
  }

  deactivateUser(id: string): Observable<AppUser> {
    return this.http.post<AppUser>(`${this.base}/users/${id}/deactivate`, {});
  }

  resetUserPassword(id: string, password: string): Observable<AppUser> {
    return this.http.post<AppUser>(`${this.base}/users/${id}/reset-password`, { password });
  }

  // Benefits
  getBenefits(): Observable<Benefit[]> {
    return this.http.get<Benefit[]>(`${this.base}/benefits`);
  }

  getBenefit(id: string): Observable<Benefit> {
    return this.http.get<Benefit>(`${this.base}/benefits/${id}`);
  }

  createBenefit(body: { benefitCode: string; name: string; description?: string }): Observable<Benefit> {
    return this.http.post<Benefit>(`${this.base}/benefits`, body);
  }

  updateBenefit(id: string, body: { name?: string; description?: string }): Observable<Benefit> {
    return this.http.patch<Benefit>(`${this.base}/benefits/${id}`, body);
  }

  // Medical Services
  getMedicalServices(): Observable<MedicalService[]> {
    return this.http.get<MedicalService[]>(`${this.base}/medical-services`);
  }

  getMedicalService(id: string): Observable<MedicalService> {
    return this.http.get<MedicalService>(`${this.base}/medical-services/${id}`);
  }

  createMedicalService(body: { serviceCode: string; serviceName: string; category?: string }): Observable<MedicalService> {
    return this.http.post<MedicalService>(`${this.base}/medical-services`, body);
  }

  updateMedicalService(id: string, body: { serviceName?: string; category?: string }): Observable<MedicalService> {
    return this.http.patch<MedicalService>(`${this.base}/medical-services/${id}`, body);
  }

  // Diagnoses
  getDiagnoses(): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.base}/diagnoses`);
  }

  getDiagnosis(id: string): Observable<Diagnosis> {
    return this.http.get<Diagnosis>(`${this.base}/diagnoses/${id}`);
  }

  createDiagnosis(body: { icd10Code: string; description: string }): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(`${this.base}/diagnoses`, body);
  }

  updateDiagnosis(id: string, body: { description?: string }): Observable<Diagnosis> {
    return this.http.patch<Diagnosis>(`${this.base}/diagnoses/${id}`, body);
  }

  // Insurers
  getInsurers(): Observable<Insurer[]> {
    return this.http.get<Insurer[]>(`${this.base}/insurers`);
  }

  getInsurer(id: string): Observable<Insurer> {
    return this.http.get<Insurer>(`${this.base}/insurers/${id}`);
  }

  createInsurer(body: {
    companyCode: string;
    name: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Insurer> {
    return this.http.post<Insurer>(`${this.base}/insurers`, body);
  }

  updateInsurer(id: string, body: {
    name?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Insurer> {
    return this.http.patch<Insurer>(`${this.base}/insurers/${id}`, body);
  }

  activateInsurer(id: string): Observable<Insurer> {
    return this.http.post<Insurer>(`${this.base}/insurers/${id}/activate`, {});
  }

  deactivateInsurer(id: string): Observable<Insurer> {
    return this.http.post<Insurer>(`${this.base}/insurers/${id}/deactivate`, {});
  }

  uploadInsurerLogo(id: string, file: File): Observable<Insurer> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Insurer>(`${this.base}/insurers/${id}/logo`, formData);
  }

  getInsurerNetwork(insuranceCompanyId: string): Observable<InsurerNetworkLink[]> {
    return this.http.get<InsurerNetworkLink[]>(`${this.base}/insurers/${insuranceCompanyId}/network`);
  }

  linkProviderToNetwork(insuranceCompanyId: string, providerId: string): Observable<InsurerNetworkLink> {
    return this.http.post<InsurerNetworkLink>(`${this.base}/insurers/${insuranceCompanyId}/network`, { providerId });
  }

  activateNetworkProvider(insuranceCompanyId: string, providerId: string): Observable<InsurerNetworkLink> {
    return this.http.post<InsurerNetworkLink>(
      `${this.base}/insurers/${insuranceCompanyId}/network/${providerId}/activate`,
      {},
    );
  }

  deactivateNetworkProvider(insuranceCompanyId: string, providerId: string): Observable<InsurerNetworkLink> {
    return this.http.post<InsurerNetworkLink>(
      `${this.base}/insurers/${insuranceCompanyId}/network/${providerId}/deactivate`,
      {},
    );
  }

  // Employers
  getEmployers(): Observable<Employer[]> {
    return this.http.get<Employer[]>(`${this.base}/employers`);
  }

  getEmployer(id: string): Observable<Employer> {
    return this.http.get<Employer>(`${this.base}/employers/${id}`);
  }

  createEmployer(body: {
    employerCode: string;
    name: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Employer> {
    return this.http.post<Employer>(`${this.base}/employers`, body);
  }

  updateEmployer(id: string, body: {
    name?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Employer> {
    return this.http.patch<Employer>(`${this.base}/employers/${id}`, body);
  }

  activateEmployer(id: string): Observable<Employer> {
    return this.http.post<Employer>(`${this.base}/employers/${id}/activate`, {});
  }

  deactivateEmployer(id: string): Observable<Employer> {
    return this.http.post<Employer>(`${this.base}/employers/${id}/deactivate`, {});
  }

  uploadEmployerLogo(id: string, file: File): Observable<Employer> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Employer>(`${this.base}/employers/${id}/logo`, formData);
  }

  // Providers
  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/providers`);
  }

  getProvider(id: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.base}/providers/${id}`);
  }

  createProvider(body: {
    providerCode: string;
    name?: string;
    providerType?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Provider> {
    return this.http.post<Provider>(`${this.base}/providers`, body);
  }

  updateProvider(id: string, body: {
    name?: string;
    providerType?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Observable<Provider> {
    return this.http.patch<Provider>(`${this.base}/providers/${id}`, body);
  }

  activateProvider(id: string): Observable<Provider> {
    return this.http.post<Provider>(`${this.base}/providers/${id}/activate`, {});
  }

  deactivateProvider(id: string): Observable<Provider> {
    return this.http.post<Provider>(`${this.base}/providers/${id}/deactivate`, {});
  }

  // Fraud rules
  getFraudRules(): Observable<FraudRule[]> {
    return this.http.get<FraudRule[]>(`${this.base}/fraud/rules`);
  }

  getFraudRule(id: string): Observable<FraudRule> {
    return this.http.get<FraudRule>(`${this.base}/fraud/rules/${id}`);
  }

  getFraudRuleCatalog(): Observable<FraudRuleCatalogItem[]> {
    return this.http.get<FraudRuleCatalogItem[]>(`${this.base}/fraud/rules/catalog`);
  }

  createFraudRule(body: {
    ruleCode: string;
    ruleName: string;
    entityType: string;
    conditionJson: Record<string, unknown>;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    action: 'FLAG';
    isActive?: boolean;
  }): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules`, body);
  }

  updateFraudRule(id: string, body: {
    ruleName?: string;
    entityType?: string;
    conditionJson?: Record<string, unknown>;
    severity?: 'HIGH' | 'MEDIUM' | 'LOW';
    action?: 'FLAG';
    isActive?: boolean;
  }): Observable<FraudRule> {
    return this.http.patch<FraudRule>(`${this.base}/fraud/rules/${id}`, body);
  }

  activateFraudRule(id: string): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules/${id}/activate`, {});
  }

  deactivateFraudRule(id: string): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules/${id}/deactivate`, {});
  }

  deleteFraudRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/fraud/rules/${id}`);
  }
}
