import { apiRequest } from './client';

export interface SystemSettings {
  revenuePercentage?: number;
  settlementPercentage?: number;
  /** When true, vendors see the Guidelines link and can open the Guidelines page. */
  showGuidelinesInVendorDashboard?: boolean;
  /** When true, vendors see the notification bell in the top bar. */
  showNotificationBellToVendors?: boolean;
  /** Which categories to show in the vendor notification dropdown. */
  showNotificationAppointments?: boolean;
  showNotificationSettlements?: boolean;
  showNotificationTickets?: boolean;
  showNotificationComments?: boolean;
  showNotificationSalesData?: boolean;
  /** When true, admins see the notification bell in the top bar. */
  showNotificationBellToAdmins?: boolean;
  /** Which categories to show in the admin notification dropdown. */
  showAdminNotificationAppointments?: boolean;
  showAdminNotificationSettlements?: boolean;
  showAdminNotificationTickets?: boolean;
  showAdminNotificationComments?: boolean;
  showAdminNotificationSalesData?: boolean;
  /** When true, Import buttons are visible on Branches, Packages, Customers, Memberships, Appointments. */
  showImportButton?: boolean;
  /** When true, Admin sees the delete button(s) on the Customers page. */
  showCustomerDeleteToAdmin?: boolean;
  /** When true, Vendor sees the delete button(s) on the Customers page. */
  showCustomerDeleteToVendor?: boolean;
  /** When true, Staff sees the delete button(s) on the Customers page. */
  showCustomerDeleteToStaff?: boolean;
  /** When true, Admin sees the "Delete all customers" button (dangerous). */
  showDeleteAllCustomersButtonToAdmin?: boolean;
  /** When true, Admin sees the "Reset all data" button (dangerous). */
  showResetAllDataButtonToAdmin?: boolean;
  /** When true, Admin sees bulk delete controls on Branches page. */
  showBulkDeleteBranchesToAdmin?: boolean;
  /** When true, Admin sees bulk delete controls on Packages page. */
  showBulkDeletePackagesToAdmin?: boolean;
  /** When true, Admin sees bulk delete controls on Memberships page. */
  showBulkDeleteMembershipsToAdmin?: boolean;
  /** When true, Admin sees bulk settle controls on Settlements page. */
  showBulkSettleSettlementsToAdmin?: boolean;
  /** When true, Vendor/Staff see Edit, Activate, Inactive, Delete on Packages page. */
  showPackageActionsToVendor?: boolean;
  /** When true, Vendor/Staff can see and use edit/delete actions across dashboard pages. */
  showEditDeleteActionsToVendor?: boolean;
  /** When true, Vendor/Staff can add, edit, and delete services. */
  showServiceActionsToVendor?: boolean;
  /** When true, admin sees Memberships CSV export. */
  showMembershipsExportToAdmin?: boolean;
  /** When true, admin sees Customers CSV export. */
  showCustomersExportToAdmin?: boolean;
  /** When true, admin sees Settlements CSV export. */
  showSettlementsExportToAdmin?: boolean;
  /** When true, admin can delete a recorded membership usage/session on the detail page. */
  showDeleteMembershipUsageToAdmin?: boolean;
  /** When true, admin can delete manual sales rows on the sales dashboard. */
  showManualSalesDeleteToAdmin?: boolean;
}

export async function getSettings(): Promise<{
  success: boolean;
  settings?: SystemSettings;
  message?: string;
}> {
  const r = await apiRequest<{ settings: SystemSettings }>('/settings');
  if (r.success && 'settings' in r) return { success: true, settings: (r as { settings: SystemSettings }).settings };
  return { success: false, message: (r as { message?: string }).message };
}

export async function updateSettings(data: {
  revenuePercentage?: number;
  settlementPercentage?: number;
  showGuidelinesInVendorDashboard?: boolean;
  showNotificationBellToVendors?: boolean;
  showNotificationAppointments?: boolean;
  showNotificationSettlements?: boolean;
  showNotificationTickets?: boolean;
  showNotificationComments?: boolean;
  showNotificationSalesData?: boolean;
  showNotificationBellToAdmins?: boolean;
  showAdminNotificationAppointments?: boolean;
  showAdminNotificationSettlements?: boolean;
  showAdminNotificationTickets?: boolean;
  showAdminNotificationComments?: boolean;
  showAdminNotificationSalesData?: boolean;
  showImportButton?: boolean;
  showCustomerDeleteToAdmin?: boolean;
  showCustomerDeleteToVendor?: boolean;
  showCustomerDeleteToStaff?: boolean;
  showDeleteAllCustomersButtonToAdmin?: boolean;
  showResetAllDataButtonToAdmin?: boolean;
  showBulkDeleteBranchesToAdmin?: boolean;
  showBulkDeletePackagesToAdmin?: boolean;
  showBulkDeleteMembershipsToAdmin?: boolean;
  showBulkSettleSettlementsToAdmin?: boolean;
  showPackageActionsToVendor?: boolean;
  showEditDeleteActionsToVendor?: boolean;
  showServiceActionsToVendor?: boolean;
  showMembershipsExportToAdmin?: boolean;
  showCustomersExportToAdmin?: boolean;
  showSettlementsExportToAdmin?: boolean;
  showDeleteMembershipUsageToAdmin?: boolean;
  showManualSalesDeleteToAdmin?: boolean;
}): Promise<{
  success: boolean;
  settings?: SystemSettings;
  message?: string;
}> {
  const r = await apiRequest<{ settings: SystemSettings }>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (r.success && 'settings' in r) return { success: true, settings: (r as { settings: SystemSettings }).settings };
  return { success: false, message: (r as { message?: string }).message };
}
