import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSettings, updateSettings } from '../api/settings';
import { getServices, createService, updateService, deleteService } from '../api/services';
import { getBranches } from '../api/branches';
import { updatePassword } from '../api/auth.api';
import { purgeAllCustomers } from '../api/customers';
import { apiRequest } from '../api/client';
import type { Service } from '../types/crm';

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
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceBranchId, setServiceBranchId] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceSaving, setServiceSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrice, setEditPrice] = useState('');

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
      }
    });
  }, []);

  const loadServices = () => {
    setServicesLoading(true);
    getServices().then((r) => {
      setServicesLoading(false);
      if (r.success && r.services) setServices(r.services);
    });
    getBranches().then((r) => { if (r.success && r.branches) setBranches(r.branches); });
  };

  useEffect(() => { loadServices(); }, []);

  const clearMessage = useCallback(() => {
    setMessage('');
    setMessageType(null);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(clearMessage, 5000);
    return () => clearTimeout(t);
  }, [message, clearMessage]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setMessageType('error');
      setMessage('Service name is required.');
      return;
    }
    const durationNum = serviceDuration.trim() ? parseInt(serviceDuration, 10) : undefined;
    const priceNum = servicePrice.trim() ? parseFloat(servicePrice) : undefined;
    if (serviceDuration.trim() && (Number.isNaN(durationNum) || (durationNum != null && durationNum < 1))) {
      setMessageType('error');
      setMessage('Duration must be at least 1 minute.');
      return;
    }
    if (servicePrice.trim() && (Number.isNaN(priceNum as number) || (priceNum != null && priceNum < 0))) {
      setMessageType('error');
      setMessage('Price must be 0 or greater.');
      return;
    }
    setServiceSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await createService({
      name: serviceName.trim(),
      category: serviceCategory.trim() || undefined,
      branchId: serviceBranchId || undefined,
      durationMinutes: durationNum,
      price: priceNum,
    });
    setServiceSaving(false);
    if (r.success) {
      setServiceName('');
      setServiceCategory('');
      setServiceBranchId('');
      setServiceDuration('');
      setServicePrice('');
      loadServices();
      setMessageType('success');
      setMessage('Service added.');
    } else {
      setMessageType('error');
      setMessage(r.message || 'Failed to add service.');
    }
  };

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCategory(s.category || '');
    setEditBranchId(s.branchId || '');
    setEditDuration(s.durationMinutes != null ? String(s.durationMinutes) : '');
    setEditPrice(s.price != null ? String(s.price) : '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) {
      setMessageType('error');
      setMessage('Name is required.');
      return;
    }
    const durationNum = editDuration.trim() ? parseInt(editDuration, 10) : undefined;
    const priceNum = editPrice.trim() ? parseFloat(editPrice) : undefined;
    if (editDuration.trim() && (Number.isNaN(durationNum) || (durationNum != null && durationNum < 1))) {
      setMessageType('error');
      setMessage('Duration must be at least 1 minute.');
      return;
    }
    if (editPrice.trim() && (Number.isNaN(priceNum as number) || (priceNum != null && priceNum < 0))) {
      setMessageType('error');
      setMessage('Price must be 0 or greater.');
      return;
    }
    setServiceSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateService(editingId, {
      name: editName.trim(),
      category: editCategory.trim() || undefined,
      branchId: editBranchId || undefined,
      durationMinutes: durationNum,
      price: priceNum,
    });
    setServiceSaving(false);
    if (r.success) {
      setEditingId(null);
      loadServices();
      setMessageType('success');
      setMessage('Service updated.');
    } else {
      setMessageType('error');
      setMessage(r.message || 'Failed to update service.');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Remove this service? It will no longer appear in appointments or leads.')) return;
    setServiceSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await deleteService(id);
    setServiceSaving(false);
    if (r.success) {
      loadServices();
      setMessageType('success');
      setMessage('Service removed.');
    } else {
      setMessageType('error');
      setMessage(r.message || 'Failed to remove service.');
    }
  };

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
    });
    setBulkDeleteTogglesSaving(false);
    setMessageType(r.success ? 'success' : 'error');
    setMessage(r.success ? 'Bulk delete visibility saved.' : r.message || 'Failed to save.');
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

  return (
    <div className="dashboard-content settings-page">
      {toastEl != null && createPortal(toastEl, document.body)}
      <header className="page-hero settings-page-hero">
        <h1 className="page-hero-title">Settings</h1>
        <p className="page-hero-subtitle">
          Manage system configuration, security, vendor experience, and services.
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
            <h3 className="settings-block-heading">Admin bulk delete buttons</h3>
            <p className="settings-block-desc">Show or hide bulk select + delete controls on admin list pages.</p>
            {settingsLoading ? (
              <p className="text-muted">Loading...</p>
            ) : (
              <form onSubmit={handleSaveBulkDeleteToggles} className="settings-form">
                <div className="settings-checkbox-group">
                  <span className="settings-checkbox-legend">Pages</span>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeleteBranchesToAdmin} onChange={(e) => setShowBulkDeleteBranchesToAdmin(e.target.checked)} /><span>Branches</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeletePackagesToAdmin} onChange={(e) => setShowBulkDeletePackagesToAdmin(e.target.checked)} /><span>Packages</span></label>
                  <label className="settings-checkbox-label"><input type="checkbox" checked={showBulkDeleteMembershipsToAdmin} onChange={(e) => setShowBulkDeleteMembershipsToAdmin(e.target.checked)} /><span>Memberships</span></label>
                </div>
                <button type="submit" className="settings-btn settings-btn-primary" disabled={bulkDeleteTogglesSaving}>
                  {bulkDeleteTogglesSaving ? 'Saving…' : 'Save bulk delete settings'}
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

        {/* Services */}
        <section className="content-card settings-card">
          <h2 className="settings-card-title">Services</h2>
          <p className="settings-block-desc" style={{ marginBottom: '1rem' }}>
            Add services for appointments and leads. Leave branch blank for all branches.
          </p>
          <form onSubmit={handleAddService} className="settings-form settings-form-row">
            <label className="settings-label settings-label-flex">
              <span>Name *</span>
              <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Eyebrow threading" className="settings-input" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Category</span>
              <input type="text" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} placeholder="Optional" className="settings-input" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Branch</span>
              <select value={serviceBranchId} onChange={(e) => setServiceBranchId(e.target.value)} className="settings-input">
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="settings-label settings-label-flex">
              <span>Duration (min)</span>
              <input type="number" min={1} value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} placeholder="—" className="settings-input settings-input-narrow" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Price ($)</span>
              <input type="number" min={0} step={0.01} value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="—" className="settings-input settings-input-narrow" />
            </label>
            <button type="submit" className="settings-btn settings-btn-primary" disabled={serviceSaving}>
              {serviceSaving ? 'Adding…' : 'Add service'}
            </button>
          </form>
          {servicesLoading ? (
            <p className="text-muted settings-services-loading">Loading services…</p>
          ) : services.length === 0 ? (
            <p className="text-muted settings-services-empty">No services yet. Add one above.</p>
          ) : (
            <div className="settings-table-wrap">
              <table className="data-table settings-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Branch</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      {editingId === s.id ? (
                        <td colSpan={6}>
                          <form onSubmit={handleUpdateService} className="settings-inline-form">
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" required className="settings-input settings-input-sm" />
                            <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" className="settings-input settings-input-sm" />
                            <select value={editBranchId} onChange={(e) => setEditBranchId(e.target.value)} className="settings-input settings-input-sm">
                              <option value="">All branches</option>
                              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Min" className="settings-input settings-input-sm" />
                            <input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Price" className="settings-input settings-input-sm" />
                            <button type="submit" className="settings-btn settings-btn-sm" disabled={serviceSaving}>Save</button>
                            <button type="button" className="settings-btn settings-btn-sm settings-btn-secondary" onClick={cancelEdit}>Cancel</button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td>{s.name}</td>
                          <td>{s.category || '—'}</td>
                          <td>{s.branch || 'All'}</td>
                          <td>{s.durationMinutes != null ? `${s.durationMinutes} min` : '—'}</td>
                          <td>{s.price != null ? `$${s.price}` : '—'}</td>
                          <td>
                            <button type="button" className="settings-btn settings-btn-sm settings-btn-secondary" onClick={() => startEdit(s)}>Edit</button>
                            <button type="button" className="settings-btn settings-btn-sm settings-btn-danger" onClick={() => handleDeleteService(s.id)}>Remove</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
