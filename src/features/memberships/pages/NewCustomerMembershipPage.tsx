import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createCustomer } from '../../../api/customers';
import { createMembership } from '../../../api/memberships';
import { getBranches } from '../../../api/branches';
import { getPackages } from '../../../api/packages';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useBranch } from '../../../hooks/useBranch';
import type { Branch } from '../../../types/crm';
import type { PackageItem } from '../../../api/packages';
import { initialNamePhoneFromUrl } from '../utils/matchCustomersBySearch';
import MembershipPackageCombobox from '../components/MembershipPackageCombobox';

export default function NewCustomerMembershipPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { branchId: vendorBranchId } = useBranch();
  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/vendor';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [name, setName] = useState(() => searchParams.get('name')?.trim() || '');
  const [phone, setPhone] = useState(() => searchParams.get('phone')?.trim() || '');
  const [email, setEmail] = useState('');
  /** Admin: one branch for both customer primary branch and membership “sold at”. */
  const [branchId, setBranchId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedPackage = useMemo(
    () => packages.find((p) => String(p.id) === String(packageId)),
    [packages, packageId]
  );

  useEffect(() => {
    getBranches({ all: true }).then((r) => r.success && r.branches && setBranches(r.branches || []));
    getPackages(false).then((r) => r.success && r.packages && setPackages(r.packages || []));
  }, []);

  useEffect(() => {
    const next = initialNamePhoneFromUrl(searchParams);
    setName(next.name);
    setPhone(next.phone);
  }, [searchParams]);

  useEffect(() => {
    if (packageId && selectedPackage) setPackagePrice(String(selectedPackage.price));
  }, [packageId, selectedPackage?.price]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const nameStr = name.trim();
    const phoneStr = phone.trim();
    if (!nameStr || !phoneStr) {
      setError('Name and phone are required.');
      return;
    }
    if (!packageId || !selectedPackage) {
      setError('Please select a package.');
      return;
    }
    const credits = selectedPackage.totalSessions ?? 1;
    const pkgPrice = packagePrice !== '' ? Number(packagePrice) : selectedPackage.price;
    if (Number.isNaN(pkgPrice) || pkgPrice < 0) {
      setError('Package price must be 0 or greater.');
      return;
    }
    if (isAdmin && !branchId) {
      setError('Branch is required (used for both the customer and where the membership was sold).');
      return;
    }

    setSubmitting(true);
    const custRes = await createCustomer({
      name: nameStr,
      phone: phoneStr.replace(/\s/g, ''),
      email: email.trim() || undefined,
      primaryBranchId: isAdmin ? branchId : undefined,
    });
    if (!custRes.success) {
      setSubmitting(false);
      setError((custRes as { message?: string }).message || 'Failed to create customer.');
      return;
    }
    const cr = custRes as { customer?: { id: string } };
    if (!cr.customer?.id) {
      setSubmitting(false);
      setError('Failed to create customer.');
      return;
    }
    const customerId = cr.customer.id;

    const memRes = await createMembership({
      customerId,
      totalCredits: credits,
      soldAtBranchId: isAdmin ? branchId : undefined,
      customerPackage: selectedPackage.name,
      customerPackagePrice: pkgPrice,
    });
    setSubmitting(false);
    if (memRes.success) {
      const mr = memRes as { membership?: { id: string } };
      if (mr.membership?.id) {
        navigate(`${basePath}/memberships/${mr.membership.id}`);
        return;
      }
    }
    setError((memRes as { message?: string }).message || 'Customer was created but membership failed. Add a membership from the Memberships page.');
  }

  return (
    <div className="dashboard-content">
      <header className="page-hero" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-hero-title">New customer + membership</h1>
          <p className="page-hero-subtitle">
            Create a customer record and sell their first membership in one step.
          </p>
        </div>
        <Link to={`${basePath}/memberships`} className="filter-btn" style={{ alignSelf: 'flex-start' }}>
          Back to memberships
        </Link>
      </header>

      <section className="content-card">
        <form onSubmit={handleSubmit} className="auth-form" style={{ maxWidth: 520 }}>
          {error && <div className="auth-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}

          <h2 className="page-section-title" style={{ fontSize: '1.1rem', marginTop: 0 }}>Customer</h2>
          <label>
            <span>Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="settings-input" required autoComplete="name" />
          </label>
          <label>
            <span>Phone *</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="settings-input" required autoComplete="tel" />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="settings-input" autoComplete="email" />
          </label>
          {isAdmin && (
            <label>
              <span>Branch *</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="settings-input" required>
                <option value="">— Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <span className="form-hint" style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.85rem', opacity: 0.9 }}>
                This branch is saved as the customer’s primary branch and as where the membership was sold.
              </span>
            </label>
          )}
          {!isAdmin && !vendorBranchId && (
            <p className="text-muted">You must be assigned to a branch to add customers. Contact your admin.</p>
          )}

          <hr style={{ margin: '1.25rem 0', border: 'none', borderTop: '1px solid var(--theme-border)' }} />

          <h2 className="page-section-title" style={{ fontSize: '1.1rem' }}>Membership</h2>
          <label>
            <span>Package *</span>
            <MembershipPackageCombobox
              packages={packages}
              packageId={packageId}
              onPackageIdChange={setPackageId}
              disabled={submitting}
              inputClassName="settings-input"
            />
          </label>
          <label>
            <span>Package price ($) *</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={packagePrice}
              onChange={(e) => setPackagePrice(e.target.value)}
              className="settings-input"
              required
            />
          </label>

          <button
            type="submit"
            className="auth-submit"
            style={{ marginTop: '1rem' }}
            disabled={submitting || (!isAdmin && !vendorBranchId)}
          >
            {submitting ? 'Saving…' : 'Create customer & membership'}
          </button>
        </form>
      </section>
    </div>
  );
}
