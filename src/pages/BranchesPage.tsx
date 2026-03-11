import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getBranches, createBranch, updateBranch, deleteBranch, bulkDeleteBranches } from '../api/branches';
import { getSettings } from '../api/settings';
import { useAuth } from '../auth/hooks/useAuth';
import type { Branch } from '../types/crm';

export default function BranchesPage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [viewingBranch, setViewingBranch] = useState<Branch | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editZipCode, setEditZipCode] = useState('');
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number; skipped: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showImportButton, setShowImportButton] = useState(true);
  const [showBulkDeleteBranchesToAdmin, setShowBulkDeleteBranchesToAdmin] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const isAdmin = user?.role === 'admin';
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(branches.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginatedBranches = branches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadBranches = () => {
    getBranches().then((r) => {
      setLoading(false);
      if (r.success && r.branches) setBranches(r.branches);
      else setError(r.message || 'Failed to load branches');
    });
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.success && r.settings && typeof r.settings.showImportButton === 'boolean') {
        setShowImportButton(r.settings.showImportButton);
      }
      if (r.success && r.settings && typeof (r.settings as { showBulkDeleteBranchesToAdmin?: boolean }).showBulkDeleteBranchesToAdmin === 'boolean') {
        setShowBulkDeleteBranchesToAdmin((r.settings as { showBulkDeleteBranchesToAdmin: boolean }).showBulkDeleteBranchesToAdmin);
      }
    });
  }, []);

  const canBulkDelete = isAdmin && showBulkDeleteBranchesToAdmin;

  const toggleSelected = useCallback((id: string) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedBranchIds(new Set()), []);

  const selectAll = useCallback(() => {
    setSelectedBranchIds(new Set(branches.map((b) => String(b.id))));
  }, [branches]);

  useEffect(() => {
    if (!canBulkDelete && selectedBranchIds.size > 0) clearSelection();
  }, [canBulkDelete, selectedBranchIds.size, clearSelection]);

  const openBulkDeleteDialog = useCallback(() => {
    if (!canBulkDelete) return;
    if (selectedBranchIds.size === 0) return;
    setBulkDeleteConfirmText('');
    setShowBulkDeleteDialog(true);
  }, [canBulkDelete, selectedBranchIds.size]);

  const confirmBulkDelete = useCallback(async () => {
    if (!canBulkDelete) return;
    const ids = Array.from(selectedBranchIds);
    if (ids.length === 0) return;
    if (bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setShowBulkDeleteDialog(false);
    setBulkDeleting(true);
    setBulkDeleteMessage('');
    setError('');
    const BATCH_SIZE = 5000;
    let total = 0;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setBulkDeleteMessage(`Deactivating ${Math.min(i + batch.length, ids.length)} of ${ids.length}…`);
      // eslint-disable-next-line no-await-in-loop
      const r = await bulkDeleteBranches(batch);
      if (!r.success) {
        setBulkDeleting(false);
        setError(r.message || 'Failed to delete selected branches.');
        return;
      }
      total += r.deactivated ?? 0;
    }
    setBulkDeleting(false);
    setBulkDeleteMessage(`Deactivated ${total} branch(es).`);
    clearSelection();
    loadBranches();
  }, [canBulkDelete, selectedBranchIds, bulkDeleteConfirmText, clearSelection]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await createBranch({
      name,
      address: address || undefined,
      zipCode: zipCode || undefined,
    });
    if (res.success) {
      setName('');
      setAddress('');
      setZipCode('');
      setShowForm(false);
      loadBranches();
    } else setError((res as { message?: string }).message || 'Failed to create');
  }

  function openEdit(b: Branch) {
    setEditingBranch(b);
    setEditName(b.name);
    setEditAddress(b.address || '');
    setEditZipCode(b.zipCode || '');
    setError('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBranch) return;
    setError('');
    const res = await updateBranch(editingBranch.id, {
      name: editName,
      address: editAddress || undefined,
      zipCode: editZipCode || undefined,
    });
    if (res.success) {
      setEditingBranch(null);
      loadBranches();
    } else setError((res as { message?: string }).message || 'Failed to update');
  }

  async function handleDelete(id: string) {
    setError('');
    const res = await deleteBranch(id);
    if (res.success) {
      setDeletingBranchId(null);
      loadBranches();
    } else setError(res.message || 'Failed to delete');
  }

  function extractBranchRows(parsed: unknown): Record<string, unknown>[] {
    if (Array.isArray(parsed)) {
      const tableObj = parsed.find((item) => item && typeof item === 'object' && (item as { type?: string }).type === 'table' && Array.isArray((item as { data?: unknown[] }).data));
      if (tableObj) return (tableObj as { data: Record<string, unknown>[] }).data;
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
      if (Array.isArray(o.branches)) return o.branches as Record<string, unknown>[];
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
    const legacyMap: Record<string, string> = JSON.parse(localStorage.getItem('branchLegacyIdMap') || '{}');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = extractBranchRows(parsed);
      if (rows.length === 0) {
        setError('No branch data found. Expected PHPMyAdmin table export or { data: [...] }.');
        setImporting(false);
        return;
      }
      const str = (v: unknown) => (v != null && v !== '' ? String(v).trim() : '');
      for (const row of rows) {
        const name = str(row.branch ?? row.name ?? row.branch_name);
        if (!name) { skipped++; continue; }
        const address = str(row.street_address ?? row.address ?? row.streetAddress);
        const zipMatch = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
        const zipCode = zipMatch ? zipMatch[1] : str(row.zip_code ?? row.zipCode ?? row.zip);
        const res = await createBranch({ name, address: address || undefined, zipCode: zipCode || undefined });
        if (res.success) {
          ok++;
          const oldId = str(row.id);
          if (oldId && (res as unknown as { branch?: { id?: string } }).branch?.id) {
            legacyMap[oldId] = (res as unknown as { branch: { id: string } }).branch.id;
          }
        } else fail++;
      }
      if (Object.keys(legacyMap).length > 0) localStorage.setItem('branchLegacyIdMap', JSON.stringify(legacyMap));
      setImportResult({ ok, fail, skipped });
      if (ok > 0) loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON file');
    }
    setImporting(false);
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="vendors-loading"><div className="spinner" /><span>Loading branches...</span></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <header className="page-hero">
        <h1 className="page-hero-title">{isAdmin ? 'Branches' : 'My branch'}</h1>
        <p className="page-hero-subtitle">{isAdmin ? 'Manage all branches. View, edit, or delete a branch.' : 'Your assigned branch.'}</p>
      </header>
      <section className="content-card">
        {isAdmin && (
          <div className="branches-top-actions">
            <button type="button" className="auth-submit" style={{ marginBottom: '1rem', width: 'auto' }} onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add branch'}
            </button>
            {canBulkDelete && (
              <>
                <button type="button" className="filter-btn" onClick={selectAll} disabled={branches.length === 0}>
                  Select all
                </button>
                <button type="button" className="filter-btn" onClick={clearSelection} disabled={selectedBranchIds.size === 0}>
                  Clear
                </button>
                {selectedBranchIds.size > 0 && (
                  <button type="button" className="customers-export-btn" onClick={openBulkDeleteDialog} disabled={bulkDeleting}>
                    {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedBranchIds.size})`}
                  </button>
                )}
              </>
            )}
            {showImportButton && (
              <label className="branches-import-btn">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="branches-import-input"
                  aria-label="Import branches from JSON"
                  onChange={handleImportFile}
                  disabled={importing}
                />
                {importing ? 'Importing…' : 'Import from JSON'}
              </label>
            )}
          </div>
        )}
        {showBulkDeleteDialog && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete selected branches"
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
              <h3 style={{ marginTop: 0 }}>Delete selected branches?</h3>
              <p className="text-muted">This will deactivate <strong>{selectedBranchIds.size}</strong> branch(es).</p>
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
          <p className="branches-import-result">
            Import complete: {importResult.ok} created, {importResult.fail} failed, {importResult.skipped} skipped (missing name).
          </p>
        )}
        {showForm && (
          <form onSubmit={handleCreate} className="auth-form" style={{ marginBottom: '1rem', maxWidth: '420px' }}>
            <label><span>Branch name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tacoma" required /></label>
            <label><span>Branch address</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" /></label>
            <label><span>Zip code</span><input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="e.g. 98401" /></label>
            <button type="submit" className="auth-submit">Create branch</button>
          </form>
        )}
        {error && <div className="auth-error vendors-error">{error}</div>}
        {branches.length > 0 ? (
          <>
            <section className="branches-section">
              <h2 className="branches-section-title">Branch list</h2>
              <p className="customers-showing-count text-muted">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, branches.length)} of {branches.length} branch{branches.length !== 1 ? 'es' : ''}
              </p>
              {/* Mobile: card list (managed format) */}
              <div className="branches-mobile-cards">
              {paginatedBranches.map((b) => (
                <div key={b.id} className="branch-mobile-card">
                  {canBulkDelete && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                      <label className="settings-checkbox-label" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={selectedBranchIds.has(String(b.id))}
                          onChange={() => toggleSelected(String(b.id))}
                        />
                        <span>Select</span>
                      </label>
                    </div>
                  )}
                  <div className="branch-mobile-card-main">
                    <div className="branch-mobile-card-row">
                      <span className="branch-mobile-label">Name</span>
                      <span className="branch-mobile-value"><strong>{b.name}</strong></span>
                    </div>
                    <div className="branch-mobile-card-row">
                      <span className="branch-mobile-label">Address</span>
                      <span className="branch-mobile-value">{b.address || '—'}</span>
                    </div>
                    <div className="branch-mobile-card-row">
                      <span className="branch-mobile-label">Zip code</span>
                      <span className="branch-mobile-value">{b.zipCode || '—'}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="branch-mobile-card-actions">
                      <button type="button" className="branch-action-btn branch-action-view" onClick={() => setViewingBranch(b)} title="View">View</button>
                      <button type="button" className="branch-action-btn branch-action-edit" onClick={() => openEdit(b)} title="Edit">Edit</button>
                      <button type="button" className="branch-action-btn branch-action-delete" onClick={() => setDeletingBranchId(b.id)} title="Delete">Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="data-table-wrap branches-table-wrap">
              <table className="data-table branches-table">
                <thead>
                  <tr>
                    {canBulkDelete && <th style={{ width: '1%' }} aria-label="Select column" />}
                    <th>Name</th>
                    <th>Address</th>
                    <th>Zip code</th>
                    {isAdmin && <th className="th-actions">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedBranches.map((b) => (
                  <tr key={b.id}>
                    {canBulkDelete && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${b.name}`}
                          checked={selectedBranchIds.has(String(b.id))}
                          onChange={() => toggleSelected(String(b.id))}
                        />
                      </td>
                    )}
                    <td><strong>{b.name}</strong></td>
                    <td>{b.address || '—'}</td>
                    <td>{b.zipCode || '—'}</td>
                    {isAdmin && (
                      <td className="branch-actions">
                        <button type="button" className="branch-action-btn branch-action-view" onClick={() => setViewingBranch(b)} title="View">View</button>
                        <button type="button" className="branch-action-btn branch-action-edit" onClick={() => openEdit(b)} title="Edit">Edit</button>
                        <button type="button" className="branch-action-btn branch-action-delete" onClick={() => setDeletingBranchId(b.id)} title="Delete">Delete</button>
                      </td>
                    )}
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
              {totalPages > 1 && (
                <div className="customers-pagination">
                  <button type="button" className="pagination-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label="Previous page">Previous</button>
                  <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                  <button type="button" className="pagination-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label="Next page">Next</button>
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="vendors-empty">
            {isAdmin ? 'No branches.' : 'You don’t have a branch assigned yet. Contact your admin to get assigned to a branch.'}
          </p>
        )}
      </section>

      {viewingBranch && (
        <div className="branch-modal-overlay" onClick={() => setViewingBranch(null)} role="dialog" aria-modal="true" aria-label="View branch">
          <div className="branch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="branch-modal-header">
              <h3>Branch details</h3>
              <button type="button" className="branch-modal-close" onClick={() => setViewingBranch(null)} aria-label="Close">×</button>
            </div>
            <dl className="branch-view-dl">
              <dt>Name</dt>
              <dd>{viewingBranch.name}</dd>
              <dt>Address</dt>
              <dd>{viewingBranch.address || '—'}</dd>
              <dt>Zip code</dt>
              <dd>{viewingBranch.zipCode || '—'}</dd>
            </dl>
            <div className="branch-modal-footer">
              <button type="button" className="auth-submit" style={{ width: 'auto' }} onClick={() => setViewingBranch(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editingBranch && (
        <div className="branch-modal-overlay" onClick={() => setEditingBranch(null)} role="dialog" aria-modal="true" aria-label="Edit branch">
          <div className="branch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="branch-modal-header">
              <h3>Edit branch</h3>
              <button type="button" className="branch-modal-close" onClick={() => setEditingBranch(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleUpdate} className="auth-form">
              <label><span>Branch name</span><input value={editName} onChange={(e) => setEditName(e.target.value)} required /></label>
              <label><span>Address</span><input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></label>
              <label><span>Zip code</span><input value={editZipCode} onChange={(e) => setEditZipCode(e.target.value)} /></label>
              <div className="branch-modal-footer">
                <button type="button" className="branch-action-btn branch-action-cancel" onClick={() => setEditingBranch(null)}>Cancel</button>
                <button type="submit" className="auth-submit" style={{ width: 'auto' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingBranchId && (
        <div className="branch-modal-overlay" onClick={() => setDeletingBranchId(null)} role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="branch-modal branch-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="branch-modal-header">
              <h3>Delete branch?</h3>
              <button type="button" className="branch-modal-close" onClick={() => setDeletingBranchId(null)} aria-label="Close">×</button>
            </div>
            <p className="branch-delete-message">This will deactivate the branch. You can no longer assign vendors or new data to it.</p>
            <div className="branch-modal-footer">
              <button type="button" className="branch-action-btn branch-action-cancel" onClick={() => setDeletingBranchId(null)}>Cancel</button>
              <button type="button" className="branch-action-btn branch-action-delete-confirm" onClick={() => handleDelete(deletingBranchId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
