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