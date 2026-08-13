import { UserType } from './enums';
import { ClaimStatus, ClaimType, PaymentResponsibility } from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  userType: UserType;
  memberId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ClaimItem {
  id: string;
  medicalServiceId: string;
  serviceName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Claim {
  id: string;
  claimNumber: string;
  claimType: ClaimType;
  status: ClaimStatus;
  requestedAmount: number;
  approvedAmount?: number;
  paymentResponsibility?: PaymentResponsibility;
  memberId: string;
  providerId?: string;
  policyId: string;
  items: ClaimItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberProfile {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
  status: string;
  policyId: string;
  policyNumber: string;
  policyName: string;
  familyGroupId?: string;
}

export interface CoveragePool {
  poolId: string;
  benefitId: string;
  benefitName?: string;
  coverageScope: string;
  annualLimit: number;
  consumedAmount: number;
  remainingAmount: number;
  benefitPeriodStart: string;
  benefitPeriodEnd: string;
}

export interface EligibilityCheck {
  memberId: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  status: string;
  policyId: string;
  policyNumber: string;
  policyName: string;
  policyStatus: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  name: string;
  status: string;
  insuranceCompanyId: string;
  employerId: string;
  effectiveDate: string;
  expiryDate?: string;
}

export interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
  relationshipType: string;
  status: string;
  policyId: string;
  familyGroupId?: string;
}

export interface Provider {
  id: string;
  providerCode: string;
  name: string;
  providerType: string;
}

export interface Insurer {
  id: string;
  companyCode: string;
  name: string;
}

export interface Employer {
  id: string;
  employerCode: string;
  name: string;
}

export interface Benefit {
  id: string;
  benefitCode: string;
  name: string;
  description?: string;
}

export interface MedicalService {
  id: string;
  serviceCode: string;
  serviceName: string;
  category?: string;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
}

export interface TreatmentCase {
  id: string;
  memberId: string;
  providerId: string;
  treatmentReference?: string;
  treatmentDate?: string;
  treatingPhysician?: string;
  status: string;
  items?: TreatmentItem[];
  diagnoses?: TreatmentDiagnosis[];
}

export interface TreatmentItem {
  id: string;
  medicalServiceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TreatmentDiagnosis {
  id: string;
  diagnosisId: string;
  icd10Code?: string;
  description?: string;
}

export interface CostEstimation {
  estimatedTotal: number;
  estimatedInsurerAmount: number;
  estimatedMemberAmount: number;
  lines: CostEstimationLine[];
}

export interface CostEstimationLine {
  medicalServiceId: string;
  serviceName?: string;
  estimatedAmount: number;
  insurerAmount: number;
  memberAmount: number;
}

export interface FraudRule {
  id: string;
  name: string;
  ruleType: string;
  isActive: boolean;
  conditions: Record<string, unknown>;
}

export interface DocumentUpload {
  id: string;
  entityType: string;
  entityId: string;
  documentType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProblemDetail {
  status: number;
  title: string;
  detail?: string;
  instance?: string;
}
