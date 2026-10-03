import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import {
  BulkEnrollResult,
  Employer,
  EmployerEmployee,
  EmployerEmployeeDependent,
  EmployerEmployeeLookup,
  EmployerEmployeeDetail,
  EmployerEmployeeListItem,
  PaginatedResponse,
  PolicyListItem,
} from '../models';
import { PolicyApiService } from './policy-api.service';

const SKIP_SUCCESS_HEADER = new HttpHeaders({ 'X-Skip-Success-Notification': 'true' });

@Injectable({ providedIn: 'root' })
export class EmployerApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly policyApi = inject(PolicyApiService);

  private get base(): string {
    return this.config.apiUrl;
  }

  getEmployers(): Observable<Employer[]> {
    return this.http.get<Employer[]>(`${this.base}/employers`);
  }

  listPolicies(): Observable<PolicyListItem[]> {
    return this.policyApi.listPolicies();
  }

  getEmployees(params: {
    page?: number;
    limit?: number;
    search?: string;
    hasPolicy?: boolean;
    policyId?: string;
    status?: string;
    sort?: string;
  } = {}): Observable<PaginatedResponse<EmployerEmployeeListItem>> {
    let query = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 20));

    if (params.search?.trim()) query = query.set('search', params.search.trim());
    if (params.hasPolicy !== undefined) query = query.set('hasPolicy', String(params.hasPolicy));
    if (params.policyId) query = query.set('policyId', params.policyId);
    if (params.status) query = query.set('status', params.status);
    if (params.sort) query = query.set('sort', params.sort);

    return this.http.get<PaginatedResponse<EmployerEmployeeListItem>>(`${this.base}/employer/employees`, {
      params: query,
    });
  }

  getEmployeeDetail(employeeId: string): Observable<EmployerEmployeeDetail> {
    return this.http.get<EmployerEmployeeDetail>(`${this.base}/employer/employees/${employeeId}`);
  }

  createEmployee(body: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    dateOfBirth: string;
    email: string;
    phone: string;
  }): Observable<EmployerEmployee> {
    return this.http.post<EmployerEmployee>(`${this.base}/employer/employees`, body, {
      headers: SKIP_SUCCESS_HEADER,
    });
  }

  updateEmployee(
    employeeId: string,
    body: {
      employeeNumber: string;
      firstName: string;
      lastName: string;
      nationalId: string;
      dateOfBirth: string;
      email: string;
      phone: string;
    },
  ): Observable<EmployerEmployee> {
    return this.http.patch<EmployerEmployee>(`${this.base}/employer/employees/${employeeId}`, body, {
      headers: SKIP_SUCCESS_HEADER,
    });
  }

  lookupEmployee(nationalId: string): Observable<EmployerEmployeeLookup> {
    return this.http.get<EmployerEmployeeLookup>(`${this.base}/employer/employees/lookup`, {
      params: { nationalId },
      headers: SKIP_SUCCESS_HEADER,
    });
  }

  uploadEmployeePhoto(employeeId: string, file: File): Observable<EmployerEmployee> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<EmployerEmployee>(
      `${this.base}/employer/employees/${employeeId}/photo`,
      formData,
      { headers: SKIP_SUCCESS_HEADER },
    );
  }

  bulkEnrollEmployees(body: {
    employeeIds: string[];
    policyId: string;
    allowModification?: boolean;
  }): Observable<BulkEnrollResult> {
    return this.http.post<BulkEnrollResult>(`${this.base}/employer/employees/bulk-enroll`, body, {
      headers: SKIP_SUCCESS_HEADER,
    });
  }

  addEmployeeDependent(
    employeeId: string,
    body: {
      firstName: string;
      lastName: string;
      relationshipType: string;
      nationalId: string;
      dateOfBirth: string;
    },
  ): Observable<EmployerEmployeeDependent> {
    return this.http.post<EmployerEmployeeDependent>(
      `${this.base}/employer/employees/${employeeId}/dependents`,
      body,
      { headers: SKIP_SUCCESS_HEADER },
    );
  }

  updateEmployeeDependent(
    employeeId: string,
    dependentId: string,
    body: {
      firstName: string;
      lastName: string;
      relationshipType: string;
      nationalId: string;
      dateOfBirth: string;
    },
  ): Observable<EmployerEmployeeDependent> {
    return this.http.patch<EmployerEmployeeDependent>(
      `${this.base}/employer/employees/${employeeId}/dependents/${dependentId}`,
      body,
      { headers: SKIP_SUCCESS_HEADER },
    );
  }

  enrollEmployeeDependent(employeeId: string, dependentId: string): Observable<EmployerEmployeeDependent> {
    return this.http.post<EmployerEmployeeDependent>(
      `${this.base}/employer/employees/${employeeId}/dependents/${dependentId}/enroll`,
      {},
      { headers: SKIP_SUCCESS_HEADER },
    );
  }

  refreshEmployeeEnrollment(employeeId: string): Observable<{ enrolledDependentCount: number; enrolledDependentIds: string[] }> {
    return this.http.post<{ enrolledDependentCount: number; enrolledDependentIds: string[] }>(
      `${this.base}/employer/employees/${employeeId}/refresh-enrollment`,
      {},
      { headers: SKIP_SUCCESS_HEADER },
    );
  }

  terminateEmployee(employeeId: string): Observable<EmployerEmployee> {
    return this.http.post<EmployerEmployee>(
      `${this.base}/employer/employees/${employeeId}/terminate`,
      {},
      { headers: SKIP_SUCCESS_HEADER },
    );
  }
}
