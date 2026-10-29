import { Claim } from '../../core/models';
import { ClaimType, PaymentResponsibility } from '../../core/models/enums';

export function claimTypeLabel(
  claim: Pick<Claim, 'claimType'> & { paymentResponsibility?: PaymentResponsibility | null },
): 'PROVIDER' | 'MEMBER' {
  if (claim.claimType === ClaimType.MEMBER_REIMBURSEMENT || claim.claimType === ClaimType.REIMBURSEMENT) {
    return 'MEMBER';
  }
  if (claim.claimType === ClaimType.PROVIDER) {
    return 'PROVIDER';
  }
  return claim.paymentResponsibility === PaymentResponsibility.MEMBER_PAID_CASH ? 'MEMBER' : 'PROVIDER';
}
