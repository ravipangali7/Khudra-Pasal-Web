export const SUPPORT_CATEGORY_OPTIONS = [
  { value: 'billing', label: 'Billing' },
  { value: 'account', label: 'Account' },
  { value: 'orders', label: 'Orders' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
] as const;

export const SUPPORT_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export const TICKET_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
] as const;

export const SOURCE_PANEL_FILTER_OPTIONS = [
  { value: '__all', label: 'All panels' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'customer', label: 'Customer' },
  { value: 'family', label: 'Family' },
  { value: 'child', label: 'Child' },
] as const;
