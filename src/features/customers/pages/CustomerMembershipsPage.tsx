import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/hooks/useAuth';
import { getCustomer } from '../../../api/customers';
import { getMemberships, deleteMembership } from '../../../api/memberships';
import { getSettings } from '../../../api/settings';
import type { Customer } from '../../../types/common';
import type { Membership } from '../../../types/common';

function getExpiryRemaining(expiryDate: string | undefined): string {
  if (!expiryDate) return '—';
  const exp = new Date(expiryDate);
  const now = new Date();
  if (exp < now) return 'Expired';
  const days = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'} left`;
}

function getRemainingCredits(m: Membership): number {
  if (m.remainingCredits != null) return m.remainingCredits;
  return Math.max(0, m.totalCredits - m.usedCredits);
}

function packageLabel(m: Membership): string {
  return m.packageName || m.typeName || m.customerPackage || '—';
}

export default function CustomerMembershipsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditDeleteActionsToVendor, setShowEditDeleteActionsToVendor] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const basePath = user?.role === 'admin' ? '/admin' : '/vendor';
  const isAdmin = user?.role === 'admin';
  const canEditDeleteMembership = isAdmin || (!!user && user.role === 'vendor' && showEditDeleteActionsToVendor);

  const reloadMemberships = useCallback(() => {
    if (!id) return;
    getMemberships({ customerId: id }).then((r) => {
      if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships || []);
      else setError((r as { message?: string }).message || 'Failed to load memberships.');
    });
  }, [id]);

  useEffect(() => {
    getSettings().then((r) => {
      if (r.success && r.settings && typeof (r.settings as { showEditDeleteActionsToVendor?: boolean }).showEditDeleteActionsToVendor === 'boolean') {
        setShowEditDeleteActionsToVendor((r.settings as { showEditDeleteActionsToVendor: boolean }).showEditDeleteActionsToVendor);
      }
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      getCustomer(id).then((r) => {
        if (r.success && 'customer' in r) setCustomer((r as unknown as { customer: Customer }).customer);
      }),
      getMemberships({ customerId: id }).then((r) => {
        if (r.success && 'memberships' in r) setMemberships((r as { memberships: Membership[] }).memberships || []);
        else setError((r as { message?: string }).message || 'Failed to load memberships.');
      }),
    ]).finally(() => setLoading(false));
  }, [id]);

  const returnToThisPage = id ? `${basePath}/customers/${id}/memberships` : `${basePath}/customers`;

  function goManageMembership(membershipId: string) {
    navigate(`${basePath}/memberships/${membershipId}`, { state: { returnTo: returnToThisPage } });
  }

  async function handleDeleteMembership(membershipId: string) {
    if (!window.confirm('Delete this membership? Related usage and settlement records may be removed. This cannot be undone.')) return;
    setDeletingId(membershipId);
    setError('');
    const r = await deleteMembership(membershipId);
    setDeletingId(null);
    if (r.success) reloadMemberships();
    else setError((r as { message?: string }).message || 'Failed to delete membership.');
  }

  if (!id) {
    return (
      <div className="dashboard-content">
        <div className="auth-error">Invalid customer.</div>
        <button type="button" className="auth-submit" style={{ marginTop: '1rem' }} onClick={() => navigate(`${basePath}/customers`)}>Back to customers</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="vendors-loading"><div className="spinner" /><span>Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <section className="content-card">
        <button type="button" className="vendor-name-btn" style={{ marginBottom: '0.5rem' }} onClick={() => navigate(`${basePath}/customers/${id}`)}>← Back to customer</button>
        <h2>Memberships{customer ? `: ${customer.name}` : ''}</h2>
        <p className="text-muted">Membership history, package expiry, and remaining uses for this customer.</p>
        {error && <div className="auth-error vendors-error">{error}</div>}
        {memberships.length === 0 && !error ? (
          <p className="text-muted">No memberships found for this customer.</p>
        ) : (
          <div
            className="table-responsive customer-memberships-scroll"
            style={{ marginTop: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}
          >
            <table className="report-table" style={{ minWidth: '1040px', width: '100%' }}>
              <thead>
                <tr>
                  <th>Package / Type</th>
                  <th>Purchase date</th>
                  <th>Expiry date</th>
                  <th>Time remaining</th>
                  <th>Total credits</th>
                  <th>Used</th>
                  <th>Remaining uses</th>
                  <th>Status</th>
                  <th style={{ minWidth: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.id}>
                    <td>{packageLabel(m)}</td>
                    <td>{m.purchaseDate ? new Date(m.purchaseDate).toLocaleDateString() : '—'}</td>
                    <td>{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '—'}</td>
                    <td>{getExpiryRemaining(m.expiryDate)}</td>
                    <td>{m.totalCredits}</td>
                    <td>{m.usedCredits}</td>
                    <td>{getRemainingCredits(m)}</td>
                    <td>{m.status || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                        <button type="button" className="filter-btn" onClick={() => goManageMembership(m.id)}>
                          Manage / record session
                        </button>
                        {canEditDeleteMembership && (
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => void handleDeleteMembership(m.id)}
                            disabled={deletingId === m.id}
                          >
                            {deletingId === m.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
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
