import { apiRequest } from './client';

export interface PackageItem {
  id: string;
  name: string;
  price: number;
  discountAmount?: number;
  totalSessions?: number;
  settlementAmount?: number;
  isActive?: boolean;
}

export async function getPackages(includeInactive = false): Promise<{ success: boolean; packages?: PackageItem[]; message?: string }> {
  const q = includeInactive ? '?all=true' : '';
  const r = await apiRequest<{ packages: PackageItem[] }>(`/packages${q}`);
  if (r.success && 'packages' in r) return { success: true, packages: (r as { packages: PackageItem[] }).packages };
  return { success: false, message: (r as { message?: string }).message };
}

export async function getPackagesPaged(params?: {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ success: boolean; packages?: PackageItem[]; total?: number; pages?: number; page?: number; limit?: number; message?: string }> {
  const q = new URLSearchParams();
  if (params?.includeInactive) q.set('all', 'true');
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  const query = q.toString();
  const r = await apiRequest<{ packages: PackageItem[]; total?: number; pages?: number; page?: number; limit?: number }>(`/packages${query ? `?${query}` : ''}`);
  const rr = r as unknown as { success: boolean; packages?: PackageItem[]; total?: number; pages?: number; page?: number; limit?: number; message?: string };
  return rr.success ? { success: true, packages: rr.packages ?? [], total: rr.total, pages: rr.pages, page: rr.page, limit: rr.limit } : { success: false, message: rr.message };
}

export async function createPackage(data: { name: string; price: number; discountAmount?: number; totalSessions: number }) {
  return apiRequest<{ package: PackageItem }>('/packages', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePackage(id: string, data: { name?: string; price?: number; discountAmount?: number; totalSessions?: number; isActive?: boolean }) {
  return apiRequest<{ package: PackageItem }>(`/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deletePackage(id: string) {
  return apiRequest<{ message?: string }>(`/packages/${id}`, { method: 'DELETE' });
}

export async function bulkDeletePackages(ids: string[]): Promise<{ success: boolean; deactivated?: number; message?: string }> {
  const r = await apiRequest<{ deactivated: number }>('/packages/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids, confirm: 'DELETE_SELECTED_PACKAGES' }),
  });
  const rr = r as unknown as { success: boolean; deactivated?: number; message?: string };
  return rr.success ? { success: true, deactivated: rr.deactivated ?? 0 } : { success: false, message: rr.message };
}