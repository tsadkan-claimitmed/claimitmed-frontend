import { UserType } from '../../../core/models/enums';

export type PolicyPortal = 'admin' | 'insurer' | 'employer';

export interface PolicyPortalConfig {
  portal: PolicyPortal;
  canEditPolicy: boolean;
  canManageCoverage: boolean;
  canCreate: boolean;
  policiesListPath: string;
  policyDetailPath: (policyId: string) => string;
  defaultBackPath: string;
}

export function policyPortalFromUserType(userType?: UserType): PolicyPortal {
  switch (userType) {
    case UserType.ADMIN:
      return 'admin';
    case UserType.EMPLOYER:
      return 'employer';
    default:
      return 'insurer';
  }
}

export function getPolicyPortalConfig(
  portal: PolicyPortal,
  options?: { insurerId?: string },
): PolicyPortalConfig {
  const base = `/portal/${portal}`;
  const canEditPolicy = portal === 'admin';
  const canManageCoverage = portal === 'admin';
  const canCreate = portal === 'admin';

  if (portal === 'admin' && options?.insurerId) {
    return {
      portal,
      canEditPolicy: true,
      canManageCoverage: true,
      canCreate: true,
      policiesListPath: `${base}/insurers/${options.insurerId}`,
      policyDetailPath: (policyId) => `${base}/policies/${policyId}`,
      defaultBackPath: `${base}/insurers/${options.insurerId}`,
    };
  }

  return {
    portal,
    canEditPolicy,
    canManageCoverage,
    canCreate,
    policiesListPath: `${base}/policies`,
    policyDetailPath: (policyId) => `${base}/policies/${policyId}`,
    defaultBackPath: `${base}/policies`,
  };
}
