import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { bulkDeleteMemberships, getMemberships, createMembership, importMemberships, recordMembershipUsage, deleteMembership, updateMembership, type ImportRow } from '../api/memberships';
import { getCustomers } from '../api/customers';
import { getBranches } from '../api/branches';
import { getPackages } from '../api/packages';
import { getSettings } from '../api/settings';
import { useAuth } from '../auth/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/money';
import type { Membership, Branch } from '../types/crm';
import type { Customer } from '../types/common';
import type { PackageItem } from '../api/packages';

export default function MembershipsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [branchId, setBranchId] = useState(searchParams.get('branchId') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(searchParams.get('customerId') ? true : false);
  const [createCustomerId, setCreateCustomerId] = useState(searchParams.get('customerId') || '');
  const [createCustomerSearch, setCreateCustomerSearch] = useState('');
  const [createCustomerDropdownOpen, setCreateCustomerDropdownOpen] = useState(false);
  const createCustomerInputRef = useRef<HTMLInputElement>(null);
  const createCustomerDropdownRef = useRef<HTMLDivElement>(null);
  const [createSoldAtBranchId, setCreateSoldAtBranchId] = useState('');
  const [createPackageId, setCreatePackageId] = useState('');
  const [createPackagePrice, setCreatePackagePrice] = useState('');
  const [createDiscountAmount, setCreateDiscountAmount] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; createdCustomers: number; errors: { row: number; message: string }[] } | null>(null);
  const [sessionsImporting, setSessionsImporting] = useState(false);
  const [sessionsImportResult, setSessionsImportResult] = useState<{ ok: number; fail: number; skipped: number; missingMembershipIds?: Set<string>; missingBranchIds?: Set<string> } | null>(null);
  const [showImportButton, setShowImportButton] = useState(true);
  const [showBulkDeleteMembershipsToAdmin, setShowBulkDeleteMembershipsToAdmin] = useState(false);
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteConfirmError, setDeleteConfirmError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const basePath = user?.role === 'admin' ? '/admin' : '/vendor';
  const isAdmin = user?.role === 'admin';
  const PAGE_SIZE = 10;

  const selectedPackage = useMemo(() => packages.find((p) => p.id === createPackageId), [packages, createPackageId]);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === createCustomerId), [customers, createCustomerId]);
  const createCustomerSearchLower = createCustomerSearch.trim().toLowerCase();
  const filteredCreateCustomers = useMemo(() => {
    if (!createCustomerSearchLower) return customers;
    return customers.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      const cardId = (c.membershipCardId ?? '').toLowerCase();
      return (
        name.includes(createCustomerSearchLower) ||
        phone.includes(createCustomerSearchLower) ||
        email.includes(createCustomerSearchLower) ||
        cardId.includes(createCustomerSearchLower)
      );
    });
  }, [customers, createCustomerSearchLower]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      const target = ev.target as Node;
      if (
        createCustomerDropdownRef.current &&
        !createCustomerDropdownRef.current.contains(target) &&
        createCustomerInputRef.current &&
        !createCustomerInputRef.current.contains(target)
      ) {
        setCreateCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { filteredMemberships, totalFiltered, totalPages, currentPage, paginatedMemberships } = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    const filtered = searchLower
      ? memberships.filter((m) => {
          const customerName = (m.customer?.name ?? '').toLowerCase();
          const customerPhone = (m.customer?.phone ?? '').toLowerCase();
          const customerEmail = (m.customer?.email ?? '').toLowerCase();
          const typeName = (m.typeName ?? '').toLowerCase();
          const soldAt = (m.soldAtBranch ?? '').toLowerCase();
          const statusStr = (m.status ?? '').toLowerCase();
          return (
            customerName.includes(searchLower) ||
            customerPhone.includes(searchLower) ||
            customerEmail.includes(searchLower) ||
            typeName.includes(searchLower) ||
            soldAt.includes(searchLower) ||
            statusStr.includes(searchLower)
          );
        })
      : memberships;
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pages);
    const paginated = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    return {
      filteredMemberships: filtered,
      totalFiltered: total,
      totalPages: pages,
      currentPage: current,
      paginatedMemberships: paginated,
    };
  }, [memberships, searchQuery, page, PAGE_SIZE]);

  useEffect(() => {
    const customerIdFromUrl = searchParams.get('customerId');
    if (customerIdFromUrl) {
      setShowCreateForm(true);
      setCreateCustomerId(customerIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.success && r.settings && typeof r.settings.showImportButton === 'boolean') {
        setShowImportButton(r.settings.showImportButton);
      }
      if (r.success && r.settings && typeof (r.settings as { showBulkDeleteMembershipsToAdmin?: boolean }).showBulkDeleteMembershipsToAdmin === 'boolean') {
        setShowBulkDeleteMembershipsToAdmin((r.settings as { showBulkDeleteMembershipsToAdmin: boolean }).showBulkDeleteMembershipsToAdmin);
      }
    });
  }, []);

  const canBulkDelete = isAdmin && showBulkDeleteMembershipsToAdmin;

  const toggleSelected = useCallback((id: string) => {
    setSelectedMembershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedMembershipIds(new Set()), []);

  const selectAllFiltered = useCallback(() => {
    setSelectedMembershipIds(new Set(filteredMemberships.map((m) => String(m.id))));
  }, [filteredMemberships]);

  useEffect(() => {
    if (!canBulkDelete && selectedMembershipIds.size > 0) clearSelection();
  }, [canBulkDelete, selectedMembershipIds.size, clearSelection]);

  const openBulkDeleteDialog = useCallback(() => {
    if (!canBulkDelete) return;
    if (selectedMembershipIds.size === 0) return;
    setBulkDeleteConfirmText('');
    setShowBulkDeleteDialog(true);
  }, [canBulkDelete, selectedMembershipIds.size]);

  const confirmBulkDelete = useCallback(async () => {
    if (!canBulkDelete) return;
    const ids = Array.from(selectedMembershipIds);
    if (ids.length === 0) return;
    if (bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setShowBulkDeleteDialog(false);
    setBulkDeleting(true);
    setBulkDeleteMessage('');
    setError('');
    const BATCH_SIZE = 5000;
    let totalMemberships = 0;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setBulkDeleteMessage(`Deleting ${Math.min(i + batch.length, ids.length)} of ${ids.length}…`);
      // eslint-disable-next-line no-await-in-loop
      const r = await bulkDeleteMemberships(batch);
      if (!r.success) {
        setBulkDeleting(false);
        setError(r.message || 'Failed to delete selected memberships.');
        return;
      }
      totalMemberships += r.deleted?.memberships ?? 0;
    }
    setBulkDeleting(false);
    setBulkDeleteMessage(`Deleted ${totalMemberships} membership(s).`);
    clearSelection();
    getMemberships({
      branchId: branchId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then((r) => {
      if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
    });
  }, [canBulkDelete, selectedMembershipIds, bulkDeleteConfirmText, clearSelection, branchId, status, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, branchId, status, dateFrom, dateTo]);

  useEffect(() => {
    if (!deleteConfirmId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDeleteConfirm();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteConfirmId]);

  function openDeleteConfirm(id: string) {
    setDeleteConfirmId(id);
    setDeleteConfirmInput('');
    setDeleteConfirmError('');
  }

  function closeDeleteConfirm() {
    setDeleteConfirmId(null);
    setDeleteConfirmInput('');
    setDeleteConfirmError('');
  }

  async function handleDeleteConfirmOk() {
    if (!deleteConfirmId) return;
    if (deleteConfirmInput.trim() !== 'CONFIRM') {
      setDeleteConfirmError('Type CONFIRM exactly to proceed.');
      return;
    }
    setDeleteConfirmError('');
    setDeletingId(deleteConfirmId);
    const res = await deleteMembership(deleteConfirmId);
    setDeletingId(null);
    closeDeleteConfirm();
    if (res.success) {
      setMemberships((prev) => prev.filter((m) => m.id !== deleteConfirmId));
    } else {
      setError(res.message || 'Failed to delete membership.');
    }
  }

  function escapeCsvCell(value: string | number): string {
    const s = String(value ?? '').replace(/"/g, '""');
    return /[,"\n\r]/.test(s) ? `"${s}"` : s;
  }

  function exportToCsv() {
    const headers = ['Date', 'Name', 'Total', 'Used', 'Remaining', 'Package Name', 'Package Price', 'Sold at', 'Status'];
    const rows = filteredMemberships.map((m) => {
      const remaining = m.remainingCredits ?? m.totalCredits - m.usedCredits;
      const dateStr = m.purchaseDate ? new Date(m.purchaseDate).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
      const pkgName = m.packageName || m.typeName || '—';
      const priceStr = m.packagePrice != null
        ? formatCurrency(m.packagePrice)
        : '—';
      return [
        dateStr,
        m.customer?.name ?? '—',
        m.totalCredits,
        m.usedCredits,
        remaining,
        pkgName,
        priceStr,
        m.soldAtBranch ?? '—',
        m.status ?? '—',
      ].map(escapeCsvCell);
    });
    const csv = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memberships-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let cell = '';
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2; continue; }
          if (line[i] === '"') { i++; break; }
          cell += line[i++];
        }
        out.push(cell);
      } else {
        let cell = '';
        while (i < line.length && line[i] !== ',') cell += line[i++];
        out.push(cell.trim());
        if (line[i] === ',') i++;
      }
    }
    return out;
  }

  function csvToImportRows(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const get = (row: string[], name: string) => {
      const i = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      return i >= 0 ? row[i] ?? '' : '';
    };
    const out: ImportRow[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cells = parseCsvLine(lines[r]);
      const customerName = get(cells, 'Customer') || get(cells, 'customerName');
      const customerPhone = get(cells, 'Phone') || get(cells, 'customerPhone');
      const customerEmail = get(cells, 'Email') || get(cells, 'customerEmail');
      const totalCreditsRaw = get(cells, 'Total credits') || get(cells, 'totalCredits');
      const soldAtBranch = get(cells, 'Sold at') || get(cells, 'soldAtBranch') || get(cells, 'Branch');
      let packagePrice: number | undefined;
      const priceStr = get(cells, 'Package price') || get(cells, 'packagePrice');
      if (priceStr && priceStr !== '—' && priceStr !== '-') {
        const num = parseFloat(priceStr.replace(/[$,]/g, '').trim());
        if (!Number.isNaN(num)) packagePrice = num;
      }
      const totalCredits = parseInt(totalCreditsRaw, 10) || 0;
      if (!customerName.trim() && !customerPhone.trim()) continue;
      out.push({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        totalCredits: totalCredits || 1,
        soldAtBranch: soldAtBranch.trim(),
        packagePrice,
      });
    }
    return out;
  }

  function extractMembershipRows(parsed: unknown): Record<string, unknown>[] {
    if (Array.isArray(parsed)) {
      const tableObj = parsed.find((item) => item && typeof item === 'object' && (item as { type?: string }).type === 'table' && Array.isArray((item as { data?: unknown[] }).data));
      if (tableObj) return (tableObj as { data: Record<string, unknown>[] }).data;
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    }
    return [];
  }

  function jsonToImportRows(
    rawRows: Record<string, unknown>[],
    customerList: Customer[]
  ): { rows: Array<{ importRow: ImportRow; oldMembershipId: string; customerId: string; soldAtBranchId: string }>; skippedNoMap: number; skippedNoCustomer: number; skippedNoBranchPkg: number } {
    const customerLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}');
    const branchLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('branchLegacyIdMap') || '{}');
    const branchesByIndex = [...branches].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const packagesByIndex = [...packages].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const customersByIndex = [...customerList].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
    const out: Array<{ importRow: ImportRow; oldMembershipId: string; customerId: string; soldAtBranchId: string }> = [];
    let skippedNoMap = 0, skippedNoCustomer = 0, skippedNoBranchPkg = 0;
    for (const row of rawRows) {
      const oldCustomerId = str(row.customer_id);
      let ourCustomerId = customerLegacyMap[oldCustomerId];
      if (!ourCustomerId && customersByIndex.length > 0) {
        const idx = Math.max(0, parseInt(oldCustomerId, 10) - 1);
        if (idx < customersByIndex.length) ourCustomerId = customersByIndex[idx].id;
      }
      if (!ourCustomerId) { skippedNoMap++; continue; }
      const customer = customerList.find((c) => c.id === ourCustomerId);
      if (!customer) { skippedNoCustomer++; continue; }
      const oldBranchId = str(row.branch_id);
      let branch = branchLegacyMap[oldBranchId] ? branches.find((b) => b.id === branchLegacyMap[oldBranchId]) : null;
      if (!branch) {
        const branchIdx = Math.max(0, parseInt(oldBranchId, 10) - 1);
        branch = branchesByIndex[branchIdx] || branchesByIndex[0];
      }
      const pkgIdx = Math.max(0, parseInt(str(row.package_id), 10) - 1);
      const pkg = packagesByIndex[pkgIdx] || packagesByIndex[0];
      if (!branch || !pkg) { skippedNoBranchPkg++; continue; }
      const totalCredits = pkg.totalSessions ?? 1;
      const oldMembershipId = str(row.id);
      out.push({
        importRow: {
          customerName: customer.name || '',
          customerPhone: customer.phone || '',
          customerEmail: customer.email,
          totalCredits,
          soldAtBranch: branch.name || '',
          packagePrice: pkg.price,
          customerPackage: pkg.name,
        },
        oldMembershipId,
        customerId: customer.id,
        soldAtBranchId: branch.id,
      });
    }
    return { rows: out, skippedNoMap, skippedNoCustomer, skippedNoBranchPkg };
  }

  function jsonToImportRowsLegacySessions(
    rawRows: Record<string, unknown>[],
    customerList: Customer[]
  ): {
    rows: Array<{ importRow: ImportRow; customerId: string; soldAtBranchId: string; usedCredits: number; legacyKey: string }>;
    skippedNoCustomer: number;
    skippedNoBranch: number;
  } {
    const customerLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}');
    const branchLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('branchLegacyIdMap') || '{}');
    const branchesByIndex = [...branches].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const customersByIndex = [...customerList].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
    const num = (v: unknown, fallback = 0) => {
      const n = Number(str(v));
      return Number.isFinite(n) ? n : fallback;
    };
    const parsePriceFromName = (name: string) => {
      const m = name.match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (!m) return undefined;
      const p = Number(m[1]);
      return Number.isFinite(p) ? p : undefined;
    };

    const out: Array<{ importRow: ImportRow; customerId: string; soldAtBranchId: string; usedCredits: number; legacyKey: string }> = [];
    let skippedNoCustomer = 0;
    let skippedNoBranch = 0;

    for (const row of rawRows) {
      const oldCustomerId = str(row.customer_id);
      let ourCustomerId = customerLegacyMap[oldCustomerId];
      if (!ourCustomerId && customersByIndex.length > 0) {
        const idx = Math.max(0, parseInt(oldCustomerId, 10) - 1);
        if (idx < customersByIndex.length) ourCustomerId = customersByIndex[idx].id;
      }
      if (!ourCustomerId) {
        skippedNoCustomer++;
        continue;
      }

      // Branch: if not present in legacy row, default to first branch (or vendor's branch via backend rules).
      const oldBranchId = str(row.branch_id);
      let soldAtBranchId = '';
      if (oldBranchId) {
        soldAtBranchId =
          (branchLegacyMap[oldBranchId] ? String(branchLegacyMap[oldBranchId]) : '') ||
          (branchesByIndex[Math.max(0, parseInt(oldBranchId, 10) - 1)]?.id || '');
      }
      if (!soldAtBranchId) soldAtBranchId = branchesByIndex[0]?.id || '';
      if (!soldAtBranchId) {
        skippedNoBranch++;
        continue;
      }

      const packageName = str(row.package_name) || str(row.packageName) || '—';
      const totalCredits = Math.max(1, num(row.total_sessions, 1));
      const usedCredits = Math.max(0, num(row.used_sessions, 0));
      const remaining = num(row.remaining_sessions, totalCredits - usedCredits);
      const packagePrice = parsePriceFromName(packageName) ?? undefined;

      const legacyKey = `${str(row.customer_id)}|${str(row.package_id)}|${packageName}`;

      out.push({
        importRow: {
          customerName: str(row.customer_name) || '',
          customerPhone: '',
          customerEmail: undefined,
          totalCredits,
          soldAtBranch: '',
          packagePrice,
          customerPackage: packageName,
        },
        customerId: ourCustomerId,
        soldAtBranchId,
        usedCredits,
        legacyKey: remaining < 0 ? legacyKey : legacyKey, // keep stable; remaining can be negative in legacy data
      });
    }

    return { rows: out, skippedNoCustomer, skippedNoBranch };
  }

  function jsonToImportRowsLegacyCm(
    rawRows: Record<string, unknown>[],
    customerList: Customer[]
  ): {
    rows: Array<{ importRow: ImportRow; customerId: string; soldAtBranchId: string; usedCredits: number; legacyMembershipId: string }>;
    skippedNoCustomer: number;
    skippedNoBranch: number;
  } {
    const customerLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}');
    const customersByIndex = [...customerList].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
    const num = (v: unknown, fallback = 0) => {
      const n = Number(str(v));
      return Number.isFinite(n) ? n : fallback;
    };
    const parsePriceFromName = (name: string) => {
      const m = name.match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (!m) return undefined;
      const p = Number(m[1]);
      return Number.isFinite(p) ? p : undefined;
    };
    const parseTur = (s: string) => {
      // "5 / 1 / 4" (with optional escaping)
      const cleaned = s.replace(/\\\//g, '/');
      const parts = cleaned.split('/').map((p) => p.trim()).filter(Boolean);
      const total = Math.max(1, num(parts[0], 1));
      const used = Math.max(0, num(parts[1], 0));
      const remaining = num(parts[2], Math.max(0, total - used));
      return { total, used, remaining };
    };

    const normalizeBranchName = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9 ]/g, '');

    const branchesByNormName = new Map<string, string>();
    branches.forEach((b) => {
      const key = normalizeBranchName(b.name || '');
      if (key) branchesByNormName.set(key, b.id);
    });

    const out: Array<{ importRow: ImportRow; customerId: string; soldAtBranchId: string; usedCredits: number; legacyMembershipId: string }> = [];
    let skippedNoCustomer = 0;
    let skippedNoBranch = 0;

    for (const row of rawRows) {
      const legacyMembershipId = str(row.membership_id || row.membershipId || row.id);
      const oldCustomerId = str(row.customer_id || row.customerId);
      const soldAtName = str(row.sold_at || row.soldAt || row.branch);
      const pkgName = str(row.package_name || row.packageName);
      const tur = str(row.total_used_remaining || row.totalUsedRemaining);
      if (!oldCustomerId || !soldAtName || !pkgName || !tur) continue;

      let ourCustomerId = customerLegacyMap[oldCustomerId];
      if (!ourCustomerId && customersByIndex.length > 0) {
        const idx = Math.max(0, parseInt(oldCustomerId, 10) - 1);
        if (idx < customersByIndex.length) ourCustomerId = customersByIndex[idx].id;
      }
      if (!ourCustomerId) {
        skippedNoCustomer++;
        continue;
      }

      const soldAtNorm = normalizeBranchName(soldAtName);
      let soldAtBranchId = branchesByNormName.get(soldAtNorm) || '';
      if (!soldAtBranchId && soldAtNorm) {
        // Fuzzy fallback: match if one contains the other (handles minor naming differences).
        for (const [k, v] of branchesByNormName.entries()) {
          if (k.includes(soldAtNorm) || soldAtNorm.includes(k)) {
            soldAtBranchId = v;
            break;
          }
        }
      }
      if (!soldAtBranchId) {
        skippedNoBranch++;
        continue;
      }

      const { total, used, remaining } = parseTur(tur);
      const packagePrice = parsePriceFromName(pkgName) ?? undefined;

      out.push({
        importRow: {
          customerName: str(row.customer) || str(row.customer_name) || '',
          customerPhone: '',
          customerEmail: undefined,
          totalCredits: total,
          soldAtBranch: soldAtName,
          packagePrice,
          customerPackage: pkgName,
        },
        customerId: ourCustomerId,
        soldAtBranchId,
        usedCredits: used,
        legacyMembershipId: legacyMembershipId || `${oldCustomerId}|${pkgName}|${soldAtName}|${total}|${used}|${remaining}`,
      });
    }

    return { rows: out, skippedNoCustomer, skippedNoBranch };
  }

  async function handleImportFile(file: File) {
    setImportResult(null);
    setError('');
    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{');
    let rows: ImportRow[] = [];
    if (isJson) {
      try {
        const parsed = JSON.parse(text);
        const rawRows = extractMembershipRows(parsed);
        if (rawRows.length === 0) {
          setError('No membership data found. Expected PHPMyAdmin table export or { data: [...] }.');
          return;
        }
        const freshRes = await getCustomers();
        const customerList = (freshRes.success && freshRes.customers) ? freshRes.customers : customers;

        // "cm.json" style export: membership_id, customer_id, customer, total_used_remaining, package_name, sold_at, status
        const looksLikeCm = rawRows.some((r) => r && typeof r === 'object' && ('membership_id' in r || 'total_used_remaining' in r || 'sold_at' in r));
        if (looksLikeCm) {
          // Ensure branches are loaded before we try to resolve sold_at → branchId.
          if (branches.length === 0) {
            const br = await getBranches({ all: true });
            if (br.success && br.branches) setBranches(br.branches);
          }

          const { rows: importRows, skippedNoCustomer, skippedNoBranch } = jsonToImportRowsLegacyCm(rawRows, customerList);
          if (importRows.length === 0) {
            const parts: string[] = [];
            if (skippedNoCustomer > 0) parts.push(`${skippedNoCustomer} rows: customer_id not found (import customers first, or ensure IDs match)`);
            if (skippedNoBranch > 0) parts.push(`${skippedNoBranch} rows: sold_at branch not found (create branches first, names must match)`);
            setError(`No valid rows from ${rawRows.length} in file. ${parts.join('; ') || 'Unknown format.'}`);
            return;
          }

          setImporting(true);
          const membershipLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('membershipLegacyIdMap') || '{}');
          let imported = 0;
          for (const { importRow, customerId, soldAtBranchId, usedCredits, legacyMembershipId } of importRows) {
            const res = await createMembership({
              customerId,
              totalCredits: importRow.totalCredits,
              soldAtBranchId: isAdmin ? soldAtBranchId : undefined,
              customerPackage: importRow.customerPackage,
              customerPackagePrice: importRow.packagePrice ?? 0,
              discountAmount: 0,
            });
            const newId = (res as unknown as { membership?: { id?: string } }).membership?.id;
            if (res.success && newId) {
              membershipLegacyMap[String(legacyMembershipId)] = newId;
              imported++;
              const cappedUsed = Math.max(0, Math.min(usedCredits, importRow.totalCredits));
              const statusUpper = String((rawRows as unknown as Array<Record<string, unknown>>).find((x) => String(x.membership_id || x.membershipId || x.id) === String(legacyMembershipId))?.status || '').toUpperCase();
              const statusUpdate = cappedUsed >= importRow.totalCredits ? 'used' : (statusUpper === 'INACTIVE' ? 'expired' : undefined);
              // eslint-disable-next-line no-await-in-loop
              await updateMembership(newId, { usedCredits: cappedUsed, ...(statusUpdate ? { status: statusUpdate } : {}) });
            }
          }
          if (Object.keys(membershipLegacyMap).length > 0) localStorage.setItem('membershipLegacyIdMap', JSON.stringify(membershipLegacyMap));
          setImporting(false);
          setImportResult({ imported, createdCustomers: 0, errors: [] });
          if (imported > 0) {
            getMemberships({ branchId: branchId || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then((r) => {
              if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
            });
          }
          return;
        }

        // Legacy "sessions" style export (like your file: customer_id, package_name, total_sessions, used_sessions, remaining_sessions)
        // should import memberships AND set used credits so the list shows correct totals immediately.
        const looksLikeLegacySessions = rawRows.some((r) => r && typeof r === 'object' && ('total_sessions' in r || 'used_sessions' in r || 'remaining_sessions' in r));
        if (looksLikeLegacySessions) {
          const { rows: importRows, skippedNoCustomer, skippedNoBranch } = jsonToImportRowsLegacySessions(rawRows, customerList);
          if (importRows.length === 0) {
            const parts: string[] = [];
            if (skippedNoCustomer > 0) parts.push(`${skippedNoCustomer} rows: customer_id not found (import customers first, or ensure IDs match)`);
            if (skippedNoBranch > 0) parts.push(`${skippedNoBranch} rows: no branch available (create branches first)`);
            setError(`No valid rows from ${rawRows.length} in file. ${parts.join('; ') || 'Unknown format.'}`);
            return;
          }

          setImporting(true);
          const membershipLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('membershipLegacyIdMap') || '{}');
          let imported = 0;
          for (const { importRow, customerId, soldAtBranchId, usedCredits, legacyKey } of importRows) {
            const res = await createMembership({
              customerId,
              totalCredits: importRow.totalCredits,
              soldAtBranchId: isAdmin ? soldAtBranchId || undefined : undefined,
              customerPackage: importRow.customerPackage,
              customerPackagePrice: importRow.packagePrice ?? 0,
              discountAmount: 0,
            });
            const newId = (res as unknown as { membership?: { id?: string } }).membership?.id;
            if (res.success && newId) {
              membershipLegacyMap[legacyKey] = newId;
              imported++;

              // Apply used credits so UI shows correct Total/Used/Remaining.
              const cappedUsed = Math.max(0, Math.min(usedCredits, importRow.totalCredits));
              const statusUpdate = cappedUsed >= importRow.totalCredits ? 'used' : undefined;
              // eslint-disable-next-line no-await-in-loop
              await updateMembership(newId, { usedCredits: cappedUsed, ...(statusUpdate ? { status: statusUpdate } : {}) });
            }
          }
          if (Object.keys(membershipLegacyMap).length > 0) localStorage.setItem('membershipLegacyIdMap', JSON.stringify(membershipLegacyMap));
          setImporting(false);
          setImportResult({ imported, createdCustomers: 0, errors: [] });
          if (imported > 0) {
            getMemberships({ branchId: branchId || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then((r) => {
              if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
            });
          }
          return;
        }

        // Existing JSON import path (expects customer_id/branch_id/package_id mapping)
        const { rows: importRows, skippedNoMap, skippedNoCustomer, skippedNoBranchPkg } = jsonToImportRows(rawRows, customerList);
        if (importRows.length === 0) {
          const parts: string[] = [];
          if (skippedNoMap > 0) parts.push(`${skippedNoMap} rows: customer_id not found (import customers first, or ensure IDs match)`);
          if (skippedNoCustomer > 0) parts.push(`${skippedNoCustomer} rows: customer not in system`);
          if (skippedNoBranchPkg > 0) parts.push(`${skippedNoBranchPkg} rows: branch or package missing`);
          const mapSize = Object.keys(JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}')).length;
          const hint = mapSize === 0
            ? ' Re-import customers from the Customers page first to build the ID mapping.'
            : ` You have ${mapSize} mapped customer IDs. Ensure branches and packages exist.`;
          setError(`No valid rows from ${rawRows.length} in file. ${parts.join('; ')}.${hint}`);
          return;
        }
        setImporting(true);
        const membershipLegacyMap: Record<string, string> = JSON.parse(localStorage.getItem('membershipLegacyIdMap') || '{}');
        let imported = 0;
        for (const { importRow, oldMembershipId, customerId, soldAtBranchId } of importRows) {
          const res = await createMembership({
            customerId,
            totalCredits: importRow.totalCredits,
            soldAtBranchId: isAdmin ? soldAtBranchId : undefined,
            customerPackage: importRow.customerPackage,
            customerPackagePrice: importRow.packagePrice,
            discountAmount: importRow.discountAmount,
          });
          if (res.success && (res as unknown as { membership?: { id?: string } }).membership?.id && oldMembershipId) {
            membershipLegacyMap[oldMembershipId] = (res as unknown as { membership: { id: string } }).membership.id;
            imported++;
          }
        }
        if (Object.keys(membershipLegacyMap).length > 0) localStorage.setItem('membershipLegacyIdMap', JSON.stringify(membershipLegacyMap));
        setImporting(false);
        setImportResult({ imported, createdCustomers: 0, errors: [] });
        if (imported > 0) {
          getMemberships({ branchId: branchId || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then((r) => {
            if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
          });
        }
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid JSON');
        setImporting(false);
        return;
      }
    } else {
      rows = csvToImportRows(text);
    }
    if (rows.length === 0) {
      setError(isJson ? 'No matching memberships.' : 'No valid rows to import. CSV must have a header row with Customer, Phone, Sold at, Total credits (and optionally Email, Package price).');
      return;
    }
    setImporting(true);
    const res = await importMemberships(rows);
    setImporting(false);
    if (res.success && res.imported != null) {
      setImportResult({ imported: res.imported, createdCustomers: res.createdCustomers ?? 0, errors: res.errors ?? [] });
      getMemberships({
        branchId: branchId || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }).then((r) => {
        if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
      });
    } else setError(res.message || 'Import failed.');
  }

  function extractSessionRows(parsed: unknown): Record<string, unknown>[] {
    if (Array.isArray(parsed)) {
      const tableObj = parsed.find((item) => {
        if (!item || typeof item !== 'object') return false;
        const t = item as { type?: string; name?: string; data?: unknown[] };
        return t.type === 'table' && Array.isArray(t.data) && (t.name === 'customer_sessions' || !t.name);
      });
      if (tableObj) return ((tableObj as { data: Record<string, unknown>[] }).data) || [];
      const anyTable = parsed.find((item) => item && typeof item === 'object' && (item as { type?: string }).type === 'table' && Array.isArray((item as { data?: unknown[] }).data));
      if (anyTable) return (anyTable as { data: Record<string, unknown>[] }).data;
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    }
    return [];
  }

  async function handleImportSessionsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setSessionsImportResult(null);
    setSessionsImporting(true);
    let ok = 0, fail = 0, skipped = 0;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawRows = extractSessionRows(parsed);
      if (rawRows.length === 0) {
        setError('No session data found. Expected PHPMyAdmin export for customer_sessions or { data: [...] }. Import memberships first.');
        setSessionsImporting(false);
        return;
      }
      const membershipMap: Record<string, string> = JSON.parse(localStorage.getItem('membershipLegacyIdMap') || '{}');
      const branchMap: Record<string, string> = JSON.parse(localStorage.getItem('branchLegacyIdMap') || '{}');
      const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
      const missingMembershipIds = new Set<string>();
      const missingBranchIds = new Set<string>();
      for (const row of rawRows) {
        const oldMembershipId = str(row.membership_id);
        const oldBranchId = str(row.branch_id);
        const creditsUsed = parseInt(str(row.no_of_sessions ?? row.credits_used ?? row.creditsUsed), 10) || 1;
        const ourMembershipId = membershipMap[oldMembershipId];
        const ourBranchId = branchMap[oldBranchId];
        if (!ourMembershipId || !ourBranchId) {
          skipped++;
          if (!ourMembershipId && oldMembershipId) missingMembershipIds.add(oldMembershipId);
          if (!ourBranchId && oldBranchId) missingBranchIds.add(oldBranchId);
          continue;
        }
        const res = await recordMembershipUsage(ourMembershipId, { creditsUsed, usedAtBranchId: ourBranchId });
        if (res.success) ok++;
        else fail++;
      }
      setSessionsImportResult({ ok, fail, skipped, missingMembershipIds, missingBranchIds });
      if (ok > 0) {
        getMemberships({ branchId: branchId || undefined, status: status || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then((r) => {
          if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
    setSessionsImporting(false);
  }

  useEffect(() => {
    getBranches({ all: true }).then((r) => r.success && r.branches && setBranches(r.branches || []));
  }, []);

  useEffect(() => {
    getCustomers().then((r) => r.success && r.customers && setCustomers(r.customers || []));
    getPackages(false).then((r) => r.success && r.packages && setPackages(r.packages || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    getMemberships({
      branchId: branchId || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then((r) => {
      setLoading(false);
      if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships);
      else setError((r as { message?: string }).message || 'Failed to load');
    });
  }, [branchId, status, dateFrom, dateTo]);

  useEffect(() => {
    if (createPackageId && selectedPackage) setCreatePackagePrice(String(selectedPackage.price));
  }, [createPackageId, selectedPackage?.price]);

  async function handleCreateMembership(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!createCustomerId) {
      setError('Customer is required.');
      return;
    }
    if (!createPackageId || !selectedPackage) {
      setError('Package is required. Please select a package from the list.');
      return;
    }
    const credits = selectedPackage.totalSessions ?? 1;
    const pkgPrice = createPackagePrice !== '' ? Number(createPackagePrice) : selectedPackage.price;
    if (Number.isNaN(pkgPrice) || pkgPrice < 0) {
      setError('Package price is required and must be 0 or greater.');
      return;
    }
    const discount = createDiscountAmount !== '' ? Number(createDiscountAmount) : undefined;
    if (discount != null && (discount < 0 || discount > pkgPrice)) {
      setError('Discount must be between 0 and total price.');
      return;
    }
    setCreateSubmitting(true);
    const res = await createMembership({
      customerId: createCustomerId,
      totalCredits: credits,
      soldAtBranchId: isAdmin ? createSoldAtBranchId || undefined : undefined,
      customerPackage: selectedPackage.name,
      customerPackagePrice: pkgPrice,
      discountAmount: discount,
    });
    setCreateSubmitting(false);
    if (res.success) {
      setShowCreateForm(false);
      setCreateCustomerId('');
      setCreateCustomerSearch('');
      setCreatePackageId('');
      setCreatePackagePrice('');
      setCreateDiscountAmount('');
      getMemberships({
        branchId: branchId || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }).then((r) => r.success && 'memberships' in r && setMemberships((r as { memberships: Membership[] }).memberships));
    } else setError((res as { message?: string }).message || 'Failed to create membership');
  }

  return (
    <div className="dashboard-content memberships-page">
      <header className="page-hero memberships-page-hero">
        <div>
          <h1 className="page-hero-title">Memberships</h1>
          <p className="page-hero-subtitle">Assign memberships to customers. View and use credits below.</p>
        </div>
        <button type="button" className="auth-submit memberships-create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create new membership'}
        </button>
      </header>

      {showCreateForm && (
        <section className="content-card memberships-create-form-card">
          <form onSubmit={handleCreateMembership} className="auth-form" style={{ maxWidth: '480px' }}>
            <label>
              <span>Customer</span>
              <div ref={createCustomerDropdownRef} className="create-membership-customer-wrap">
                <input
                  ref={createCustomerInputRef}
                  type="text"
                  className="create-membership-customer-input"
                  value={createCustomerId ? (selectedCustomer ? `${selectedCustomer.name} — ${selectedCustomer.phone}` : '') : createCustomerSearch}
                  onChange={(e) => {
                    setCreateCustomerId('');
                    setCreateCustomerSearch(e.target.value);
                    setCreateCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setCreateCustomerDropdownOpen(true)}
                  placeholder="Search by name, phone, email or Card ID"
                  autoComplete="off"
                  required
                />
                {createCustomerId && (
                  <button
                    type="button"
                    className="create-membership-clear-customer"
                    onClick={() => {
                      setCreateCustomerId('');
                      setCreateCustomerSearch('');
                      setCreateCustomerDropdownOpen(true);
                      createCustomerInputRef.current?.focus();
                    }}
                    aria-label="Clear customer selection"
                  >
                    ×
                  </button>
                )}
                {createCustomerDropdownOpen && (
                  <ul className="customer-name-dropdown settlements-dropdown create-membership-customer-dropdown" role="listbox">
                    {filteredCreateCustomers.length === 0 ? (
                      <li className="create-membership-customer-empty">No customers match</li>
                    ) : (
                      filteredCreateCustomers.slice(0, 100).map((c) => (
                        <li key={c.id} role="option" aria-selected={createCustomerId === c.id}>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setCreateCustomerId(c.id);
                              setCreateCustomerSearch('');
                              setCreateCustomerDropdownOpen(false);
                              createCustomerInputRef.current?.blur();
                            }}
                          >
                            {c.name} — {c.phone}{c.membershipCardId ? ` (${c.membershipCardId})` : ''}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </label>
            {isAdmin && (
              <label>
                <span>Branch (sold at)</span>
                <select value={createSoldAtBranchId} onChange={(e) => setCreateSoldAtBranchId(e.target.value)}>
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
            )}
            <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--theme-border)' }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--theme-text)', marginBottom: '0.75rem' }}>Package (required)</p>
            <label>
              <span>Package <strong>*</strong></span>
              <select value={createPackageId} onChange={(e) => setCreatePackageId(e.target.value)} required>
                <option value="">— Select package</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} ({p.totalSessions ?? 1} sessions)</option>
                ))}
              </select>
            </label>
            {createPackageId && selectedPackage && (
              <p className="form-hint" style={{ marginTop: 0, marginBottom: 0 }}>
                This package includes {(selectedPackage.totalSessions ?? 1)} session{(selectedPackage.totalSessions ?? 1) !== 1 ? 's' : ''}.
              </p>
            )}
            <button type="submit" className="auth-submit" disabled={createSubmitting}>{createSubmitting ? 'Creating…' : 'Create membership'}</button>
          </form>
        </section>
      )}

      <section className="content-card memberships-search-card">
        <label className="memberships-search-label" htmlFor="memberships-search-input">
          Search memberships
        </label>
        <input
          id="memberships-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Customer name, phone, email, package, branch, status…"
          className="memberships-search-input"
          autoComplete="off"
          aria-label="Search memberships by customer, phone, package, branch or status"
        />
        <div className="memberships-search-meta">
          {isAdmin && (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="memberships-filter-select" aria-label="Filter by branch">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="memberships-filter-select" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
          </select>
          <label className="memberships-date-filter-label">
            <span>From (date taken)</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="memberships-date-input"
              aria-label="Filter from date (membership taken)"
            />
          </label>
          <label className="memberships-date-filter-label">
            <span>To (date taken)</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="memberships-date-input"
              aria-label="Filter to date (membership taken)"
            />
          </label>
          {totalFiltered > 0 && (
            <span className="memberships-search-count text-muted">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalFiltered)} of {totalFiltered}
            </span>
          )}
          <button
            type="button"
            className="memberships-export-btn"
            onClick={exportToCsv}
            disabled={totalFiltered === 0}
            title={totalFiltered === 0 ? 'No data to export' : 'Export filtered results to CSV/Excel'}
          >
            Export to CSV / Excel
          </button>
          {canBulkDelete && (
            <>
              <button type="button" className="filter-btn" onClick={selectAllFiltered} disabled={filteredMemberships.length === 0}>
                Select all
              </button>
              <button type="button" className="filter-btn" onClick={clearSelection} disabled={selectedMembershipIds.size === 0}>
                Clear
              </button>
              {selectedMembershipIds.size > 0 && (
                <button type="button" className="customers-export-btn" onClick={openBulkDeleteDialog} disabled={bulkDeleting}>
                  {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedMembershipIds.size})`}
                </button>
              )}
            </>
          )}
          {showImportButton && (
            <>
              <label className="memberships-import-btn">
                <input
                  type="file"
                  accept=".csv,.txt,.json,text/csv,application/csv,application/json"
                  className="memberships-import-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                    e.target.value = '';
                  }}
                  disabled={importing}
                />
                {importing ? 'Importing…' : 'Import (CSV or JSON)'}
              </label>
              <label className="memberships-import-btn">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="memberships-import-input"
                  aria-label="Import sessions from JSON"
                  onChange={handleImportSessionsFile}
                  disabled={sessionsImporting}
                />
                {sessionsImporting ? 'Importing sessions…' : 'Import sessions (JSON)'}
              </label>
            </>
          )}
        </div>
        {showBulkDeleteDialog && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete selected memberships"
            onClick={() => setShowBulkDeleteDialog(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 1000,
            }}
          >
            <div className="content-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520 }}>
              <h3 style={{ marginTop: 0 }}>Delete selected memberships?</h3>
              <p className="text-muted">This will delete <strong>{selectedMembershipIds.size}</strong> membership(s) and related usage/settlement records.</p>
              <label className="settings-label">
                <span>Type <strong>DELETE</strong> to confirm</span>
                <input className="settings-input" value={bulkDeleteConfirmText} onChange={(e) => setBulkDeleteConfirmText(e.target.value)} placeholder="DELETE" autoFocus />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="filter-btn" onClick={() => setShowBulkDeleteDialog(false)}>Cancel</button>
                <button type="button" className="customers-export-btn" onClick={confirmBulkDelete} disabled={bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE'}>
                  Confirm delete
                </button>
              </div>
            </div>
          </div>
        )}
        {bulkDeleteMessage && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{bulkDeleteMessage}</p>}
        {importResult && (
          <div className="memberships-import-result" role="status">
            <p className="memberships-import-success">
              Imported <strong>{importResult.imported}</strong> membership{importResult.imported !== 1 ? 's' : ''}
              {importResult.createdCustomers > 0 && `, created ${importResult.createdCustomers} new customer(s).`}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="memberships-import-errors">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
                {importResult.errors.length > 10 && <li>… and {importResult.errors.length - 10} more errors.</li>}
              </ul>
            )}
          </div>
        )}
        {sessionsImportResult && (
          <div className="memberships-import-result" role="status">
            <p className="memberships-import-success">
              Sessions import: <strong>{sessionsImportResult.ok}</strong> recorded, {sessionsImportResult.fail} failed, {sessionsImportResult.skipped} skipped (membership or branch not in map).
            </p>
            {sessionsImportResult.skipped > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>
                {sessionsImportResult.missingMembershipIds && sessionsImportResult.missingMembershipIds.size > 0 && (
                  <p style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                    Missing membership IDs: {Array.from(sessionsImportResult.missingMembershipIds).slice(0, 20).join(', ')}
                    {sessionsImportResult.missingMembershipIds.size > 20 && ` … and ${sessionsImportResult.missingMembershipIds.size - 20} more`}
                    {' '}({sessionsImportResult.missingMembershipIds.size} total unique)
                  </p>
                )}
                {sessionsImportResult.missingBranchIds && sessionsImportResult.missingBranchIds.size > 0 && (
                  <p style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                    Missing branch IDs: {Array.from(sessionsImportResult.missingBranchIds).slice(0, 20).join(', ')}
                    {sessionsImportResult.missingBranchIds.size > 20 && ` … and ${sessionsImportResult.missingBranchIds.size - 20} more`}
                    {' '}({sessionsImportResult.missingBranchIds.size} total unique)
                  </p>
                )}
                <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
                  To fix: Import the missing memberships/branches from your legacy database exports. The IDs shown above are the old legacy IDs that need to be mapped.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {error && <div className="auth-error vendors-error">{error}</div>}
      <section className="content-card memberships-list-card">
        <h2 className="page-section-title">Membership list</h2>
        {loading ? (
          <div className="vendors-loading"><div className="spinner" /><span>Loading...</span></div>
        ) : memberships.length === 0 ? (
          <p className="vendors-empty">No memberships found.</p>
        ) : filteredMemberships.length === 0 ? (
          <p className="vendors-empty">No memberships match your search.</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="memberships-mobile-cards">
              {paginatedMemberships.map((m) => {
                const remaining = m.remainingCredits ?? m.totalCredits - m.usedCredits;
                return (
                  <div
                    key={m.id}
                    className="membership-mobile-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`${basePath}/memberships/${m.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`${basePath}/memberships/${m.id}`); } }}
                  >
                    {canBulkDelete && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                        <label className="settings-checkbox-label" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={selectedMembershipIds.has(String(m.id))}
                            onChange={() => toggleSelected(String(m.id))}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>Select</span>
                        </label>
                      </div>
                    )}
                    <div className="membership-mobile-card-main">
                      <div className="membership-mobile-card-row">
                        <span className="membership-mobile-label">Customer</span>
                        <span className="membership-mobile-value"><strong>{m.customer?.name || '—'}</strong> {m.customer?.phone && `(${m.customer.phone})`}</span>
                      </div>
                      <div className="membership-mobile-card-row">
                        <span className="membership-mobile-label">Total / Used / Remaining</span>
                        <span className="membership-mobile-value">{m.totalCredits} / {m.usedCredits} / {remaining}</span>
                      </div>
                      <div className="membership-mobile-card-row">
                        <span className="membership-mobile-label">Package</span>
                        <span className="membership-mobile-value">{m.packageName || m.typeName || '—'}</span>
                      </div>
                      <div className="membership-mobile-card-row">
                        <span className="membership-mobile-label">Sold at</span>
                        <span className="membership-mobile-value">{m.soldAtBranch || '—'}</span>
                      </div>
                      <div className="membership-mobile-card-row">
                        <span className="membership-mobile-label">Status</span>
                        <span className="membership-mobile-value">
                          <span className={`status-badge status-${m.status === 'active' ? 'approved' : m.status === 'used' ? 'rejected' : 'pending'}`}>{m.status}</span>
                        </span>
                      </div>
                    </div>
                    <div className="membership-mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="filter-btn"
                        onClick={() => navigate(`${basePath}/memberships/${m.id}`)}
                        title="View / Edit"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => openDeleteConfirm(m.id)}
                          disabled={deletingId !== null}
                          title="Delete membership"
                        >
                          {deletingId === m.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="data-table-wrap memberships-table-wrap">
              <table className="data-table memberships-table">
                <thead>
                  <tr>
                    {canBulkDelete && <th style={{ width: '1%' }} aria-label="Select column" />}
                    <th>Customer</th>
                    <th className="num">Total / Used / Remaining</th>
                    <th>Package name</th>
                    <th>Sold at</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMemberships.map((m) => (
                  <tr
                    key={m.id}
                    className="memberships-row-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`${basePath}/memberships/${m.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`${basePath}/memberships/${m.id}`); } }}
                  >
                    {canBulkDelete && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select membership ${m.id}`}
                          checked={selectedMembershipIds.has(String(m.id))}
                          onChange={() => toggleSelected(String(m.id))}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td><strong>{m.customer?.name || '—'}</strong> {m.customer?.phone && `(${m.customer.phone})`}</td>
                    <td className="num">{m.totalCredits} / {m.usedCredits} / {(m.remainingCredits ?? m.totalCredits - m.usedCredits)}</td>
                    <td>{m.packageName || m.typeName || '—'}</td>
                    <td>{m.soldAtBranch || '—'}</td>
                    <td><span className={`status-badge status-${m.status === 'active' ? 'approved' : m.status === 'used' ? 'rejected' : 'pending'}`}>{m.status}</span></td>
                    <td className="memberships-actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="filter-btn"
                        onClick={() => navigate(`${basePath}/memberships/${m.id}`)}
                        title="View / Edit"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => openDeleteConfirm(m.id)}
                          disabled={deletingId !== null}
                          title="Delete membership"
                        >
                          {deletingId === m.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="customers-pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="memberships-page-input" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Go to:</label>
                  <input
                    key={`page-input-${currentPage}`}
                    id="memberships-page-input"
                    type="number"
                    min="1"
                    max={totalPages}
                    defaultValue={currentPage}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalPages) {
                        setPage(val);
                      } else {
                        e.target.value = String(currentPage);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setPage(val);
                          (e.target as HTMLInputElement).blur();
                        } else {
                          (e.target as HTMLInputElement).value = String(currentPage);
                        }
                      }
                    }}
                    style={{
                      width: '60px',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid var(--theme-border)',
                      borderRadius: '4px',
                      background: 'var(--theme-bg)',
                      color: 'var(--theme-text)',
                    }}
                    aria-label="Page number"
                  />
                </div>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {deleteConfirmId && (
        <div
          className="vendor-modal-backdrop block-confirm-backdrop"
          onClick={closeDeleteConfirm}
          role="presentation"
        >
          <div
            className="vendor-modal block-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="membership-delete-confirm-title"
            aria-describedby="membership-delete-confirm-desc"
          >
            <div className="vendor-modal-header block-confirm-header">
              <h2 id="membership-delete-confirm-title">Confirm delete</h2>
              <button
                type="button"
                className="vendor-modal-close"
                onClick={closeDeleteConfirm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="block-confirm-body">
              <p id="membership-delete-confirm-desc" className="block-confirm-message">
                This will permanently delete this membership and its usage history. Type <strong>CONFIRM</strong> below to proceed.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); handleDeleteConfirmOk(); }}>
                <label className="block-confirm-label">
                  <span className="block-confirm-label-text">Type CONFIRM</span>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => { setDeleteConfirmInput(e.target.value); setDeleteConfirmError(''); }}
                    className={`block-confirm-input ${deleteConfirmInput.trim() === 'CONFIRM' ? 'block-confirm-input-valid' : ''} ${deleteConfirmError ? 'block-confirm-input-error' : ''}`}
                    placeholder="CONFIRM"
                    autoComplete="off"
                    autoFocus
                    aria-invalid={!!deleteConfirmError}
                    aria-describedby={deleteConfirmError ? 'membership-delete-confirm-err' : undefined}
                  />
                </label>
                {deleteConfirmError && (
                  <p id="membership-delete-confirm-err" className="block-confirm-error" role="alert">
                    {deleteConfirmError}
                  </p>
                )}
                <div className="block-confirm-actions">
                  <button type="button" className="block-confirm-cancel" onClick={closeDeleteConfirm}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="block-confirm-ok"
                    disabled={deleteConfirmInput.trim() !== 'CONFIRM' || deletingId !== null}
                  >
                    {deletingId === deleteConfirmId ? 'Deleting…' : 'Delete membership'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
