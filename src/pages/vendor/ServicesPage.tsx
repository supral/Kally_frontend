import { useEffect, useState } from 'react';
import { getServices, createService, updateService, deleteService } from '../../api/services';
import { getSettings } from '../../api/settings';
import { useBranch } from '../../hooks/useBranch';
import type { Service } from '../../types/crm';

export default function VendorServicesPage() {
  const { branchId: userBranchId } = useBranch();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [showServiceActionsToVendor, setShowServiceActionsToVendor] = useState(false);

  const loadServices = () => {
    setLoading(true);
    setError('');
    getServices().then((r) => {
      setLoading(false);
      if (r.success && r.services) setServices(r.services);
      else setError((r as { message?: string }).message || 'Failed to load services.');
    });
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.success && r.settings && typeof r.settings.showServiceActionsToVendor === 'boolean') {
        setShowServiceActionsToVendor(r.settings.showServiceActionsToVendor === true);
      }
    });
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      setMessage('');
      setMessageType(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [message]);

  const canEditService = (s: Service) => userBranchId && s.branchId && String(s.branchId) === String(userBranchId);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setMessageType('error');
      setMessage('Service name is required.');
      return;
    }
    if (!userBranchId) {
      setMessageType('error');
      setMessage('You must be assigned to a branch to add services.');
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
    setSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await createService({
      name: serviceName.trim(),
      category: serviceCategory.trim() || undefined,
      durationMinutes: durationNum,
      price: priceNum,
    });
    setSaving(false);
    if (r.success) {
      setServiceName('');
      setServiceCategory('');
      setServiceDuration('');
      setServicePrice('');
      loadServices();
      setMessageType('success');
      setMessage('Service added to your branch.');
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to add service.');
    }
  };

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCategory(s.category || '');
    setEditDuration(s.durationMinutes != null ? String(s.durationMinutes) : '');
    setEditPrice(s.price != null ? String(s.price) : '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;
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
    setSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await updateService(editingId, {
      name: editName.trim(),
      category: editCategory.trim() || undefined,
      durationMinutes: durationNum,
      price: priceNum,
    });
    setSaving(false);
    if (r.success) {
      setEditingId(null);
      loadServices();
      setMessageType('success');
      setMessage('Service updated.');
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to update service.');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Remove this service? It will no longer appear in appointments or leads for your branch.')) return;
    setSaving(true);
    setMessage('');
    setMessageType(null);
    const r = await deleteService(id);
    setSaving(false);
    if (r.success) {
      loadServices();
      setMessageType('success');
      setMessage('Service removed.');
    } else {
      setMessageType('error');
      setMessage((r as { message?: string }).message || 'Failed to remove service.');
    }
  };

  return (
    <div className="dashboard-content">
      <section className="content-card">
        <header className="page-hero" style={{ marginBottom: '1rem' }}>
          <h1 className="page-hero-title">Services</h1>
          <p className="page-hero-subtitle">
            Add and manage services for your branch. These can be used when booking appointments and in leads.
          </p>
        </header>
        {(error || message) && (
          <div className={messageType === 'error' || error ? 'auth-error' : 'auth-success'} role="alert" style={{ marginBottom: '1rem' }}>
            {message || error}
          </div>
        )}

        {userBranchId && showServiceActionsToVendor && (
          <form onSubmit={handleAddService} className="settings-form settings-form-row" style={{ marginBottom: '1.5rem' }}>
            <label className="settings-label settings-label-flex">
              <span>Name *</span>
              <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Eyebrow threading" className="settings-input" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Category</span>
              <input type="text" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} placeholder="Optional" className="settings-input" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Duration (min)</span>
              <input type="number" min={1} value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} placeholder="—" className="settings-input settings-input-narrow" />
            </label>
            <label className="settings-label settings-label-flex">
              <span>Price ($)</span>
              <input type="number" min={0} step={0.01} value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="—" className="settings-input settings-input-narrow" />
            </label>
            <button type="submit" className="settings-btn settings-btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add service'}
            </button>
          </form>
        )}

        {!userBranchId && (
          <p className="text-muted" style={{ marginBottom: '1rem' }}>You must be assigned to a branch to add services. Contact admin if needed.</p>
        )}

        {loading ? (
          <div className="vendors-loading">
            <div className="spinner" />
            <span>Loading services…</span>
          </div>
        ) : services.length === 0 ? (
          <p className="vendors-empty text-muted">No services for your branch yet. Add one above.</p>
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
                  {userBranchId && showServiceActionsToVendor && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                  {editingId === s.id && showServiceActionsToVendor && canEditService(s) ? (
                      <td colSpan={userBranchId && showServiceActionsToVendor ? 6 : 5}>
                        <form onSubmit={handleUpdateService} className="settings-inline-form">
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" required className="settings-input settings-input-sm" />
                          <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" className="settings-input settings-input-sm" />
                          <input type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Min" className="settings-input settings-input-sm" />
                          <input type="number" min={0} step={0.01} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="Price" className="settings-input settings-input-sm" />
                          <button type="submit" className="settings-btn settings-btn-sm" disabled={saving}>Save</button>
                          <button type="button" className="settings-btn settings-btn-sm settings-btn-secondary" onClick={cancelEdit}>Cancel</button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td>{s.name}</td>
                        <td>{s.category || '—'}</td>
                        <td>{s.branch || 'All branches'}</td>
                        <td>{s.durationMinutes != null ? `${s.durationMinutes} min` : '—'}</td>
                        <td>{s.price != null ? `$${s.price}` : '—'}</td>
                        {userBranchId && (
                          <td>
                            {showServiceActionsToVendor && canEditService(s) ? (
                              <>
                                <button type="button" className="settings-btn settings-btn-sm settings-btn-secondary" onClick={() => startEdit(s)}>Edit</button>
                                <button type="button" className="settings-btn settings-btn-sm settings-btn-danger" onClick={() => handleDeleteService(s.id)}>Remove</button>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        )}
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
  );
}
