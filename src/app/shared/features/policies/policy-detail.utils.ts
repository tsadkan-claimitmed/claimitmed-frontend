import { PolicyOrgSummary } from '../../../core/models';

export function formatOrgAddress(org: PolicyOrgSummary): string {
  const parts = [org.streetAddress, org.city, org.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function formatEnumLabel(value?: string | null): string {
  if (!value) return '—';
  return value.replaceAll('_', ' ');
}
