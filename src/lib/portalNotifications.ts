export type PortalNotificationUiType = 'alert' | 'success' | 'warning' | 'info';

export function mapPortalNotificationUiType(apiType: string): PortalNotificationUiType {
  if (apiType === 'security') return 'alert';
  if (apiType === 'marketing' || apiType === 'order') return 'success';
  if (apiType === 'stock' || apiType === 'kyc') return 'warning';
  return 'info';
}
