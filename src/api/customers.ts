import { apiRequest } from './client';
import type { Customer } from '../types/crm';

export async function getCustomers(): Promise<{ success: boolean; customers?: Customer[]; message?: string }> {
  // Fetch up to 20k customers so large accounts can see more than 10k in the UI.
  const r = await apiRequest<{ customers: Customer[] }>('/customers?limit=20000');
  if (r.success && 'customers' in r) return { success: true, customers: (r as { customers: Customer[] }).customers };
  return { success: false, message: (r as { message?: string }).message };
}

export async function getCustomersPaged(params?: {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string;
}): Promise<{ success: boolean; customers?: Customer[]; total?: number; pages?: number; page?: number; limit?: number; message?: string }> {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.branchId) q.set('branchId', params.branchId);
  const query = q.toString();
  const r = await apiRequest<{ customers: Customer[]; total?: number; pages?: number; page?: number; limit?: number }>(`/customers${query ? `?${query}` : ''}`);
  const rr = r as unknown as { success: boolean; customers?: Customer[]; total?: number; pages?: number; page?: number; limit?: number; message?: string };
  return rr.success
    ? { success: true, customers: rr.customers ?? [], total: rr.total, pages: rr.pages, page: rr.page, limit: rr.limit }
    : { success: false, message: rr.message };
}

/** All customers in the system for name search/dropdown (e.g. Add customer form) */
export async function getCustomersForDropdown(): Promise<{ success: boolean; customers?: (Customer & { primaryBranchId?: string | null })[]; message?: string }> {
  // Dropdowns also allow up to 20k, but UI should still rely on search for performance.
  const r = await apiRequest<{ customers: (Customer & { primaryBranchId?: string | null })[] }>('/customers?forDropdown=1&limit=20000');
  if (r.success && 'customers' in r) return { success: true, customers: (r as { customers: (Customer & { primaryBranchId?: string | null })[] }).customers };
  return { success: false, message: (r as { message?: string }).message };
}

export async function getCustomer(id: string) {
  return apiRequest<{ customer: Customer }>(`/customers/${id}`);
}

export async function createCustomer(data: { name: string; phone: string; email?: string; membershipCardId?: string; primaryBranchId?: string; customerPackage?: string; customerPackagePrice?: number; customerPackageExpiry?: string; notes?: string }) {
  return apiRequest<{ customer: Customer }>('/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCustomer(id: string, data: Partial<Customer> & { primaryBranchId?: string | null }) {
  return apiRequest<{ customer: Customer }>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function purgeAllCustomers(): Promise<{
  success: boolean;
  deleted?: {
    appointments: number;
    memberships: number;
    membershipUsages: number;
    loyaltyAccounts: number;
    loyaltyTransactions: number;
    customers: number;
  };
  message?: string;
}> {
  const r = await apiRequest<{
    deleted: {
      appointments: number;
      memberships: number;
      membershipUsages: number;
      loyaltyAccounts: number;
      loyaltyTransactions: number;
      customers: number;
    };
  }>('/customers/purge-all', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'DELETE_ALL_CUSTOMERS' }),
  });
  if (r.success && 'deleted' in r) return { success: true, deleted: (r as { deleted: any }).deleted };
  return { success: false, message: (r as { message?: string }).message };
}

export async function bulkDeleteCustomers(ids: string[]): Promise<{
  success: boolean;
  deleted?: {
    customers: number;
    appointments: number;
    loyaltyAccounts: number;
    loyaltyTransactions: number;
  };
  skippedWithMemberships?: string[];
  message?: string;
}> {
  const r = await apiRequest<{
    deleted: {
      customers: number;
      appointments: number;
      loyaltyAccounts: number;
      loyaltyTransactions: number;
    };
    skippedWithMemberships: string[];
  }>('/customers/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids, confirm: 'DELETE_SELECTED_CUSTOMERS' }),
  });

  const rr = r as unknown as {
    success: boolean;
    deleted?: {
      customers: number;
      appointments: number;
      loyaltyAccounts: number;
      loyaltyTransactions: number;
    };
    skippedWithMemberships?: string[];
    message?: string;
  };

  if (rr.success && rr.deleted) {
    return {
      success: true,
      deleted: rr.deleted,
      skippedWithMemberships: rr.skippedWithMemberships ?? [],
    };
  }
  return { success: false, message: rr.message };
}

export interface VisitHistoryItem {
  type: 'appointment' | 'membership_usage';
  id: string;
  date: string;
  service: string;
  branch?: string;
  branchId?: string;
  staff?: string;
  creditsUsed?: number;
}

export async function getCustomerVisitHistory(customerId: string): Promise<{ success: boolean; visitHistory?: VisitHistoryItem[]; message?: string }> {
  const r = await apiRequest<{ visitHistory: VisitHistoryItem[] }>(`/customers/${customerId}/visit-history`);
  if (r.success && 'visitHistory' in r) return { success: true, visitHistory: (r as { visitHistory: VisitHistoryItem[] }).visitHistory };
  return { success: false, message: (r as { message?: string }).message };
}
