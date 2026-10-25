import { UserType } from './enums';
import { ClaimStatus, ClaimType, PaymentResponsibility } from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
}

export interface AuthUser {
  id: string;
  phone: string;
  email?: string | null;
  userType: UserType;
  memberId?: string;
  insuranceCompanyId?: string | null;
  employerId?: string | null;
  providerId?: string | null;
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface AppUser {
  id: string;
  phone: string;
  email?: string | null;
  userType: UserType;
  status: string;
  insuranceCompanyId?: string | null;
  employerId?: string | null;
  providerId?: string | null;
  memberId?: string | null;
  createdAt: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface AdminDashboardStats {
  enrolledMembers: number;
  policies: number;
  providers: number;
  insurers: number;
  employers: number;
  claimsProcessed: number;
}

export interface ClaimItem {
  id: string;
  medicalServiceId: string;
  serviceName?: string;
  serviceCode?: string | null;
  benefitId?: string | null;
  benefitName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  requestedAmount?: number | string;
  insurerAmount?: number | string | null;
  memberAmount?: number | string | null;
  approvedAmount?: number | string | null;
}

export interface Claim {
  id: string;
  claimNumber: string;
  claimType: ClaimType;
  status: ClaimStatus;
  requestedAmount: number;
  totalTreatmentAmount?: number | string | null;
  insuranceAmount?: number | string | null;
  memberOutOfPocketAmount?: number | string | null;
  approvedAmount?: number;
  paymentResponsibility?: PaymentResponsibility;
  memberId: string;
  providerId?: string;
  policyId: string;
  treatmentCaseId?: string;
  items: ClaimItem[];
  createdAt: string;
  submittedAt?: string | null;
  submittedBy?: string | null;
  updatedAt?: string;
  fraudScore?: number | null;
  fraudResult?: string | null;
  fraudReviewRequired?: boolean | null;
}

export interface ClaimDetailDates {
  createdAt: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt?: string | null;
}

export interface ClaimDetailPatient {
  id: string;
  memberNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  relationshipType: string;
  status: string;
}

export interface ClaimDetailPolicy {
  id: string;
  policyNumber: string;
  policyName: string;
  status: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  employerId: string;
  coverageLimitModel?: string;
  annualLimit?: string | null;
}

export interface ClaimDetailInsurance {
  id: string;
  companyCode: string;
  name: string;
  status: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ClaimDetailEmployer {
  id: string;
  employerCode: string;
  name: string;
  status?: string;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface ClaimDetailProvider {
  id: string;
  providerCode: string;
  name?: string | null;
  providerType?: string | null;
}

export interface ClaimReviewSummary {
  memberName: string;
  memberNumber: string;
  relationshipType: string;
  policyNumber: string;
  policyName: string;
  coverageLimitModel: string;
  employerName: string;
  employerCode: string;
  providerName: string;
  treatmentDate?: string | null;
  requestedAmount: string;
  totalRemainingCoverage: string;
  memberTenureDays: number;
  memberTenureLabel: string;
  status: string;
  treatmentReference?: string | null;
}

export interface ClaimMemberContext {
  coverage: MemberCoverageBalance[];
  claimStats: MemberClaimStats;
  totalRemainingCoverage: string;
  familyGroup: { id: string; familyCode: string };
}

export interface ClaimPolicyCoverageItem {
  id: string;
  medicalServiceId: string;
  serviceName: string;
  serviceCode: string;
  benefitId?: string | null;
  benefitName?: string | null;
  annualLimit?: string | null;
  requiresPreauthorization: boolean;
  coverageScope?: string | null;
  status: string;
}

export interface ClaimTreatmentHistoryItem {
  id: string;
  treatmentReference?: string | null;
  treatmentDate?: string | null;
  providerName: string;
  status: string;
  totalEstimatedAmount?: string | null;
  itemCount: number;
  createdAt: string;
  isCurrentClaimTreatment: boolean;
}

export interface ClaimDetailTreatment {
  id: string;
  treatmentReference?: string | null;
  treatmentDate?: string | null;
  treatingPhysician?: string | null;
  totalEstimatedAmount?: string | null;
  status: string;
  createdAt: string;
  items: TreatmentItem[];
  diagnoses: TreatmentDiagnosis[];
}

export interface ClaimAttachment {
  id: string;
  url: string;
  originalFilename?: string | null;
  mimeType?: string | null;
  isImage: boolean;
  documentType: string;
  uploadedBy?: string | null;
  uploadedAt: string;
}

export interface ClaimDetailDecision {
  id: string;
  decision?: string | null;
  reason?: string | null;
  comments?: string | null;
  approvedAmount: string;
  createdAt: string;
}

export interface ClaimWorkflowHistoryEntry {
  fromStatus?: string | null;
  toStatus: string;
  action?: string | null;
  comments?: string | null;
  createdAt: string;
}

export interface ClaimDetailPaymentTransaction {
  id: string;
  status: string;
  attempt: number;
  externalReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

export interface ClaimDetailPayment {
  id: string;
  amount: string;
  status: string;
  payeeType?: string | null;
  paymentReference?: string | null;
  createdAt: string;
  transactions?: ClaimDetailPaymentTransaction[];
}

export interface ClaimFraudRuleRun {
  ruleId: string;
  ruleCode: string;
  ruleName?: string | null;
  severity?: string | null;
  evaluationResult?: string | null;
  score?: number | null;
  triggered: boolean;
  details?: Record<string, unknown> | null;
}

export interface ClaimFraudEvaluation {
  id: string;
  overallScore?: number | null;
  overallResult?: string | null;
  reviewRequired: boolean;
  evaluatedAt: string;
  rules: ClaimFraudRuleRun[];
}

export interface ClaimDetail extends Claim {
  dates: ClaimDetailDates;
  patient: ClaimDetailPatient;
  policy: ClaimDetailPolicy;
  insurance: ClaimDetailInsurance;
  employer?: ClaimDetailEmployer | null;
  provider?: ClaimDetailProvider | null;
  reviewSummary: ClaimReviewSummary;
  memberContext: ClaimMemberContext;
  policyCoverage: ClaimPolicyCoverageItem[];
  treatmentHistory: ClaimTreatmentHistoryItem[];
  treatment: ClaimDetailTreatment;
  decisions: ClaimDetailDecision[];
  attachments?: ClaimAttachment[];
  workflowHistory: ClaimWorkflowHistoryEntry[];
  payment?: ClaimDetailPayment | null;
  fraudEvaluation?: ClaimFraudEvaluation | null;
}

export interface MemberProfile {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth?: string | null;
  relationshipType?: string;
  status: string;
  policyId: string;
  policyNumber?: string | null;
  policyName?: string | null;
  employerName?: string | null;
  familyGroupId?: string;
}

export interface MemberBankAccount {
  id: string;
  memberId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface MemberCoveredService {
  id: string;
  medicalServiceId?: string;
  serviceName: string;
  serviceCode: string;
  benefitName: string | null;
  benefitCode: string | null;
  annualLimit: string | null;
  coverageScope: string | null;
  requiresPreauthorization: boolean;
}

export interface MemberPolicyOrgSummary {
  id: string;
  name: string;
  code: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface MemberInNetworkProvider {
  id: string;
  providerCode: string;
  providerName: string | null;
  providerType: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export interface MemberPolicyOverview {
  member: Member;
  policy: MemberPolicySummary & {
    coverageLimitModel: string;
    annualLimit: string | null;
    coverageScope: string | null;
    networkType: string;
    insurer: MemberPolicyOrgSummary;
  };
  employer: MemberPolicyOrgSummary;
  familyGroup: { id: string; familyCode: string };
  familyMembers: Member[];
  coverage: MemberCoverageBalance[];
  coveredServices: MemberCoveredService[];
  totalRemainingCoverage: string;
}

export interface CoveragePool {
  poolId: string;
  benefitId: string | null;
  benefitName?: string;
  coverageScope: string;
  annualLimit: number | string;
  consumedAmount: number | string;
  remainingAmount: number | string;
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
  relationshipType: string;
  policyId: string;
  policyNumber: string;
  policyName: string;
  policyStatus: string;
  policyNetworkType: string;
  coverageLimitModel?: string;
  employerName?: string;
  employerCode?: string;
  photoUrl?: string | null;
  eligible: boolean;
  ineligibilityReasons: string[];
  visitDate?: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  policyName: string;
  name?: string;
  status: string;
  insuranceCompanyId: string;
  employerId: string;
  effectiveDate: string;
  expiryDate?: string;
  coverageLimitModel?: string;
  annualLimit?: string | null;
  coverageScope?: string | null;
  networkType?: string;
}

export interface PolicyServiceCoverage {
  id: string;
  policyId: string;
  medicalServiceId: string;
  benefitId: string | null;
  annualLimit: string | null;
  requiresPreauthorization: boolean;
  coverageScope?: string | null;
  status?: string;
  createdAt?: string;
}

export interface PolicyListItem extends Policy {
  employerName: string;
  employerCode: string;
  insurerName?: string;
  insurerCode?: string;
}

export interface PolicyOrgSummary {
  id: string;
  name: string;
  code: string;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface PolicyCoverageDetailItem extends PolicyServiceCoverage {
  serviceName: string;
  serviceCode: string;
  benefitName: string | null;
  benefitCode: string | null;
}

export interface PolicyDetail {
  id: string;
  insuranceCompanyId: string;
  employerId: string;
  policyNumber: string;
  policyName: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  coverageLimitModel: string;
  annualLimit?: string | null;
  coverageScope?: string | null;
  networkType: string;
  status: string;
  createdAt: string;
  employer: PolicyOrgSummary;
  insurer: PolicyOrgSummary;
  coverage: PolicyCoverageDetailItem[];
}

export interface PolicyListParams {
  insuranceCompanyId?: string;
  employerId?: string;
  status?: string;
  search?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
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
  createdAt?: string;
}

export interface MemberListItem extends Member {
  policyNumber: string;
  policyName: string;
  employerName: string;
  employerCode: string;
}

export interface MemberClaimStats {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  needInfo: number;
  approved: number;
  rejected: number;
  paid: number;
}

export interface MemberPolicySummary {
  id: string;
  policyNumber: string;
  policyName: string;
  status: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  employerId: string;
  employerName: string;
  employerCode: string;
}

export interface MemberCoverageBalance {
  poolId: string;
  benefitId: string | null;
  benefitName: string;
  coverageScope: string;
  annualLimit: string;
  consumedAmount: string;
  remainingAmount: string;
  benefitPeriodStart: string;
  benefitPeriodEnd: string;
}

export interface MemberDetail {
  member: Member;
  policy: MemberPolicySummary;
  familyGroup: { id: string; familyCode: string };
  familyMembers: Member[];
  coverage: MemberCoverageBalance[];
  claimStats: MemberClaimStats;
  totalRemainingCoverage: string;
}

export interface EmployerEmployee {
  id: string;
  employerId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  memberId?: string | null;
  photoUrl?: string | null;
  createdAt?: string;
}

export interface EmployerEmployeeLookup {
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  alreadyOnRoster: boolean;
  existingEmployeeId?: string | null;
}

export interface EmployerEmployeeListItem extends EmployerEmployee {
  hasPolicy: boolean;
  policyId?: string | null;
  policyName?: string | null;
  policyNumber?: string | null;
}

export interface EmployerEmployeeDependent {
  id: string;
  rosterDependentId?: string | null;
  memberId?: string | null;
  memberNumber?: string | null;
  firstName: string;
  lastName: string;
  relationshipType: string;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  isEnrolled: boolean;
  status?: string | null;
}

export interface EmployerEmployeeDetail {
  employee: EmployerEmployee;
  policy: {
    id: string;
    policyNumber: string;
    policyName: string;
    status: string;
    effectiveDate?: string | null;
    expiryDate?: string | null;
  } | null;
  familyGroup: { id: string; familyCode: string } | null;
  policySupportsDependents: boolean;
  dependentsNotCovered: boolean;
  dependents: EmployerEmployeeDependent[];
}

export interface BulkEnrollResult {
  enrolledCount: number;
  modifiedCount: number;
  enrolledEmployeeIds: string[];
  modifiedEmployeeIds: string[];
  skippedEmployeeIds: string[];
}

export interface FamilyGroup {
  id: string;
  policyId: string;
  familyCode: string;
  createdAt?: string;
}

export interface OrgContactFields {
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface Provider extends OrgContactFields {
  id: string;
  providerCode: string;
  name: string;
  providerType: string;
  tin?: string | null;
  vatRegistrationNumber?: string | null;
  status?: string;
}

export interface Insurer extends OrgContactFields {
  id: string;
  companyCode: string;
  name: string;
  status?: string;
  logoUrl?: string | null;
  createdAt?: string;
}

export interface InsurerNetworkLink {
  id: string;
  insuranceCompanyId: string;
  providerId: string;
  providerCode: string;
  providerName: string | null;
  providerType: string | null;
  status: string;
  createdAt: string;
}

export interface Employer extends OrgContactFields {
  id: string;
  employerCode: string;
  name: string;
  status?: string;
  logoUrl?: string | null;
  createdAt?: string;
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

export interface ServiceFeeLookup {
  memberId: string;
  medicalServiceId: string;
  agreedRate: string | null;
  requiresPreauth: boolean;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
}

export interface MemberTreatmentListItem {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  relationshipType: string;
  isSelf: boolean;
  treatmentReference?: string | null;
  treatmentDate?: string | null;
  providerName: string;
  status: string;
  preauthStatus: string;
  totalEstimatedAmount?: string | null;
  itemCount: number;
  createdAt: string;
}

export interface TreatmentCase {
  id: string;
  memberId: string;
  providerId: string;
  memberFirstName?: string | null;
  memberLastName?: string | null;
  memberNumber?: string | null;
  treatmentReference?: string;
  treatmentDate?: string;
  treatingPhysician?: string;
  status: string;
  purpose?: string;
  employerName?: string | null;
  employerCode?: string | null;
  preauthStatus?: string;
  preauthDenialReason?: string | null;
  preauthApprovedAmount?: string | null;
  preauthRequestedAt?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  totalEstimatedAmount?: string | null;
  items?: TreatmentItem[];
  diagnoses?: TreatmentDiagnosis[];
  createdAt?: string;
}

export interface TreatmentDetailDates {
  createdAt: string;
  treatmentDate?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  preauthRequestedAt?: string | null;
}

export interface TreatmentDetailPatient {
  id: string;
  memberNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  relationshipType: string;
  status: string;
  photoUrl?: string | null;
}

export interface TreatmentDetailPolicy {
  id: string;
  policyNumber: string;
  policyName: string;
  status: string;
  networkType?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

export interface TreatmentDetailInsurance {
  id: string;
  companyCode: string;
  name: string;
  status: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface TreatmentDetailEmployer {
  id: string;
  employerCode: string;
  name: string;
}

export interface TreatmentDetailProvider {
  id: string;
  providerCode: string;
  name?: string | null;
  providerType?: string | null;
}

export interface TreatmentFiscalInvoice {
  invoiceNumber: string;
  verifyUrl: string;
  qrUrl: string;
  qrDataUrl?: string | null;
  contentSha256: string;
  clearanceStatus: string;
  valid: boolean;
  supplierName?: string;
  supplierTin?: string | null;
  supplierVatNumber?: string | null;
  buyerName?: string;
  buyerTin?: string | null;
  consideration?: string;
  vatRate?: string;
  vatAmount?: string;
  grandTotal?: string;
  taxCategory?: string;
  taxCategoryLabel?: string;
  irn?: string | null;
  rrn?: string | null;
  patientPaidAmount?: string | null;
  claimedFromInsurer?: string | null;
  skipClaim?: boolean;
}

export interface TreatmentRelatedClaim {
  id: string;
  claimNumber: string;
  status: string;
  requestedAmount: string;
}

export interface TreatmentDocument {
  id: string;
  url: string;
  originalFilename?: string | null;
  mimeType?: string | null;
  documentType?: string | null;
  isImage?: boolean;
  uploadedAt: string;
}

export interface TreatmentCostSummary {
  totalTreatmentAmount: string;
  insuranceAmount: string;
  memberOutOfPocketAmount: string;
}

export interface TreatmentDetail extends TreatmentCase {
  dates: TreatmentDetailDates;
  patient: TreatmentDetailPatient;
  policy: TreatmentDetailPolicy;
  insurance: TreatmentDetailInsurance;
  employer?: TreatmentDetailEmployer | null;
  provider: TreatmentDetailProvider;
  costSummary: TreatmentCostSummary;
  relatedClaim?: TreatmentRelatedClaim | null;
  fiscalInvoice?: TreatmentFiscalInvoice | null;
  documents?: TreatmentDocument[];
}

export interface PreauthDecisionSummary {
  memberName: string;
  memberNumber: string;
  policyNumber: string;
  policyName: string;
  providerName: string;
  employerName: string;
  employerCode: string;
  treatmentDate?: string | null;
  estimatedAmount?: string | null;
  preauthServicesCount: number;
  totalRemainingCoverage: string;
  memberTenureDays: number;
  memberTenureLabel: string;
  preauthStatus: string;
  preauthApprovedAmount?: string | null;
  treatmentReference?: string | null;
}

export interface PreauthEmployerSummary {
  id: string;
  name: string;
  employerCode: string;
  status: string;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface PreauthTreatmentHistoryItem {
  id: string;
  treatmentReference?: string | null;
  treatmentDate?: string | null;
  providerName: string;
  status: string;
  preauthStatus: string;
  totalEstimatedAmount?: string | null;
  itemCount: number;
  createdAt: string;
}

export interface PreauthReviewDetail {
  decisionSummary: PreauthDecisionSummary;
  treatment: TreatmentDetail;
  member: MemberDetail;
  employer: PreauthEmployerSummary;
  treatmentHistory: PreauthTreatmentHistoryItem[];
}

export interface TreatmentItem {
  id: string;
  medicalServiceId: string;
  serviceName?: string;
  serviceCode?: string | null;
  quantity: number;
  unitPrice: number | string | null;
  totalPrice: number | string | null;
  requiresPreauth?: boolean;
  preauthDecision?: string | null;
  preauthApprovedAmount?: string | null;
  preauthDenialReason?: string | null;
}

export interface TreatmentDiagnosis {
  id: string;
  diagnosisId: string;
  icd10Code?: string;
  description?: string;
}

export type CoverageLineStatus = 'COVERED' | 'PARTIAL' | 'NOT_COVERED' | 'LIMIT_REACHED';

export interface CostEstimationPool {
  benefitName: string;
  remainingBefore: number | string;
  remainingAfter: number | string;
}

export interface CostEstimation {
  estimatedTotal: number | string;
  estimatedInsurerAmount: number | string;
  estimatedMemberAmount: number | string;
  remainingCoverageBefore?: number | string;
  remainingCoverageAfter?: number | string;
  pools?: CostEstimationPool[];
  lines: CostEstimationLine[];
}

export interface CostEstimationLine {
  medicalServiceId: string;
  serviceName?: string;
  estimatedAmount: number;
  insurerAmount: number;
  memberAmount: number;
  covered?: boolean;
  coverageStatus?: CoverageLineStatus;
  benefitName?: string | null;
  remainingAfter?: number | string;
}

export interface FraudRule {
  id: string;
  ruleCode: string;
  ruleName: string | null;
  entityType: string | null;
  conditionJson: Record<string, unknown> | null;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  action: 'FLAG' | null;
  isActive: boolean;
  hasEvaluator?: boolean;
}

export interface FraudRuleCatalogItem {
  ruleCode: string;
  ruleName: string;
  description: string;
  entityType: string;
  hasEvaluator: boolean;
  defaultCondition: Record<string, unknown>;
  defaultSeverity: 'HIGH' | 'MEDIUM' | 'LOW';
  defaultAction: 'FLAG';
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
