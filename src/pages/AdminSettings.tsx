import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSettings, updateSettings } from '../api/settings';
import { updatePassword } from '../api/auth.api';
import { purgeAllCustomers } from '../api/customers';
import { apiRequest } from '../api/client';

export default function AdminSettings() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [revenuePercentage, setRevenuePercentage] = useState('');
  const [revenueSaving, setRevenueSaving] = useState(false);
  const [guidelinesVendorSaving, setGuidelinesVendorSaving] = useState(false);
  const [showGuidelinesInVendorDashboard, setShowGuidelinesInVendorDashboard] = useState<boolean>(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [showNotificationBellToVendors, setShowNotificationBellToVendors] = useState<boolean>(true);
  const [showNotificationAppointments, setShowNotificationAppointments] = useState<boolean>(true);
  const [showNotificationSettlements, setShowNotificationSettlements] = useState<boolean>(true);
  const [showNotificationTickets, setShowNotificationTickets] = useState<boolean>(true);
  const [showNotificationComments, setShowNotificationComments] = useState<boolean>(true);
  const [showNotificationSalesData, setShowNotificationSalesData] = useState<boolean>(true);
  const [showNotificationBellToAdmins, setShowNotificationBellToAdmins] = useState<boolean>(true);
  const [showAdminNotificationAppointments, setShowAdminNotificationAppointments] = useState<boolean>(true);
  const [showAdminNotificationSettlements, setShowAdminNotificationSettlements] = useState<boolean>(true);
  const [showAdminNotificationTickets, setShowAdminNotificationTickets] = useState<boolean>(true);
  const [showAdminNotificationComments, setShowAdminNotificationComments] = useState<boolean>(true);
  const [showAdminNotificationSalesData, setShowAdminNotificationSalesData] = useState<boolean>(true);
  const [importButtonSaving, setImportButtonSaving] = useState(false);
  const [showImportButton, setShowImportButton] = useState<boolean>(true);
  const [deleteAllCustomersSaving, setDeleteAllCustomersSaving] = useState(false);
  const [showDeleteAllCustomersButtonToAdmin, setShowDeleteAllCustomersButtonToAdmin] = useState<boolean>(false);
  const [purgeCustomersSaving, setPurgeCustomersSaving] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [resetAllDataSaving, setResetAllDataSaving] = useState(false);
  const [showResetAllDataButtonToAdmin, setShowResetAllDataButtonToAdmin] = useState<boolean>(false);
  const [bulkDeleteTogglesSaving, setBulkDeleteTogglesSaving] = useState(false);
  const [showBulkDeleteBranchesToAdmin, setShowBulkDeleteBranchesToAdmin] = useState<boolean>(false);
  const [showBulkDeletePackagesToAdmin, setShowBulkDeletePackagesToAdmin] = useState<boolean>(false);
  const [showBulkDeleteMembershipsToAdmin, setShowBulkDeleteMembershipsToAdmin] = useState<boolean>(false);
  const [showBulkSettleSettlementsToAdmin, setShowBulkSettleSettlementsToAdmin] = useState<boolean>(false);
  const [showPackageActionsToVendor, setShowPackageActionsToVendor] = useState<boolean>(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [legacyCustomersFileName, setLegacyCustomersFileName] = useState<string>('');
  const [legacyCustomersImporting, setLegacyCustomersImporting] = useState(false);
  const [legacyCustomersRows, setLegacyCustomersRows] = useState<number>(0);
  const [legacyCustomersParsed, setLegacyCustomersParsed] = useState<unknown>(null);
  const [legacyDataImporting, setLegacyDataImporting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogBody, setDialogBody] = useState('');
  const [dialogConfirmText, setDialogConfirmText] = useState('Confirm');
  const [dialogAction, setDialogAction] = useState<
    | null
    | 'importCustomers'
    | 'importAll'
    | 'backfillCustomerBranches'
    | 'backfillBranchAddresses'
  >(null);

  useEffect(() => {
    getSettings().then((r) => {
      setSettingsLoading(false);
      if (r.success && r.settings != null) {
        setRevenuePercentage(String(r.settings.revenuePercentage ?? 10));
        setShowGuidelinesInVendorDashboard(r.settings.showGuidelinesInVendorDashboard !== false);
        setShowNotificationBellToVendors(r.settings.showNotificationBellToVendors !== false);
        setShowNotificationAppointments(r.settings.showNotificationAppointments !== false);
        setShowNotificationSettlements(r.settings.showNotificationSettlements !== false);
        setShowNotificationTickets(r.settings.showNotificationTickets !== false);
        setShowNotificationComments(r.settings.showNotificationComments !== false);
        setShowNotificationSalesData(r.settings.showNotificationSalesData !== false);
        setShowNotificationBellToAdmins(r.settings.showNotificationBellToAdmins !== false);
        setShowAdminNotificationAppointments(r.settings.showAdminNotificationAppointments !== false);
        setShowAdminNotificationSettlements(r.settings.showAdminNotificationSettlements !== false);
        setShowAdminNotificationTickets(r.settings.showAdminNotificationTickets !== false);
        setShowAdminNotificationComments(r.settings.showAdminNotificationComments !== false);
        setShowAdminNotificationSalesData(r.settings.showAdminNotificationSalesData !== false);
        setShowImportButton(r.settings.showImportButton !== false);
        setShowDeleteAllCustomersButtonToAdmin(r.settings.showDeleteAllCustomersButtonToAdmin === true);
        setShowResetAllDataButtonToAdmin(r.settings.showResetAllDataButtonToAdmin === true);
        setShowBulkDeleteBranchesToAdmin(r.settings.showBulkDeleteBranchesToAdmin === true);
        setShowBulkDeletePackagesToAdmin(r.settings.showBulkDeletePackagesToAdmin === true);
        setShowBulkDeleteMembershipsToAdmin(r.settings.showBulkDeleteMembershipsToAdmin === true);
        setShowBulkSettleSettlementsToAdmin(r.settings.showBulkSettleSettlementsToAdmin === true);
        setShowPackageActionsToVendor(r.settings.showPackageActionsToVendor === true);
      }
    });
  }, []);

  const clearMessage = useCallback(() => {
    setMessage('');
    setMessageType(null);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearMessage, 5000);
    return () => clearTimeout(t);
  }, [message, clearMessage]);

  const handleSaveRevenuePercentage = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(revenuePercentage);
    if (Number.isNaN(num) || num < 0 || num > 100) {
      setMessageType('error');
      setMessage('Revenue percentage must be between 0 and 100.');
      return;
    }
    setRevenueSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({ revenuePercentage: num });
    setRevenueSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Revenue percentage saved.' : r.message || 'Failed to save.');
  };

  const handleSaveShowGuidelinesInVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuidelinesVendorSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({ showGuidelinesInVendorDashboard });
    setGuidelinesVendorSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Guidelines visibility saved.' : r.message || 'Failed to save.');
  };

  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationsSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({
      showNotificationBellToVendors,
      showNotificationAppointments,
      showNotificationSettlements,
      showNotificationTickets,
      showNotificationComments,
      showNotificationSalesData,
    });
    setNotificationsSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Notification settings saved.' : r.message || 'Failed to save.');
  };

  const handleSaveAdminNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationsSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({
      showNotificationBellToAdmins,
      showAdminNotificationAppointments,
      showAdminNotificationSettlements,
      showAdminNotificationTickets,
      showAdminNotificationComments,
      showAdminNotificationSalesData,
    });
    setNotificationsSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Admin notification settings saved.' : r.message || 'Failed to save.');
  };

  const handleSaveImportButton = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportButtonSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({ showImportButton });
    setImportButtonSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Import button visibility saved.' : r.message || 'Failed to save.');
  };

  const handleSaveDeleteAllCustomersToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteAllCustomersSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({ showDeleteAllCustomersButtonToAdmin });
    setDeleteAllCustomersSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Delete-all customers button visibility saved.' : r.message || 'Failed to save.');
  };

  const handlePurgeAllCustomers = async () => {
    if (!showDeleteAllCustomersButtonToAdmin) return;
    const step1 = confirm('This will PERMANENTLY delete ALL customers and related data. Continue?');
    if (!step1) return;
    const typed = prompt('Type DELETE ALL CUSTOMERS to confirm. This cannot be undone.');
    if ((typed || '').trim().toUpperCase() !== 'DELETE ALL CUSTOMERS') {
      setMessageType('error');
      setMessage('Cancelled. Confirmation text did not match.');
      return;
    }
    setPurgeCustomersSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await purgeAllCustomers();
    setPurgeCustomersSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(
      r.success
        ? `Deleted: ${r.deleted?.customers ?? 0} customers, ${r.deleted?.memberships ?? 0} memberships, ${r.deleted?.appointments ?? 0} appointments.`
        : r.message || 'Failed to delete all customers.'
    );
  };

  const handleSaveResetAllDataToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetAllDataSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({ showResetAllDataButtonToAdmin });
    setResetAllDataSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Reset-all button visibility saved.' : r.message || 'Failed to save.');
  };

  const handleResetAllData = async () => {
    if (!showResetAllDataButtonToAdmin) return;
    const step1 = confirm('This will delete MOST data (customers, appointments, memberships, leads, tickets, sales, loyalty, staff/vendors) but keep Admin, Branches, Membership Types, and Packages. Continue?');
    if (!step1) return;
    const typed = prompt('Type RESET ALL DATA to confirm. This cannot be undone.');
    if ((typed || '').trim().toUpperCase() !== 'RESET ALL DATA') {
      setMessageType('error');
      setMessage('Cancelled. Confirmation text did not match.');
      return;
    }
    setResetAllDataSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await apiRequest<{ deleted: Record<string, number> }>('/settings/reset-data', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_ALL_DATA' }),
    });
    setResetAllDataSaving(false);
    if (r.success && 'deleted' in r) {
      const deleted = (r as unknown as { deleted: Record<string, number> }).deleted;
      setMessageType('success');
      setMessage(`Reset complete. Deleted customers: ${deleted.customers ?? 0}, appointments: ${deleted.appointments ?? 0}, memberships: ${deleted.memberships ?? 0}.`);
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to reset data.');
    }
  };

  const handleSaveBulkDeleteToggles = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkDeleteTogglesSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateSettings({
      showBulkDeleteBranchesToAdmin,
      showBulkDeletePackagesToAdmin,
      showBulkDeleteMembershipsToAdmin,
      showBulkSettleSettlementsToAdmin,
      showPackageActionsToVendor,
    });
    setBulkDeleteTogglesSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Bulk actions visibility saved.' : r.message || 'Failed to save.');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setMessageType(null);
    if (!passwordCurrent.trim()) {
      setMessageType('error');
      setMessage('Current password is required.');
      return;
    }
    if (passwordNew.length < 6) {
      setMessageType('error');
      setMessage('New password must be at least 6 characters.');
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setMessageType('error');
      setMessage('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    const r = await updatePassword(passwordCurrent, passwordNew);
    setPasswordSaving(false);
    if (r.success) {
      setPasswordCurrent('');
      setPasswordNew('');
      setPasswordConfirm('');
      setMessageType('success');
      setMessage('Password updated successfully.');
    } else {
      setMessageType('error');
      setMessage(r.message || 'Failed to update password.');
    }
  };

  const extractRows = (parsed: unknown): Record<string, unknown>[] => {
    if (Array.isArray(parsed)) {
      const tableObj = parsed.find((item) => item && typeof item === 'object' && (item as { type?: string }).type === 'table' && Array.isArray((item as { data?: unknown[] }).data));
      if (tableObj) return (tableObj as { data: Record<string, unknown>[] }).data;
      return parsed as Record<string, unknown>[];
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    }
    return [];
  };

  const handlePickLegacyCustomersFile = async (file: File) => {
    setMessage('');
    setMessageType(null);
    setLegacyCustomersFileName(file.name);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = extractRows(parsed);
      setLegacyCustomersParsed(parsed);
      setLegacyCustomersRows(rows.length);
      if (rows.length === 0) {
        setMessageType('error');
        setMessage('No rows found in this JSON file.');
      }
    } catch (e) {
      setLegacyCustomersParsed(null);
      setLegacyCustomersRows(0);
      setMessageType('error');
      setMessage(e instanceof Error ? e.message : 'Invalid JSON file.');
    }
  };

  const doImportLegacyCustomers = async () => {
    if (!legacyCustomersParsed) return;
    setLegacyCustomersImporting(true);
    setMessage('');
    setMessageType(null);
    const r = await apiRequest<{ imported: number; updated: number; legacyIdMap?: Record<string, string> }>('/customers/import-legacy', {
      method: 'POST',
      body: JSON.stringify({ data: legacyCustomersParsed }),
    });
    setLegacyCustomersImporting(false);
    if (r.success && ('imported' in r)) {
      const rr = r as unknown as { imported: number; updated: number; legacyIdMap?: Record<string, string> };
      const existingMap = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}') as Record<string, string>;
      const nextMap = { ...existingMap, ...(rr.legacyIdMap || {}) };
      localStorage.setItem('customerLegacyIdMap', JSON.stringify(nextMap));
      setMessageType('success');
      setMessage(`Imported ${rr.imported} customer(s), updated ${rr.updated} customer(s).`);
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to import legacy customers.');
    }
  };

  const doImportLegacyAll = async () => {
    if (!legacyCustomersParsed) return;
    setLegacyDataImporting(true);
    setMessage('');
    setMessageType(null);
    const r = await apiRequest<{
      customers: { imported: number; updated: number };
      packages: { upserted: number };
      branches: { ensured: number };
      memberships: { upserted: number };
      legacyIdMap?: Record<string, string>;
    }>('/settings/import-legacy-data', {
      method: 'POST',
      body: JSON.stringify({ data: legacyCustomersParsed }),
    });
    setLegacyDataImporting(false);
    if (r.success && 'customers' in r) {
      const rr = r as unknown as { customers: { imported: number; updated: number }; memberships: { upserted: number }; packages: { upserted: number }; legacyIdMap?: Record<string, string> };
      const existingMap = JSON.parse(localStorage.getItem('customerLegacyIdMap') || '{}') as Record<string, string>;
      const nextMap = { ...existingMap, ...(rr.legacyIdMap || {}) };
      localStorage.setItem('customerLegacyIdMap', JSON.stringify(nextMap));
      setMessageType('success');
      setMessage(`Imported customers: ${rr.customers.imported}, updated: ${rr.customers.updated}. Packages upserted: ${rr.packages.upserted}. Memberships upserted: ${rr.memberships.upserted}.`);
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to import legacy data.');
    }
  };

  const doBackfillCustomerBranches = async () => {
    setMessage('');
    setMessageType(null);
    const r = await apiRequest<{ updated: number }>('/customers/backfill-branches', { method: 'POST' });
    if (r.success && 'updated' in r) {
      const rr = r as unknown as { updated: number };
      setMessageType('success');
      setMessage(`Backfilled branch for ${rr.updated} customer(s).`);
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to backfill customer branches.');
    }
  };

  const doBackfillBranchAddresses = async () => {
    setMessage('');
    setMessageType(null);
    const r = await apiRequest<{ updated: number }>('/settings/backfill-branch-addresses', { method: 'POST' });
    if (r.success && 'updated' in r) {
      const rr = r as unknown as { updated: number };
      setMessageType('success');
      setMessage(`Updated ${rr.updated} branch(es) with address/zip.`);
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to backfill branch addresses.');
    }
  };

  const openDialog = (action: NonNullable<typeof dialogAction>) => {
    if (action === 'importCustomers') {
      setDialogTitle('Import legacy customers?');
      setDialogBody('This will upsert customers by phone number. Existing customers with the same phone will be updated.');
      setDialogConfirmText('Import customers');
    } else if (action === 'importAll') {
      setDialogTitle('Import customers, memberships, and packages?');
      setDialogBody('This will import/update Customers, Branches, Packages, and Memberships using the selected JSON file.');
      setDialogConfirmText('Import all');
    } else if (action === 'backfillCustomerBranches') {
      setDialogTitle('Backfill customer branches?');
      setDialogBody('This fills the Customers page Branch column based on the sold-at branch from memberships.');
      setDialogConfirmText('Backfill');
    } else if (action === 'backfillBranchAddresses') {
      setDialogTitle('Backfill branch addresses & zip codes?');
      setDialogBody('This fills Branch address and zip code using the provided branch list.');
      setDialogConfirmText('Backfill');
    }
    setDialogAction(action);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogAction(null);
  };

  const confirmDialog = async () => {
    const action = dialogAction;
    closeDialog();
    if (!action) return;
    if (action === 'importCustomers') return doImportLegacyCustomers();
    if (action === 'importAll') return doImportLegacyAll();
    if (action === 'backfillCustomerBranches') return doBackfillCustomerBranches();
    if (action === 'backfillBranchAddresses') return doBackfillBranchAddresses();
  };

  const toastEl = message ? (
    <div
      role="alert"
      aria-live="polite"
      className={`settings-toast settings-toast-${messageType === 'success' ? 'success' : 'error'}`}
    >
      <span className="settings-toast-message">{message}</span>
      <button
        type="button"
        className="settings-toast-close"
        onClick={clearMessage}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  ) : null;

  const dialogEl = dialogOpen ? (
    <div
      className="vendor-modal-backdrop"
      role="presentation"
      onClick={closeDialog}
      style={{ zIndex: 2000 }}
    >
      <div
        className="vendor-modal block-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={dialogTitle}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <div className="vendor-modal-header block-confirm-header">
          <h2 style={{ margin: 0 }}>{dialogTitle}</h2>
          <button type="button" className="vendor-modal-close" onClick={closeDialog} aria-label="Close">
            ×
          </button>
        </div>
        <div className="block-confirm-body">
          <p className="block-confirm-message" style={{ marginTop: 0 }}>{dialogBody}</p>
          <div className="block-confirm-actions">
            <button type="button" className="block-confirm-cancel" onClick={closeDialog}>
              Cancel
            </button>
            <button type="button" className="block-confirm-ok" onClick={confirmDialog}>
              {dialogConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="dashboard-content settings-page">
      {toastEl != null && createPortal(toastEl, document.body)}
      {dialogEl != null && createPortal(dialogEl, document.body)}
      <header className="page-hero settings-page-hero">
        <h1 className="page-hero-title">Settings</h1>
        <p className="page-hero-subtitle">
          Manage system configuration, security, and vendor experience.
        </p>
      </header>

      <div className="settings-layout">
        {/* Account & Security */}
        <section className="content-card settings-card">
          <h2 className="settings-card-title">Account &amp; security</h2>
          <div className="settings-block">
            <h3 className="settings-block-heading">Update password</h3>
            <p className="settings-block-desc">
              Change your admin account password. Enter your current password and the new password twice.
            </p>
            <form onSubmit={handleUpdatePassword} className="settings-form">
              <label className="settings-label">
                <span>Current password</span>
                <input
                  type="password"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                  placeholder="Your current password"
                  autoComplete="current-password"
                  required
                  className="settings-input"
                />
              </label>
              <label className="settings-label">
                <span>New password</span>
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  required
                  className="settings-input"
                />
              </label>
              <label className="settings-label">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                  className="settings-input"
                />
              </label>
              <button type="submit" className="settings-btn settings-btn-primary" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </section>

        {/* Business rules – one card, two blocks in grid */}
        <section className="content-card settings-card">
          <h2 className="settings-card-title">Business rules</h2>
          <div className="settings-grid-2">
            <div className="settings-block">
              <h3 className="settings-block-heading">Revenue percentage</h3>
              <p className="settings-block-desc">
                Percentage of membership sales counted as revenue for reporting (0–100).
              </p>
              {settingsLoading ? (
                <p className="text-muted">Loading...</p>
              ) : (
                <form onSubmit={handleSaveRevenuePercentage} className="settings-form settings-form-inline">
                  <label className="settings-label">
                    <span>Revenue %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={revenuePercentage}
                      onChange={(e) => setRevenuePercentage(e.target.value)}
                      placeholder="10"
                      className="settings-input settings-input-narrow"
                    />
                  </label>
                  <button type="submit" className="settings-btn settings-btn-primary" disabled={revenueSaving}>
                    {revenueSaving ? 'Saving…' : 'Save'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Vendor experience – one card, three blocks */}
        <section className="content-card settings-card">
          <h2 className="settings-card-title">Vendor experience</h2>

          <div className="settings-block settings-block-divider">
            <h3 className="settings-block-heading">Guidelines in vendor dashboard</h3>
            <p className="settings-block-desc">Show or hide the Guidelines link in the vendor sidebar.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveShowGuidelinesInVendor} className="settings-form">
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showGuidelinesInVendorDashboard"
                      checked={showGuidelinesInVendorDashboard === true}
                      onChange={() => setShowGuidelinesInVendorDashboard(true)}
                    />
                    <span>Yes – show Guidelines</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showGuidelinesInVendorDashboard"
                      checked={showGuidelinesInVendorDashboard === false}
                      onChange={() => setShowGuidelinesInVendorDashboard(false)}
                    />
                    <span>No – hide Guidelines</span>
                  </label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={guidelinesVendorSaving}>
                  {guidelinesVendorSaving ? 'Saving…' : 'Save'}
                </button>
              </form>
            )}
          </div>

          <div className="settings-block settings-block-divider">
            <h3 className="settings-block-heading">Vendor notifications</h3>
            <p className="settings-block-desc">Notification bell visibility and which categories appear in the dropdown.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveNotificationSettings} className="settings-form">
                <div className="settings-radio-group">
                  <span className="settings-radio-legend">Show notification bell</span>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showNotificationBellToVendors"
                      checked={showNotificationBellToVendors === true}
                      onChange={() => setShowNotificationBellToVendors(true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showNotificationBellToVendors"
                      checked={showNotificationBellToVendors === false}
                      onChange={() => setShowNotificationBellToVendors(false)}
                    />
                    <span>No</span>
                  </label>
                </div>
                <div className="settings-checkbox-group">
                  <span className="settings-checkbox-legend">Categories in dropdown</span>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showNotificationAppointments} onChange={(e) => setShowNotificationAppointments(e.target.checked)} /><span>Appointments</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showNotificationSettlements} onChange={(e) => setShowNotificationSettlements(e.target.checked)} /><span>Settlements</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showNotificationTickets} onChange={(e) => setShowNotificationTickets(e.target.checked)} /><span>Tickets</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showNotificationComments} onChange={(e) => setShowNotificationComments(e.target.checked)} /><span>Comments</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showNotificationSalesData} onChange={(e) => setShowNotificationSalesData(e.target.checked)} /><span>Sales Data</span></label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={notificationsSaving}>
                  {notificationsSaving ? 'Saving…' : 'Save notification settings'}
                </button>
              </form>
            )}
          </div>

          <div className="settings-block settings-block-divider">
            <h3 className="settings-block-heading">Admin notifications</h3>
            <p className="settings-block-desc">Notification bell visibility and which categories appear in the dropdown for admins.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveAdminNotificationSettings} className="settings-form">
                <div className="settings-radio-group">
                  <span className="settings-radio-legend">Show notification bell</span>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showNotificationBellToAdmins"
                      checked={showNotificationBellToAdmins === true}
                      onChange={() => setShowNotificationBellToAdmins(true)}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showNotificationBellToAdmins"
                      checked={showNotificationBellToAdmins === false}
                      onChange={() => setShowNotificationBellToAdmins(false)}
                    />
                    <span>No</span>
                  </label>
                </div>
                <div className="settings-checkbox-group">
                  <span className="settings-checkbox-legend">Categories in dropdown</span>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showAdminNotificationAppointments} onChange={(e) => setShowAdminNotificationAppointments(e.target.checked)} /><span>Appointments</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showAdminNotificationSettlements} onChange={(e) => setShowAdminNotificationSettlements(e.target.checked)} /><span>Settlements</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showAdminNotificationTickets} onChange={(e) => setShowAdminNotificationTickets(e.target.checked)} /><span>Tickets</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showAdminNotificationComments} onChange={(e) => setShowAdminNotificationComments(e.target.checked)} /><span>Comments</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showAdminNotificationSalesData} onChange={(e) => setShowAdminNotificationSalesData(e.target.checked)} /><span>Sales Data</span></label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={notificationsSaving}>
                  {notificationsSaving ? 'Saving…' : 'Save admin notification settings'}
                </button>
              </form>
            )}
          </div>

          <div className="settings-block settings-block-divider">
            <h3 className="settings-block-heading">Admin bulk actions & package actions</h3>
            <p className="settings-block-desc">Show or hide bulk select + delete/settle on admin list pages, and package action buttons (Edit, Activate, Inactive, Delete) for vendor/staff.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveBulkDeleteToggles} className="settings-form">
                <div className="settings-checkbox-group">
                  <span className="settings-checkbox-legend">Pages</span>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeleteBranchesToAdmin} onChange={(e) => setShowBulkDeleteBranchesToAdmin(e.target.checked)} /><span>Branches – bulk delete</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeletePackagesToAdmin} onChange={(e) => setShowBulkDeletePackagesToAdmin(e.target.checked)} /><span>Packages – bulk delete</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeleteMembershipsToAdmin} onChange={(e) => setShowBulkDeleteMembershipsToAdmin(e.target.checked)} /><span>Memberships – bulk delete</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkSettleSettlementsToAdmin} onChange={(e) => setShowBulkSettleSettlementsToAdmin(e.target.checked)} /><span>Settlements – bulk mark settled</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showPackageActionsToVendor} onChange={(e) => setShowPackageActionsToVendor(e.target.checked)} /><span>Packages – show Edit, Activate, Inactive, Delete to vendor/staff</span></label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={bulkDeleteTogglesSaving}>
                  {bulkDeleteTogglesSaving ? 'Saving…' : 'Save bulk actions & package visibility'}
                </button>
              </form>
            )}
          </div>

          <div className="settings-block">
            <h3 className="settings-block-heading">Import buttons</h3>
            <p className="settings-block-desc">Show or hide Import buttons on Branches, Packages, Customers, Memberships, and Appointments.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveImportButton} className="settings-form">
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input type="radio" name="showImportButton" checked={showImportButton === true} onChange={() => setShowImportButton(true)} />
                    <span>Yes – show Import buttons</span>
                  </label>
                  <label className="settings-radio-label">
                    <input type="radio" name="showImportButton" checked={showImportButton === false} onChange={() => setShowImportButton(false)} />
                    <span>No – hide Import buttons</span>
                  </label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={importButtonSaving}>
                  {importButtonSaving ? 'Saving…' : 'Save'}
                </button>
              </form>
            )}
          </div>

          <div className="settings-block settings-block-divider">
            <h3 className="settings-block-heading">Import legacy customers (JSON)</h3>
            <p className="settings-block-desc">
              Upload your old-system customer JSON export (PHPMyAdmin export supported). This will import customers into this system and
              create a legacy ID mapping used by other imports.
            </p>
            <div className="settings-form">
              <label className="settings-label">
                <span>JSON file</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="settings-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handlePickLegacyCustomersFile(f);
                  }}
                />
              </label>
              {legacyCustomersFileName && (
                <p className="text-muted" style={{ marginTop: '-0.25rem' }}>
                  Selected: <strong>{legacyCustomersFileName}</strong> ({legacyCustomersRows} row(s))
                </p>
              )}
              <div className="settings-btn-row">
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  disabled={!legacyCustomersParsed || legacyCustomersImporting || legacyCustomersRows === 0}
                  onClick={() => openDialog('importCustomers')}
                >
                  {legacyCustomersImporting ? 'Importing…' : 'Import customers'}
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  disabled={!legacyCustomersParsed || legacyDataImporting || legacyCustomersRows === 0}
                  onClick={() => openDialog('importAll')}
                  title="Also imports Packages and Memberships from this JSON (if those fields exist)."
                >
                  {legacyDataImporting ? 'Importing…' : 'Import customers + memberships + packages'}
                </button>
              </div>
              <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                Import rule: customers are <strong>upserted by phone</strong>. Legacy IDs are stored in local storage as <code>customerLegacyIdMap</code>.
              </p>
              <div className="settings-btn-row" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => openDialog('backfillCustomerBranches')}
                  title="Fix empty Branch column for already-imported customers."
                >
                  Backfill customer branches from memberships
                </button>
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => openDialog('backfillBranchAddresses')}
                  title="Fill Branch addresses + zip codes."
                >
                  Backfill branch addresses & zip codes
                </button>
              </div>
            </div>
          </div>

          <div className="settings-block">
            <h3 className="settings-block-heading">Delete all customers (danger zone)</h3>
            <p className="settings-block-desc">
              Show or hide the “Delete all customers” button for admins. This permanently deletes customers and related records.
            </p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveDeleteAllCustomersToggle} className="settings-form">
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showDeleteAllCustomersButtonToAdmin"
                      checked={showDeleteAllCustomersButtonToAdmin === true}
                      onChange={() => setShowDeleteAllCustomersButtonToAdmin(true)}
                    />
                    <span>Yes – show delete-all button</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showDeleteAllCustomersButtonToAdmin"
                      checked={showDeleteAllCustomersButtonToAdmin === false}
                      onChange={() => setShowDeleteAllCustomersButtonToAdmin(false)}
                    />
                    <span>No – hide delete-all button</span>
                  </label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={deleteAllCustomersSaving}>
                  {deleteAllCustomersSaving ? 'Saving…' : 'Save'}
                </button>
              </form>
            )}
            {showDeleteAllCustomersButtonToAdmin && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={handlePurgeAllCustomers}
                  disabled={purgeCustomersSaving}
                >
                  {purgeCustomersSaving ? 'Deleting…' : 'Delete ALL customers now'}
                </button>
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                  This deletes customers, memberships, membership usage, appointments, and loyalty records.
                </p>
              </div>
            )}
          </div>

          <div className="settings-block">
            <h3 className="settings-block-heading">Reset all data (danger zone)</h3>
            <p className="settings-block-desc">
              Deletes most data but keeps Admin user(s), Branches, Membership Types, and Packages.
            </p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveResetAllDataToggle} className="settings-form">
                <div className="settings-radio-group">
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showResetAllDataButtonToAdmin"
                      checked={showResetAllDataButtonToAdmin === true}
                      onChange={() => setShowResetAllDataButtonToAdmin(true)}
                    />
                    <span>Yes – show reset button</span>
                  </label>
                  <label className="settings-radio-label">
                    <input
                      type="radio"
                      name="showResetAllDataButtonToAdmin"
                      checked={showResetAllDataButtonToAdmin === false}
                      onChange={() => setShowResetAllDataButtonToAdmin(false)}
                    />
                    <span>No – hide reset button</span>
                  </label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={resetAllDataSaving}>
                  {resetAllDataSaving ? 'Saving…' : 'Save'}
                </button>
              </form>
            )}
            {showResetAllDataButtonToAdmin && (
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="settings-btn settings-btn-primary"
                  onClick={handleResetAllData}
                  disabled={resetAllDataSaving}
                >
                  {resetAllDataSaving ? 'Resetting…' : 'RESET all data now'}
                </button>
                <p className="text-muted" style={{ marginTop: '0.5rem' }}>
                  This removes customers, appointments, memberships/usages, leads, tickets, sales data, loyalty, settlements, audit logs, and non-admin users.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
