import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bulkDeleteCustomers, getCustomersPaged, createCustomer } from '../../../api/customers';
import { getBranches } from '../../../api/branches';
import { getSettings } from '../../../api/settings';
import { useAuth } from '../../../auth/hooks/useAuth';
import type { Customer, Branch } from '../../../types/common';

export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [primaryBranchId, setPrimaryBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilterId, setBranchFilterId] = useState('');
  const [page, setPage] = useState(1);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersTotalPages, setCustomersTotalPages] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number; skipped: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showImportButton, setShowImportButton] = useState(true);
  const [showCustomerDeleteToAdmin, setShowCustomerDeleteToAdmin] = useState(true);
  const [showCustomerDeleteToVendor, setShowCustomerDeleteToVendor] = useState(false);
  const [showCustomerDeleteToStaff, setShowCustomerDeleteToStaff] = useState(false);
  const [showCustomersExportToAdmin, setShowCustomersExportToAdmin] = useState(true);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const isAdmin = user?.role === 'admin';
  const PAGE_SIZE = 100;
  const basePath = isAdmin ? '/admin' : '/vendor';

  const currentPage = useMemo(() => Math.min(Math.max(1, page), customersTotalPages), [page, customersTotalPages]);
  const totalPages = customersTotalPages;
  const totalFiltered = customersTotal;
  const filteredCustomers = customers;
  const paginatedCustomers = customers;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, branchFilterId]);

  const fetchCustomers = useCallback(
    (opts?: { page?: number; search?: string; branchId?: string }) => {
      const p = opts?.page ?? page;
      const s = opts?.search ?? searchQuery;
      const b = opts?.branchId ?? branchFilterId;
      if (!hasLoadedOnce) setLoading(true);
      else setRefreshing(true);
      setError('');
      getCustomersPaged({
        page: p,
        limit: PAGE_SIZE,
        search: s.trim() || undefined,
        branchId: isAdmin && b ? b : undefined,
      }).then((r) => {
        setLoading(false);
        setRefreshing(false);
        setHasLoadedOnce(true);
        if (r.success && r.customers) {
          setCustomers(r.customers);
          setCustomersTotal(r.total ?? r.customers.length);
          setCustomersTotalPages(r.pages ?? 1);
        } else setError(r.message || 'Failed to load');
      });
    },
    [PAGE_SIZE, branchFilterId, isAdmin, page, searchQuery, hasLoadedOnce]
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchCustomers();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, [page, searchQuery, branchFilterId, fetchCustomers]);

  useEffect(() => {
    getBranches({ all: true }).then((r) => r.success && r.branches && setBranches(r.branches || []));
  }, []);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.success && r.settings && typeof r.settings.showImportButton === 'boolean') {
        setShowImportButton(r.settings.showImportButton);
      }
      if (r.success && r.settings) {
        const s = r.settings as {
          showCustomerDeleteToAdmin?: boolean;
          showCustomerDeleteToVendor?: boolean;
          showCustomerDeleteToStaff?: boolean;
          showCustomersExportToAdmin?: boolean;
        };
        setShowCustomerDeleteToAdmin(s.showCustomerDeleteToAdmin !== false);
        setShowCustomerDeleteToVendor(s.showCustomerDeleteToVendor === true);
        setShowCustomerDeleteToStaff(s.showCustomerDeleteToStaff === true);
        setShowCustomersExportToAdmin(s.showCustomersExportToAdmin !== false);
      }
    });
  }, []);

  const role = user?.role;
  const roleStr = role as string | undefined;
  const canBulkDelete =
    (isAdmin && showCustomerDeleteToAdmin) ||
    (!isAdmin && role === 'vendor' && showCustomerDeleteToVendor) ||
    (!isAdmin && roleStr === 'staff' && showCustomerDeleteToStaff);
  const canExportCustomers = isAdmin && showCustomersExportToAdmin;

  const toggleSelected = useCallback((id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedCustomerIds(new Set()), []);

  const selectAllFiltered = useCallback(() => {
    setSelectedCustomerIds(new Set(filteredCustomers.map((c) => String(c.id))));
  }, [filteredCustomers]);

  // We intentionally do NOT render a header checkbox. Bulk selection is controlled via the "Select all" button.

  const openBulkDeleteDialog = useCallback(() => {
    if (!canBulkDelete) return;
    if (selectedCustomerIds.size === 0) return;
    setBulkDeleteConfirmText('');
    setShowBulkDeleteDialog(true);
  }, [canBulkDelete, selectedCustomerIds.size]);

  const confirmBulkDelete = useCallback(async () => {
    if (!canBulkDelete) return;
    const ids = Array.from(selectedCustomerIds);
    if (ids.length === 0) return;
    if (bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setShowBulkDeleteDialog(false);
    setBulkDeleting(true);
    setBulkDeleteMessage('');
    setError('');
    const BATCH_SIZE = 5000;
    let totalDeletedCustomers = 0;
    let totalSkippedMemberships = 0;
    let totalDeletedAppointments = 0;
    let totalDeletedLoyaltyAccounts = 0;
    let totalDeletedLoyaltyTxns = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setBulkDeleteMessage(`Deleting ${Math.min(i + batch.length, ids.length)} of ${ids.length}…`);
      // eslint-disable-next-line no-await-in-loop
      const r = await bulkDeleteCustomers(batch);
      if (!r.success) {
        setBulkDeleting(false);
        setError(r.message || 'Failed to delete selected customers.');
        return;
      }
      totalDeletedCustomers += r.deleted?.customers ?? 0;
      totalDeletedAppointments += r.deleted?.appointments ?? 0;
      totalDeletedLoyaltyAccounts += r.deleted?.loyaltyAccounts ?? 0;
      totalDeletedLoyaltyTxns += r.deleted?.loyaltyTransactions ?? 0;
      totalSkippedMemberships += r.skippedWithMemberships?.length ?? 0;
    }

    setBulkDeleting(false);
    setBulkDeleteMessage(
      `Deleted ${totalDeletedCustomers} customer(s) (appointments: ${totalDeletedAppointments}, loyalty: ${totalDeletedLoyaltyTxns}). Skipped ${totalSkippedMemberships} with memberships.`
    );
    clearSelection();
    fetchCustomers();
  }, [canBulkDelete, selectedCustomerIds, bulkDeleteConfirmText, clearSelection, fetchCustomers]);

  useEffect(() => {
    // If user can't delete (vendor/staff), ensure we don't keep stale selection state.
    if (!canBulkDelete && selectedCustomerIds.size > 0) clearSelection();
  }, [canBulkDelete, selectedCustomerIds.size, clearSelection]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await createCustomer({
      name,
      phone,
      email: email || undefined,
      primaryBranchId: primaryBranchId || (user?.branchId || undefined),
      notes: notes || undefined,
    });
    if (res.success) {
      setName('');
      setPhone('');
      setEmail('');
      setPrimaryBranchId('');
      setNotes('');
      setShowForm(false);
      setPage(1);
      fetchCustomers({ page: 1 });
    } else setError((res as { message?: string }).message || 'Failed to create');
  }

  function handleOpenAddCustomerFromSearch() {
    const q = searchQuery.trim();
    if (!q) {
      setShowForm(true);
      return;
    }
    const onlyDigits = q.replace(/\D/g, '');
    const hasLetters = /[a-zA-Z]/.test(q);
    if (!hasLetters && onlyDigits.length >= 7) {
      setPhone(onlyDigits);
      setName('');
    } else {
      setName(q);
      setPhone('');
    }
    setShowForm(true);
    setTimeout(() => {
      const formEl = document.querySelector('.auth-form');
      if (formEl instanceof HTMLElement) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function escapeCsvCell(value: string): string {
    const s = String(value ?? '').replace(/"/g, '""');
    return /[,"\n\r]/.test(s) ? `"${s}"` : s;
  }

  type ImportRow = Record<string, unknown>;

  function extractCustomerRows(parsed: unknown): ImportRow[] {
    if (Array.isArray(parsed)) {
      const tableObj = parsed.find((item) => item && typeof item === 'object' && (item as { type?: string; name?: string }).type === 'table' && Array.isArray((item as { data?: unknown[] }).data));
      if (tableObj) return (tableObj as { data: ImportRow[] }).data;
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.customers)) return o.customers as ImportRow[];
      if (Array.isArray(o.data)) return o.data as ImportRow[];
    }
    return [];
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setImportResult(null);
    setImporting(true);
    let ok = 0, fail = 0, skipped = 0;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = extractCustomerRows(parsed);
      if (rows.length === 0) { setError('No customer data found. Expected array, { customers: [...] }, { data: [...] }, or PHPMyAdmin table export.'); setImporting(false); return; }

      const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
      const legacyMap: Record<string, string> = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}');
      for (const row of rows) {
        const name = str(row.customer_name ?? row.name ?? row.customerName);
        const phone = str(row.contact ?? row.phone ?? row.Phone ?? row.Contact);
        if (!name || !phone) { skipped++; continue; }
        const res = await createCustomer({
          name,
          phone,
          email: str(row.email) || undefined,
          notes: str(row.address ?? row.notes) || undefined,
          primaryBranchId: user?.branchId || undefined,
        });
        if (res.success) {
          ok++;
          const oldId = str(row.id);
          if (oldId && (res as unknown as { customer?: { id?: string } }).customer?.id) {
            legacyMap[oldId] = (res as unknown as { customer: { id: string } }).customer.id;
          }
        } else fail++;
      }
      if (Object.keys(legacyMap).length > 0) localStorage.setItem('customerLegacyIdMap', JSON.stringify(legacyMap));
      setImportResult({ ok, fail, skipped });
      if (ok > 0) fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON file');
    }
    setImporting(false);
  }

  function exportToCsv() {
    const headers = ['Card ID', 'Name', 'Phone', 'Email', 'Branch'];
    const rows = filteredCustomers.map((c) =>
      [c.membershipCardId ?? '—', c.name ?? '—', c.phone ?? '—', c.email ?? '—', c.primaryBranch ?? '—'].map(escapeCsvCell)
    );
    const csv = [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !hasLoadedOnce) {
    return (
      <div className="dashboard-content">
        <div className="vendors-loading"><div className="spinner" /><span>Loading customers...</span></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content customers-page">
      <header className="page-hero">
        <h1 className="page-hero-title">Customers</h1>
        <p className="page-hero-subtitle">
          Customer list. Add customers here; assign package and membership from the Memberships page.
          {refreshing ? ' (Loading…)' : ''}
        </p>
      </header>
      <section className="content-card">
        <div className="customers-top-actions">
          <button type="button" className="auth-submit" style={{ width: 'auto' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add customer'}
          </button>
          {canBulkDelete && (
            <>
              <button type="button" className="filter-btn" onClick={selectAllFiltered} disabled={filteredCustomers.length === 0}>
                Select all
              </button>
              <button type="button" className="filter-btn" onClick={clearSelection} disabled={selectedCustomerIds.size === 0}>
                Clear
              </button>
              {selectedCustomerIds.size > 0 && (
                <button type="button" className="customers-export-btn" onClick={openBulkDeleteDialog} disabled={bulkDeleting}>
                  {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedCustomerIds.size})`}
                </button>
              )}
            </>
          )}
          {showImportButton && (
            <label className="customers-import-btn">
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="customers-import-input"
                aria-label="Import customers from JSON"
                onChange={handleImportFile}
                disabled={importing}
              />
              {importing ? 'Importing…' : 'Import from JSON'}
            </label>
          )}
        </div>
        {showBulkDeleteDialog && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete selected customers"
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
            <div
              className="content-card"
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520 }}
            >
              <h3 style={{ marginTop: 0 }}>Delete selected customers?</h3>
              <p className="text-muted">
                You are about to delete <strong>{selectedCustomerIds.size}</strong> customer(s). Customers with memberships will be skipped.
              </p>
              <label className="settings-label">
                <span>Type <strong>DELETE</strong> to confirm</span>
                <input
                  className="settings-input"
                  value={bulkDeleteConfirmText}
                  onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="filter-btn" onClick={() => setShowBulkDeleteDialog(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="customers-export-btn"
                  onClick={confirmBulkDelete}
                  disabled={bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                >
                  Confirm delete
                </button>
              </div>
            </div>
          </div>
        )}
        {bulkDeleteMessage && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{bulkDeleteMessage}</p>}
        {importResult && (
          <p className="customers-import-result">
            Import complete: {importResult.ok} created, {importResult.fail} failed, {importResult.skipped} skipped (missing name/phone).
          </p>
        )}
        {showForm && (
          <form onSubmit={handleCreate} className="auth-form" style={{ marginBottom: '1rem', maxWidth: '400px' }}>
            <label><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label><span>Phone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
            <label><span>Email (optional)</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label><span>Notes (optional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
            <p className="form-hint">Card ID is auto-generated from the branch (e.g. tes-00001) after you create the customer.</p>
            {isAdmin && (
              <label>
                <span>Primary branch</span>
                <select value={primaryBranchId} onChange={(e) => setPrimaryBranchId(e.target.value)}>
                  <option value="">—</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            <button type="submit" className="auth-submit">Create customer</button>
          </form>
        )}
        {error && <div className="auth-error vendors-error">{error}</div>}
        <div className="customers-filters">
          {isAdmin && (
            <label>
              <span>Branch</span>
              <select
                value={branchFilterId}
                onChange={(e) => setBranchFilterId(e.target.value)}
                aria-label="Filter customers by branch"
              >
                <option value="">All customers</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="customers-search-group">
            <label className="customers-search-label">
              <span>Search by Card ID, name, phone or email</span>
              <input
                type="search"
                className="customers-search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search customers by card ID, name, phone or email"
              />
            </label>
            <button type="button" className="customers-search-btn" onClick={() => document.querySelector<HTMLInputElement>('.customers-search-input')?.focus()}>
              Search
            </button>
          </div>
          {canExportCustomers && (
            <button
              type="button"
              className="customers-export-btn"
              onClick={exportToCsv}
              disabled={totalFiltered === 0}
              title={totalFiltered === 0 ? 'No data to export' : 'Export filtered customers to CSV/Excel'}
            >
              Export to CSV / Excel
            </button>
          )}
          {showImportButton && (
            <label className="customers-import-btn customers-import-btn-inline">
              <input
                type="file"
                accept=".json,application/json"
                className="customers-import-input"
                aria-label="Import customers from JSON"
                onChange={handleImportFile}
                disabled={importing}
              />
              {importing ? 'Importing…' : 'Import from JSON'}
            </label>
          )}
        </div>
        {customers.length > 0 ? (
          <>
            {totalFiltered > 0 && (
              <p className="customers-showing-count text-muted">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalFiltered)} of {totalFiltered} customer{totalFiltered !== 1 ? 's' : ''}
              </p>
            )}
            {/* Mobile: card list */}
            <div className="customers-mobile-cards">
              {paginatedCustomers.map((c) => (
                <div
                  key={c.id}
                  className="customer-mobile-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`${basePath}/customers/${c.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`${basePath}/customers/${c.id}`); } }}
                >
                  {canBulkDelete && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <label className="settings-checkbox-label" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.has(String(c.id))}
                          onChange={() => toggleSelected(String(c.id))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Select</span>
                      </label>
                    </div>
                  )}
                  <div className="customer-mobile-card-main">
                    <div className="customer-mobile-card-row">
                      <span className="customer-mobile-label">Card ID</span>
                      <span className="customer-mobile-value">{c.membershipCardId || '—'}</span>
                    </div>
                    <div className="customer-mobile-card-row">
                      <span className="customer-mobile-label">Name</span>
                      <span className="customer-mobile-value"><strong>{c.name}</strong></span>
                    </div>
                    <div className="customer-mobile-card-row">
                      <span className="customer-mobile-label">Phone</span>
                      <span className="customer-mobile-value">{c.phone}</span>
                    </div>
                    <div className="customer-mobile-card-row">
                      <span className="customer-mobile-label">Email</span>
                      <span className="customer-mobile-value">{c.email || '—'}</span>
                    </div>
                    <div className="customer-mobile-card-row">
                      <span className="customer-mobile-label">Branch</span>
                      <span className="customer-mobile-value">{c.primaryBranch || '—'}</span>
                    </div>
                  </div>
                  <div className="customer-mobile-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => navigate(`${basePath}/customers/${c.id}`)}
                      title="View customer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${basePath}/memberships?customerId=${c.id}`);
                      }}
                      title="Create membership"
                    >
                      Create membership
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="data-table-wrap customers-table-wrap">
              <table className="data-table customers-table">
                <thead>
                  <tr>
                    {canBulkDelete && (
                      <th style={{ width: '1%' }} aria-label="Select column" />
                    )}
                    <th>Card ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Branch</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c) => (
                      <tr
                        key={c.id}
                        className="customers-row-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`${basePath}/customers/${c.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`${basePath}/customers/${c.id}`); } }}
                      >
                        {canBulkDelete && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${c.name}`}
                              checked={selectedCustomerIds.has(String(c.id))}
                              onChange={() => toggleSelected(String(c.id))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td>{c.membershipCardId || '—'}</td>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.phone}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.primaryBranch || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="filter-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${basePath}/memberships?customerId=${c.id}`);
                            }}
                          >
                            Create membership
                          </button>
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
                  <label htmlFor="customers-page-input" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Go to:</label>
                  <input
                    key={`page-input-${currentPage}`}
                    id="customers-page-input"
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
        ) : !showForm && (
          <>
            <p className="vendors-empty">
              {searchQuery.trim()
                ? `No customers match "${searchQuery.trim()}".`
                : branchFilterId
                  ? 'No customers in this branch.'
                  : 'No customers. Add a customer, then assign package and membership from the Memberships page.'}
            </p>
            {searchQuery.trim() && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
                <button type="button" className="auth-submit" style={{ width: 'auto' }} onClick={handleOpenAddCustomerFromSearch}>
                  Add customer "{searchQuery.trim()}"
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
