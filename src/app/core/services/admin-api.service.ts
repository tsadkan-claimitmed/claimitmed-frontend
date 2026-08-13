import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Benefit,
  MedicalService,
  Diagnosis,
  Insurer,
  Employer,
  Provider,
  FraudRule,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Reference data
  getBenefits(): Observable<Benefit[]> {
    return this.http.get<Benefit[]>(`${this.base}/benefits`);
  }

  createBenefit(body: { benefitCode: string; name: string; description?: string }): Observable<Benefit> {
    return this.http.post<Benefit>(`${this.base}/benefits`, body);
  }

  getMedicalServices(): Observable<MedicalService[]> {
    return this.http.get<MedicalService[]>(`${this.base}/medical-services`);
  }

  createMedicalService(body: { serviceCode: string; serviceName: string; category?: string }): Observable<MedicalService> {
    return this.http.post<MedicalService>(`${this.base}/medical-services`, body);
  }

  getDiagnoses(): Observable<Diagnosis[]> {
    return this.http.get<Diagnosis[]>(`${this.base}/diagnoses`);
  }

  createDiagnosis(body: { icd10Code: string; description: string }): Observable<Diagnosis> {
    return this.http.post<Diagnosis>(`${this.base}/diagnoses`, body);
  }

  // Organizations
  getInsurers(): Observable<Insurer[]> {
    return this.http.get<Insurer[]>(`${this.base}/insurers`);
  }

  createInsurer(body: Record<string, unknown>): Observable<Insurer> {
    return this.http.post<Insurer>(`${this.base}/insurers`, body);
  }

  getEmployers(): Observable<Employer[]> {
    return this.http.get<Employer[]>(`${this.base}/employers`);
  }

  createEmployer(body: Record<string, unknown>): Observable<Employer> {
    return this.http.post<Employer>(`${this.base}/employers`, body);
  }

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(`${this.base}/providers`);
  }

  createProvider(body: { providerCode: string; name: string; providerType: string }): Observable<Provider> {
    return this.http.post<Provider>(`${this.base}/providers`, body);
  }

  // Fraud rules
  getFraudRules(): Observable<FraudRule[]> {
    return this.http.get<FraudRule[]>(`${this.base}/fraud/rules`);
  }

  getFraudRuleCatalog(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/fraud/rules/catalog`);
  }

  createFraudRule(body: Record<string, unknown>): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules`, body);
  }

  activateFraudRule(id: string): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules/${id}/activate`, {});
  }

  deactivateFraudRule(id: string): Observable<FraudRule> {
    return this.http.post<FraudRule>(`${this.base}/fraud/rules/${id}/deactivate`, {});
  }
}
