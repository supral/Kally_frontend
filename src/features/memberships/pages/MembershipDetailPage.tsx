import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getMembership, recordMembershipUsage, renewMembership, deleteMembershipUsage } from '../../../api/memberships';
import { getBranches } from '../../../api/branches';
import { getSettings } from '../../../api/settings';
import { useAuth } from '../../../auth/hooks/useAuth';
import { formatCurrency } from '../../../utils/money';
import type { Membership, MembershipUsage } from '../../../types/common';
import type { Branch } from '../../../types/crm';

export default function MembershipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [usageHistory, setUsageHistory] = useState<MembershipUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useCredits, setUseCredits] = useState(1);
  const [useNotes, setUseNotes] = useState('');
  const [usedAtBranchId, setUsedAtBranchId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewCredits, setRenewCredits] = useState('');
  const [usageDeleteId, setUsageDeleteId] = useState<string | null>(null);
  const [usageDeleting, setUsageDeleting] = useState(false);
  const [showDeleteMembershipUsageToAdmin, setShowDeleteMembershipUsageToAdmin] = useState(true);
  const basePath = user?.role === 'admin' ? '/admin' : '/vendor';
  const isAdmin = user?.role === 'admin';
  const canDeleteRecordedSession = isAdmin && showDeleteMembershipUsageToAdmin;

  useEffect(() => {
    if (!isAdmin) return;
    getSettings().then((r) => {
      if (r.success && r.settings) {
        const s = r.settings as { showDeleteMembershipUsageToAdmin?: boolean };
        setShowDeleteMembershipUsageToAdmin(s.showDeleteMembershipUsageToAdmin !== false);
      }
    });
  }, [isAdmin]);

  const returnToMemberships =
    (location.state as { returnTo?: string } | null)?.returnTo || `${basePath}/memberships`;

  function goBackToMemberships() {
    navigate(returnToMemberships);
  }

  useEffect(() => {
    if (!id) return;
    getMembership(id).then((r) => {
      setLoading(false);
      if (r.success) {
        const m = r.membership || null;
        setMembership(m);
        setUsageHistory(r.usageHistory || []);
        if (m && (m.status === 'expired' || m.status === 'used')) {
          setRenewCredits(String(m.totalCredits));
        }
      } else setError(r.message || 'Failed to load');
    });
  }, [id]);

  useEffect(() => {
    setBranchesLoading(true);
    getBranches({ all: user?.role === 'admin' }).then((r) => {
      setBranchesLoading(false);
      if (r.success && r.branches?.length) {
        setBranches(r.branches);
        setUsedAtBranchId((prev) => {
          if (prev) return prev;
          if (user?.role === 'vendor' && user?.branchId) return String(user.branchId);
          if (r.branches!.length === 1) return r.branches![0].id;
          return '';
        });
      } else {
        setBranches(r.success ? [] : []);
      }
    });
  }, [user?.role, user?.branchId]);

  async function handleUse(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !membership) return;
    if (!usedAtBranchId) {
      setError('Please select the branch where credits are being used.');
      return;
    }
    const remaining = (membership.remainingCredits ?? membership.totalCredits - membership.usedCredits);
    if (useCredits > remaining) {
      setError(`Only ${remaining} credit(s) remaining.`);
      return;
    }
    setSubmitting(true);
    setError('');
    const res = await recordMembershipUsage(id, { creditsUsed: useCredits, notes: useNotes.trim() || undefined, usedAtBranchId });
    setSubmitting(false);
    if (res.success) {
      getMembership(id).then((r) => {
        if (r.success) {
          setMembership(r.membership || null);
          setUsageHistory(r.usageHistory || []);
          setUseCredits(1);
          setUseNotes('');
        }
      });
    } else setError((res as { message?: string }).message || 'Failed to record usage');
  }

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !membership) return;
    const credits = renewCredits.trim() ? parseInt(renewCredits, 10) : membership.totalCredits;
    if (Number.isNaN(credits) || credits < 1) {
      setError('Total credits must be at least 1.');
      return;
    }
    setRenewing(true);
    setError('');
    const res = await renewMembership(id, {
      packagePrice: 0,
      totalCredits: credits,
    });
    setRenewing(false);
    if (res.success && res.membership) {
      navigate(`${basePath}/memberships/${res.membership.id}`, { replace: true, state: location.state });
    } else setError((res as { message?: string }).message || 'Failed to renew membership');
  }

  async function confirmDeleteUsage() {
    if (!id || !usageDeleteId) return;
    setUsageDeleting(true);
    setError('');
    const res = await deleteMembershipUsage(id, usageDeleteId);
    setUsageDeleting(false);
    setUsageDeleteId(null);
    if (res.success) {
      getMembership(id).then((r) => {
        if (r.success) {
          setMembership(r.membership || null);
          setUsageHistory(r.usageHistory || []);
        }
      });
    } else setError((res as { message?: string }).message || 'Failed to delete session');
  }

  if (loading || !id) {
    return (
      <div className="dashboard-content">
        <div className="vendors-loading"><div className="spinner" /><span>Loading...</span></div>
      </div>
    );
  }

  if (error && !membership) {
    return (
      <div className="dashboard-content">
        <div className="auth-error">{error}</div>
        <button type="button" className="auth-submit" style={{ marginTop: '1rem' }} onClick={goBackToMemberships}>Back to memberships</button>
      </div>
    );
  }

  const remaining = membership!.remainingCredits ?? membership!.totalCredits - membership!.usedCredits;
  const canUse = remaining > 0 && membership!.status === 'active';
  const statusClass = membership!.status === 'active' ? 'approved' : membership!.status === 'used' ? 'rejected' : 'pending';

  return (
    <div className="dashboard-content membership-detail-page">
      <button type="button" className="membership-detail-back" onClick={goBackToMemberships}>← Back to memberships</button>

      <section className="content-card membership-detail-card">
        <div className="membership-detail-header">
          <div>
            <h1 className="membership-detail-title">{membership!.customer?.name || 'Membership'}</h1>
            {(membership!.customer?.phone || membership!.customer?.email) && (
            <p className="membership-detail-subtitle">{[membership!.customer?.phone, membership!.customer?.email].filter(Boolean).join(' · ')}</p>
          )}
          </div>
          <div className="membership-detail-status-row">
            <span className={`status-badge status-${statusClass}`}>{membership!.status}</span>
            <span className="membership-detail-credits">{remaining} / {membership!.totalCredits} credits</span>
          </div>
        </div>

        <div className="membership-detail-grid">
          <div className="membership-detail-field">
            <span className="membership-detail-label">Total credits</span>
            <span className="membership-detail-value">{membership!.totalCredits}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Used</span>
            <span className="membership-detail-value">{membership!.usedCredits}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Remaining</span>
            <span className="membership-detail-value membership-detail-value-highlight">{remaining}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Package price</span>
            <span className="membership-detail-value">{membership!.packagePrice != null ? formatCurrency(membership!.packagePrice) : '—'}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Sold at</span>
            <span className="membership-detail-value">{membership!.soldAtBranch || '—'}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Purchase date</span>
            <span className="membership-detail-value">{membership!.purchaseDate ? new Date(membership!.purchaseDate).toLocaleDateString() : '—'}</span>
          </div>
          <div className="membership-detail-field">
            <span className="membership-detail-label">Expiry</span>
            <span className="membership-detail-value">{membership!.expiryDate ? new Date(membership!.expiryDate).toLocaleDateString() : '—'}</span>
          </div>
        </div>

        {(membership!.status === 'expired' || membership!.status === 'used') && (
          <div className="membership-renew-section">
            <div className="membership-renew-alert" role="alert">
              {membership!.status === 'expired' ? (
                <p className="membership-renew-title">This membership has expired.</p>
              ) : (
                <p className="membership-renew-title">This membership has been fully used.</p>
              )}
            </div>
            <form onSubmit={handleRenew} className="membership-renew-form">
              <h4 className="membership-renew-form-title">Renew membership</h4>
              <p className="membership-renew-form-desc">Set total credits for the renewal.</p>
              {error && <div className="auth-error">{error}</div>}
              <label>
                <span>Total credits</span>
                <input type="number" min={1} value={renewCredits} onChange={(e) => setRenewCredits(e.target.value)} placeholder={String(membership!.totalCredits)} required />
              </label>
              <button type="submit" className="auth-submit" disabled={renewing}>{renewing ? 'Renewing…' : 'Renew'}</button>
            </form>
          </div>
        )}

        {canUse && (
          <div className="membership-use-section">
            <form onSubmit={handleUse} className="membership-use-form">
              <h4 className="membership-use-title">Use credits</h4>
              {error && <div className="auth-error">{error}</div>}
              <label>
                <span>Branch (used at) <strong>*</strong></span>
                <select
                  value={usedAtBranchId}
                  onChange={(e) => setUsedAtBranchId(e.target.value)}
                  required
                  disabled={branchesLoading}
                  className="membership-use-branch-select"
                  aria-label="Branch where credits are used"
                >
                  <option value="">{branchesLoading ? 'Loading branches…' : 'Select branch'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Credits to use</span>
                <input type="number" min={1} max={remaining} value={useCredits} onChange={(e) => setUseCredits(Number(e.target.value))} />
              </label>
              <label>
                <span>Notes (optional)</span>
                <input type="text" value={useNotes} onChange={(e) => setUseNotes(e.target.value)} placeholder="Notes" />
              </label>
              <button type="submit" className="auth-submit" disabled={submitting}>{submitting ? 'Recording…' : 'Record usage'}</button>
            </form>
          </div>
        )}

        <section className="membership-usage-section">
          <h4 className="membership-usage-title">Usage history</h4>
          {usageHistory.length === 0 ? (
            <p className="membership-usage-empty text-muted">No usage recorded yet.</p>
          ) : (
            <div className="membership-usage-list">
              {usageHistory.map((u) => (
                <div key={u.id} className="membership-usage-item">
                  <div className="membership-usage-meta" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className="membership-usage-branch">{u.usedAtBranch}</span>
                      <span className="membership-usage-date">{new Date(u.usedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    {canDeleteRecordedSession && (
                      <button
                        type="button"
                        className="btn-reject"
                        style={{ flexShrink: 0 }}
                        aria-label="Delete this recorded session"
                        title="Delete session (admin only)"
                        onClick={() => setUsageDeleteId(u.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="membership-usage-body">
                    <span className="membership-usage-credits">{u.creditsUsed} credit{u.creditsUsed !== 1 ? 's' : ''} used</span>
                    {u.usedBy && <span className="membership-usage-by"> · {u.usedBy}</span>}
                    {u.serviceDetails && <p className="membership-usage-details">{u.serviceDetails}</p>}
                    {u.notes && <p className="membership-usage-notes text-muted">{u.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {usageDeleteId && canDeleteRecordedSession && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete session"
            onClick={() => !usageDeleting && setUsageDeleteId(null)}
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
            <div className="content-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440 }}>
              <h3 style={{ marginTop: 0 }}>Delete this recorded session?</h3>
              <p className="text-muted">
                This removes the usage entry, restores credits on the membership, and deletes any linked cross-branch settlement for that session. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="filter-btn" onClick={() => setUsageDeleteId(null)} disabled={usageDeleting}>
                  Cancel
                </button>
                <button type="button" className="btn-reject" onClick={() => void confirmDeleteUsage()} disabled={usageDeleting}>
                  {usageDeleting ? 'Deleting…' : 'Delete session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
