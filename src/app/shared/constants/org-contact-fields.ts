export interface OrgContactFields {
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export const ORG_CONTACT_CRUD_FIELDS = [
  { key: 'streetAddress', label: 'Street Address', placeholder: '123 Main Street' },
  { key: 'city', label: 'City', placeholder: 'Addis Ababa' },
  { key: 'state', label: 'State / Region', placeholder: 'Addis Ababa' },
  { key: 'contactEmail', label: 'Contact Email', type: 'email' as const, placeholder: 'contact@example.com' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'tel' as const, placeholder: '+251911234567' },
];

export const ORG_CONTACT_TABLE_COLUMNS = [
  { key: 'city', label: 'City' },
  { key: 'contactEmail', label: 'Contact Email' },
];
