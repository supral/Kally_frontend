import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAuth } from '../../../auth/hooks/useAuth';
import { getVendors } from '../../../api/vendors';
import { getBranches } from '../../../api/branches';
import { getSalesDashboard, getOwnerOverview, getSettlements } from '../../../api/reports';
import { getSalesImages, getSalesImage, type SalesImageItem, type SalesImageDetail } from '../../../api/salesImages';
import type { SalesDashboard, OwnerOverviewBranch, Settlement } from '../../../types/crm';
import type { Branch } from '../../../types/crm';
import type { VendorListItem } from '../../../types/auth';
import { ROUTES } from '../../../config/constants';
import { formatCurrency } from '../../../utils/money';
import { formatNumber } from '../../../utils/money';
import { getActivityLog } from '../../../api/activityLog';
import type { ActivityLogItem } from '../../../api/activityLog';

type DatePreset = '7d' | '30d' | '90d' | 'custom';

function getDateRange(preset: DatePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === '7d') from.setDate(from.getDate() - 7);
  else if (preset === '30d') from.setDate(from.getDate() - 30);
  else if (preset === '90d') from.setDate(from.getDate() - 90);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const CHART_COLORS = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#14b8a6'];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [from, setFrom] = useState(() => getDateRange('30d').from);
  const [to, setTo] = useState(() => getDateRange('30d').to);
  const [branchId] = useState('');
  const [totalVendors, setTotalVendors] = useState<number | null>(null);
  const [totalBranches, setTotalBranches] = useState<number | null>(null);
  const [, setPendingVendors] = useState<number | null>(null);
  const [salesData, setSalesData] = useState<SalesDashboard | null>(null);
  const [overview, setOverview] = useState<OwnerOverviewBranch[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchSalesImages, setBranchSalesImages] = useState<SalesImageItem[]>([]);
  const [branchSalesLoading, setBranchSalesLoading] = useState(false);
  const [viewImageDetail, setViewImageDetail] = useState<SalesImageDetail | null>(null);
  const [viewImageIndex, setViewImageIndex] = useState(0);
  const [branchOverviewPage, setBranchOverviewPage] = useState(1);
  const [settlementsPage, setSettlementsPage] = useState(1);
  const [branchOverviewSearch, setBranchOverviewSearch] = useState('');
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [activityLogTotalPages, setActivityLogTotalPages] = useState(1);
  const [activityLogLoading, setActivityLogLoading] = useState(false);

  const loadSettlements = useCallback(() => {
    setSettlementsLoading(true);
    getSettlements().then((r) => {
      setSettlementsLoading(false);
      if (r.success && r.settlements) setSettlements(r.settlements);
    }).catch(() => setSettlementsLoading(false));
  }, []);

  const loadCounts = useCallback(() => {
    setLoading(true);
    Promise.all([
      getVendors(),
      getVendors('pending'),
      getBranches(),
    ]).then(([allRes, pendingRes, branchesRes]) => {
      setLoading(false);
      if (allRes.success && allRes.vendors != null) {
        setTotalVendors(allRes.vendors.length);
        setVendors(allRes.vendors);
      }
      if (pendingRes.success && pendingRes.vendors != null) setPendingVendors(pendingRes.vendors.length);
      if (branchesRes.success && branchesRes.branches != null) {
        setTotalBranches(branchesRes.branches.length);
        setBranches(branchesRes.branches);
      }
    }).catch(() => setLoading(false));
  }, []);

  const loadSales = useCallback(() => {
    setSalesLoading(true);
    setError('');
    getSalesDashboard({
      branchId: branchId || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }).then((r) => {
      setSalesLoading(false);
      if (r.success && r.data) setSalesData(r.data);
      else setError(r.message || 'Failed to load sales');
    });
  }, [branchId, from, to]);

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    getOwnerOverview().then((r) => {
      setOverviewLoading(false);
      if (r.success && r.overview) setOverview(r.overview);
    });
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    loadOverview();
    loadSettlements();
  }, [loadOverview, loadSettlements]);

  const loadBranchSales = useCallback(() => {
    setBranchSalesLoading(true);
    getSalesImages(selectedBranchId ? { branchId: selectedBranchId } : undefined)
      .then((r) => {
        setBranchSalesLoading(false);
        if (r.success && r.images) setBranchSalesImages(r.images);
        else setBranchSalesImages([]);
      })
      .catch(() => setBranchSalesLoading(false));
  }, [selectedBranchId]);

  const loadActivityLog = useCallback(() => {
    setActivityLogLoading(true);
    getActivityLog({ page: activityLogPage, limit: 10 }).then((r) => {
      setActivityLogLoading(false);
      if (r.success && r.activities != null) {
        setActivityLog(r.activities);
        setActivityLogTotalPages(r.totalPages ?? 1);
      }
    });
  }, [activityLogPage]);

  useEffect(() => {
    loadActivityLog();
  }, [loadActivityLog]);

  useEffect(() => {
    loadBranchSales();
  }, [loadBranchSales]);

  async function handleViewBranchReceipt(id: string) {
    const r = await getSalesImage(id);
    if (r.success && r.image) {
      setViewImageDetail(r.image);
      setViewImageIndex(0);
    }
  }

  function closeViewImage() {
    setViewImageDetail(null);
    setViewImageIndex(0);
  }

  const chartMembershipByBranch = overview.map((o) => ({ name: o.branchName, memberships: o.membershipsSold })).filter((d) => d.memberships > 0 || overview.length <= 10);
  const totalLeads = overview.reduce((s, o) => s + (o.leads ?? 0), 0);

  const salesByBranchPie = (salesData?.byBranch ?? [])
    .filter((b) => (b.revenue ?? b.sales ?? 0) > 0)
    .map((b) => ({ name: b.branch, value: b.revenue ?? b.sales ?? 0 }));
  const totalAppointments = overview.reduce((s, o) => s + (o.appointmentsThisMonth ?? 0), 0);
  const totalCompleted = overview.reduce((s, o) => s + (o.appointmentsCompleted ?? 0), 0);
  const totalBooked = overview.reduce((s, o) => s + (o.leadsBooked ?? 0), 0);
  const funnelData = [
    { stage: 'Leads', count: totalLeads, fill: '#6366f1' },
    { stage: 'Booked', count: totalBooked, fill: '#06b6d4' },
    { stage: 'Appointments', count: totalAppointments, fill: '#22c55e' },
    { stage: 'Completed', count: totalCompleted, fill: '#14b8a6' },
  ].filter((d) => d.count > 0 || totalLeads === 0);

  function handleDatePresetChange(preset: DatePreset) {
    setDatePreset(preset);
    const range = getDateRange(preset);
    setFrom(range.from);
    setTo(range.to);
  }

  const membershipGrowthData =
    salesData?.dailySales?.map((d) => ({
      date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      sales: d.sales,
    })) ?? [];

  const TABLE_PAGE_SIZE = 10;

  const salesByBranchMap = new Map<string, number>();
  (salesData?.byBranch ?? []).forEach((b) => {
    salesByBranchMap.set(b.branch, b.sales ?? 0);
  });
  const overviewWithSales = overview.map((o) => ({
    ...o,
    totalSales: salesByBranchMap.get(o.branchName) ?? 0,
  }));

  const branchOverviewSearchLower = branchOverviewSearch.trim().toLowerCase();
  const filteredOverviewWithSales = branchOverviewSearchLower
    ? overviewWithSales.filter((o) => o.branchName.toLowerCase().includes(branchOverviewSearchLower))
    : overviewWithSales;

  const branchOverviewTotalPages = Math.max(1, Math.ceil(filteredOverviewWithSales.length / TABLE_PAGE_SIZE));
  const branchOverviewCurrentPage = Math.min(Math.max(1, branchOverviewPage), branchOverviewTotalPages);
  const paginatedOverview = filteredOverviewWithSales.slice(
    (branchOverviewCurrentPage - 1) * TABLE_PAGE_SIZE,
    branchOverviewCurrentPage * TABLE_PAGE_SIZE
  );

  const settlementsTotalPages = Math.max(1, Math.ceil(settlements.length / TABLE_PAGE_SIZE));
  const settlementsCurrentPage = Math.min(Math.max(1, settlementsPage), settlementsTotalPages);
  const paginatedSettlements = settlements.slice(
    (settlementsCurrentPage - 1) * TABLE_PAGE_SIZE,
    settlementsCurrentPage * TABLE_PAGE_SIZE
  );

  const branchSalesTotalAmount = branchSalesImages.reduce(
    (sum, img) => sum + (img.salesAmount != null && img.salesAmount > 0 ? img.salesAmount : 0),
    0
  );

  return (
    <div className="dashboard-content admin-dashboard">
      <header className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-top">
          <div className="admin-dashboard-hero-inner">
            <h1 className="admin-dashboard-hero-title">Welcome back, {user?.name}</h1>
            <p className="admin-dashboard-hero-subtitle">Overview of vendors, branches, sales, and performance.</p>
          </div>
          <div className="admin-dashboard-hero-controls">
            <span className="admin-dashboard-hero-period-label">Period</span>
            <div className="admin-dashboard-hero-presets">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-dashboard-hero-preset-btn ${datePreset === p ? 'active' : ''}`}
                  onClick={() => handleDatePresetChange(p)}
                  aria-pressed={datePreset === p}
                >
                  {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </button>
              ))}
            </div>
            <span className="admin-dashboard-hero-daterange">
              {from && to ? `${new Date(from).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(to).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </span>
          </div>
        </div>
      </header>

      {error && <div className="auth-error admin-dashboard-error" role="alert">{error}</div>}

      {/* ========== GRAPHS AT TOP ========== */}
      <section className="admin-dashboard-section admin-dashboard-revenue-hero" aria-labelledby="admin-dashboard-revenue-title">
        <h2 id="admin-dashboard-revenue-title" className="admin-dashboard-section-title" style={{ marginBottom: '0.75rem' }}>Revenue overview</h2>
        <div className="admin-revenue-card">
          <div className="admin-revenue-card-main">
            <span className="admin-revenue-label">Total revenue (selected period)</span>
            <span className="admin-revenue-value">
              {salesLoading ? '…' : formatCurrency(salesData?.totalSales ?? salesData?.totalRevenue ?? 0)}
            </span>
            <span className="admin-revenue-sublabel">Includes membership revenue from memberships sold in this period.</span>
          </div>
          {membershipGrowthData.length > 0 && (
            <div className="admin-revenue-sparkline">
              <ResponsiveContainer width="100%" height={56}>
                <AreaChart data={membershipGrowthData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-link)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--theme-link)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="sales" stroke="var(--theme-link)" strokeWidth={1.5} fill="url(#adminRevenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="admin-dashboard-section admin-dashboard-section-charts" aria-labelledby="admin-dashboard-analytics-title">
      <h2 id="admin-dashboard-analytics-title" className="admin-dashboard-section-title">Analytics</h2>
      <div className="admin-dashboard-charts">
        <section className="content-card admin-chart-card admin-chart-card-full">
          <h3>Memberships by branch</h3>
          {overviewLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : chartMembershipByBranch.length > 0 ? (
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartMembershipByBranch} margin={{ top: 12, right: 12, left: 12, bottom: 60 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                  <XAxis type="number" tick={{ fill: 'var(--theme-text)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--theme-text)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--theme-bg-card)', border: '1px solid var(--theme-border)', borderRadius: 8 }}
                    formatter={(value) => [formatNumber(Number(value) || 0), 'Memberships']}
                    labelFormatter={(label) => `Branch: ${label}`}
                  />
                  <Bar dataKey="memberships" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Memberships sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="admin-chart-empty">No membership data by branch.</p>
          )}
        </section>
        <section className="content-card admin-chart-card admin-chart-card-full">
          <h3>Revenue by branch</h3>
          {salesLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : salesByBranchPie.length > 0 ? (
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={salesByBranchPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {salesByBranchPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--theme-bg-card)', border: '1px solid var(--theme-border)', borderRadius: 8 }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="admin-chart-empty">No revenue data by branch for this period.</p>
          )}
        </section>
      </div>
      <div className="admin-dashboard-charts">
        <section className="content-card admin-chart-card admin-chart-card-full">
          <h3>Membership revenue trend</h3>
          {salesLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : membershipGrowthData.length > 0 ? (
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={membershipGrowthData} margin={{ top: 12, right: 24, left: 12, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--theme-text)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--theme-text)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--theme-bg-card)', border: '1px solid var(--theme-border)', borderRadius: 8 }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  />
                  <Line type="monotone" dataKey="sales" stroke="var(--theme-link)" strokeWidth={2} dot={false} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="admin-chart-empty">No revenue data for this period.</p>
          )}
        </section>
        <section className="content-card admin-chart-card admin-chart-card-full">
          <h3>Leads &amp; appointments funnel</h3>
          {overviewLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : funnelData.length > 0 ? (
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} margin={{ top: 12, right: 24, left: 12, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" />
                  <XAxis dataKey="stage" tick={{ fill: 'var(--theme-text)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--theme-text)', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--theme-bg-card)', border: '1px solid var(--theme-border)', borderRadius: 8 }}
                    formatter={(value) => [formatNumber(Number(value) || 0), 'Count']}
                  />
                  <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={funnelData[i].fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="admin-chart-empty">No leads or appointments data yet.</p>
          )}
        </section>
      </div>
      </section>

      {/* ========== OTHER INFO BELOW GRAPHS ========== */}
      <div className="admin-dashboard-sections">
      <section className="admin-dashboard-section admin-dashboard-section-kpis" aria-labelledby="admin-dashboard-kpis-title">
      <h2 id="admin-dashboard-kpis-title" className="admin-dashboard-section-title">Key metrics</h2>
      <div className="admin-dashboard-kpis stats-grid">
        <div className="stat-card admin-kpi">
          <span className="stat-value">{loading ? '…' : formatNumber(totalVendors ?? 0)}</span>
          <span className="stat-label">Total vendors</span>
          <Link to={ROUTES.admin.vendors} className="stat-link">View →</Link>
        </div>
        <div className="stat-card admin-kpi">
          <span className="stat-value">{loading ? '…' : formatNumber(totalBranches ?? 0)}</span>
          <span className="stat-label">Active branches</span>
          <Link to={ROUTES.admin.branches} className="stat-link">View →</Link>
        </div>
        <div className="stat-card admin-kpi admin-kpi-highlight">
          <span className="stat-value">{salesLoading ? '…' : formatCurrency(salesData?.totalSales ?? salesData?.totalRevenue ?? 0)}</span>
          <span className="stat-label">Total sales</span>
          <Link to={ROUTES.admin.sales} className="stat-link">Details →</Link>
        </div>
        <div className="stat-card admin-kpi">
          <span className="stat-value">{salesLoading ? '…' : formatCurrency(salesData?.totalSales ?? salesData?.totalRevenue ?? 0)}</span>
          <span className="stat-label">Membership revenue</span>
          <span className="stat-sublabel">From memberships sold in period</span>
        </div>
        <div className="stat-card admin-kpi">
          <span className="stat-value">{salesLoading ? '…' : formatNumber(salesData?.activeMembershipCount ?? salesData?.totalMemberships ?? 0)}</span>
          <span className="stat-label">Active memberships</span>
          <Link to={ROUTES.admin.memberships} className="stat-link">View →</Link>
        </div>
        <div className="stat-card admin-kpi">
          <span className="stat-value">{overviewLoading ? '…' : formatNumber(totalLeads)}</span>
          <span className="stat-label">Total leads</span>
          <Link to={ROUTES.admin.leads} className="stat-link">Leads inbox →</Link>
        </div>
        <div className="stat-card admin-kpi">
          <span className="stat-value">{overviewLoading ? '…' : formatNumber(totalCompleted)}</span>
          <span className="stat-label">Appointments completed</span>
          <Link to={ROUTES.admin.appointments} className="stat-link">View →</Link>
        </div>
      </div>
      </section>

      <section className="admin-dashboard-section" aria-labelledby="admin-dashboard-activity-title">
        <div className="admin-table-header" style={{ marginBottom: '0.5rem' }}>
          <h2 id="admin-dashboard-activity-title" className="admin-dashboard-section-title">Recent activity</h2>
          <Link to={ROUTES.admin.activityLog} className="stat-link">View all →</Link>
        </div>
        <div className="content-card admin-table-card">
          <div className="admin-table-card-body">
            {activityLogLoading ? (
              <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
            ) : activityLog.length === 0 ? (
              <p className="admin-chart-empty">No recent activity.</p>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Activity</th>
                        <th>Date & time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLog.map((a) => (
                        <tr key={a.id}>
                          <td>{a.user?.name ?? '—'}</td>
                          <td>{a.description}</td>
                          <td>{new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activityLogTotalPages > 1 && (
                  <div className="customers-pagination" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setActivityLogPage((p) => Math.max(1, p - 1))}
                      disabled={activityLogPage <= 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">Page {activityLogPage} of {activityLogTotalPages}</span>
                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setActivityLogPage((p) => Math.min(activityLogTotalPages, p + 1))}
                      disabled={activityLogPage >= activityLogTotalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="admin-dashboard-section admin-dashboard-section-tables" aria-labelledby="admin-dashboard-branch-settlements-title">
      <h2 id="admin-dashboard-branch-settlements-title" className="admin-dashboard-section-title">Branch &amp; settlements</h2>
      <div className="admin-dashboard-tables">
        <section className="content-card admin-table-card admin-branch-perf-card">
          <div className="admin-table-header">
            <h3>Branch performance</h3>
            <div className="admin-table-header-actions">
              <input
                type="text"
                value={branchOverviewSearch}
                onChange={(e) => { setBranchOverviewSearch(e.target.value); setBranchOverviewPage(1); }}
                placeholder="Search branches…"
                className="settings-input"
                style={{ maxWidth: 220 }}
                aria-label="Search branches"
              />
              <button type="button" className="admin-table-refresh" onClick={loadOverview}>↻</button>
            </div>
          </div>
          <div className="admin-table-card-body">
          {overviewLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : overview.length > 0 ? (
            <>
              <div className="admin-dashboard-mobile-cards admin-branch-perf-mobile">
                {paginatedOverview.map((row) => (
                  <div key={row.branchId} className="admin-dashboard-mobile-card">
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Branch</span>
                      <span className="admin-dashboard-mobile-value"><strong>{row.branchName}</strong></span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Memberships sold</span>
                      <span className="admin-dashboard-mobile-value">{formatNumber(row.membershipsSold)}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Total sales (period)</span>
                      <span className="admin-dashboard-mobile-value">{formatCurrency(row.totalSales ?? 0)}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Leads / Booked / Appointments / Completed</span>
                      <span className="admin-dashboard-mobile-value">{formatNumber(row.leads)} / {formatNumber(row.leadsBooked)} / {formatNumber(row.appointmentsThisMonth)} / {formatNumber(row.appointmentsCompleted)}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-actions">
                      <Link to={ROUTES.admin.branches} className="branch-action-btn branch-action-view">Manage →</Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap admin-branch-perf-table-wrap">
                    <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Memberships sold</th>
                      <th>Total sales (period)</th>
                      <th>Leads</th>
                      <th>Booked</th>
                      <th>Appointments</th>
                      <th>Completed</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOverview.map((row) => (
                      <tr key={row.branchId}>
                        <td><strong>{row.branchName}</strong></td>
                        <td>{formatNumber(row.membershipsSold)}</td>
                        <td>{formatCurrency(row.totalSales ?? 0)}</td>
                        <td>{formatNumber(row.leads)}</td>
                        <td>{formatNumber(row.leadsBooked)}</td>
                        <td>{formatNumber(row.appointmentsThisMonth)}</td>
                        <td>{formatNumber(row.appointmentsCompleted)}</td>
                        <td className="branch-actions">
                          <Link to={ROUTES.admin.branches} className="branch-action-btn branch-action-view">Manage →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {branchOverviewTotalPages > 1 && (
                <div className="customers-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setBranchOverviewPage((p) => Math.max(1, p - 1))}
                    disabled={branchOverviewCurrentPage <= 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {branchOverviewCurrentPage} of {branchOverviewTotalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setBranchOverviewPage((p) => Math.min(branchOverviewTotalPages, p + 1))}
                    disabled={branchOverviewCurrentPage >= branchOverviewTotalPages}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="admin-chart-empty">No branch overview data.</p>
          )}
          </div>
        </section>
        <section className="content-card admin-table-card admin-settlements-card">
          <div className="admin-table-header">
            <h3>Recent settlements</h3>
            <div className="admin-table-header-actions">
              <button type="button" className="admin-table-refresh" onClick={loadSettlements} aria-label="Refresh settlements">↻</button>
              <Link to={ROUTES.admin.settlements} className="stat-link">View all →</Link>
            </div>
          </div>
          <div className="admin-table-card-body">
          {settlementsLoading && !settlements.length ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : settlements.length > 0 ? (
            <>
              <div className="admin-dashboard-mobile-cards admin-settlements-mobile">
                {paginatedSettlements.map((s) => (
                  <div key={s.id} className="admin-dashboard-mobile-card">
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">From → To</span>
                      <span className="admin-dashboard-mobile-value">{s.fromBranch} → {s.toBranch}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Amount</span>
                      <span className="admin-dashboard-mobile-value">{formatCurrency(s.amount)}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Status</span>
                      <span className="admin-dashboard-mobile-value"><span className={`settlement-status settlement-status-${s.status?.toLowerCase()}`}>{s.status}</span></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap admin-settlements-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>From → To</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSettlements.map((s) => (
                      <tr key={s.id}>
                        <td>{s.fromBranch} → {s.toBranch}</td>
                        <td>{formatCurrency(s.amount)}</td>
                        <td><span className={`settlement-status settlement-status-${s.status?.toLowerCase()}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {settlementsTotalPages > 1 && (
                <div className="customers-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setSettlementsPage((p) => Math.max(1, p - 1))}
                    disabled={settlementsCurrentPage <= 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {settlementsCurrentPage} of {settlementsTotalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setSettlementsPage((p) => Math.min(settlementsTotalPages, p + 1))}
                    disabled={settlementsCurrentPage >= settlementsTotalPages}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="admin-chart-empty">No settlements yet. Settlements appear when branches use memberships sold by another branch.</p>
          )}
          </div>
        </section>
        <section className="content-card admin-table-card admin-branch-sales-card">
          <div className="admin-table-header">
            <h3>Branch Sales Data</h3>
            <div className="admin-branch-sales-header">
              <label htmlFor="admin-dashboard-branch-select" className="admin-branch-sales-label">Branch filter</label>
              <select
                id="admin-dashboard-branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="admin-branch-sales-select"
                aria-label="Select a branch"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {selectedBranchId && (
                <button type="button" className="admin-table-refresh" onClick={loadBranchSales} aria-label="Refresh">↻</button>
              )}
            </div>
          </div>
          <div className="admin-table-card-body">
          {branchSalesLoading ? (
            <div className="admin-chart-loading"><div className="spinner" /><span>Loading...</span></div>
          ) : branchSalesImages.length === 0 ? (
            <p className="admin-chart-empty">No Sales Data for this branch.</p>
          ) : (
            <>
              <p className="customers-showing-count text-muted">
                Total amount{selectedBranchId ? ` for this branch` : ''}: <strong>{formatCurrency(branchSalesTotalAmount)}</strong>
              </p>
              <div className="admin-dashboard-mobile-cards admin-branch-sales-mobile">
                {branchSalesImages.map((img) => (
                  <div
                    key={img.id}
                    className="admin-dashboard-mobile-card admin-dashboard-mobile-card-clickable"
                    onClick={() => handleViewBranchReceipt(img.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleViewBranchReceipt(img.id)}
                  >
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Title</span>
                      <span className="admin-dashboard-mobile-value"><strong>{img.title}</strong></span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Date</span>
                      <span className="admin-dashboard-mobile-value">{new Date(img.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-row">
                      <span className="admin-dashboard-mobile-label">Sales count / Amount</span>
                      <span className="admin-dashboard-mobile-value">{img.manualSalesCount ?? img.salesCount} / {(img.salesAmount != null && img.salesAmount > 0) ? formatCurrency(img.salesAmount) : '—'}</span>
                    </div>
                    <div className="admin-dashboard-mobile-card-actions">
                      <span className="branch-action-btn branch-action-view">View receipt →</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap admin-branch-sales-table-wrap">
                <table className="admin-table admin-table-clickable">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Sales count</th>
                      <th>Amount</th>
                      <th className="th-actions">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchSalesImages.map((img) => (
                      <tr
                        key={img.id}
                        onClick={() => handleViewBranchReceipt(img.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleViewBranchReceipt(img.id)}
                      >
                        <td><strong>{img.title}</strong></td>
                        <td>{new Date(img.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{img.manualSalesCount ?? img.salesCount}</td>
                        <td>{(img.salesAmount != null && img.salesAmount > 0) ? formatCurrency(img.salesAmount) : '—'}</td>
                        <td className="branch-actions">
                          <span className="branch-action-btn branch-action-view">View receipt →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          </div>
        </section>
      </div>
      </section>

      {viewImageDetail && (
        <div
          className="sales-images-modal-overlay"
          onClick={closeViewImage}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && closeViewImage()}
        >
          <div className="sales-images-modal sales-images-modal-with-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sales-images-modal-main">
              {viewImageDetail.imageBase64s && viewImageDetail.imageBase64s.length > 0 ? (
                <>
                  <img
                    src={viewImageDetail.imageBase64s[viewImageIndex]?.startsWith('data:') ? viewImageDetail.imageBase64s[viewImageIndex] : `data:image/jpeg;base64,${viewImageDetail.imageBase64s[viewImageIndex]}`}
                    alt={`Sales receipt ${viewImageIndex + 1} of ${viewImageDetail.imageBase64s.length}`}
                    className="sales-images-modal-img"
                  />
                  {viewImageDetail.imageBase64s.length > 1 && (
                    <div className="sales-images-modal-nav">
                      <button
                        type="button"
                        className="sales-images-modal-nav-btn"
                        onClick={(e) => { e.stopPropagation(); setViewImageIndex((i) => Math.max(0, i - 1)); }}
                        disabled={viewImageIndex <= 0}
                        aria-label="Previous image"
                      >
                        ‹
                      </button>
                      <span className="sales-images-modal-nav-label">
                        {viewImageIndex + 1} / {viewImageDetail.imageBase64s.length}
                      </span>
                      <button
                        type="button"
                        className="sales-images-modal-nav-btn"
                        onClick={(e) => { e.stopPropagation(); setViewImageIndex((i) => Math.min(viewImageDetail.imageBase64s.length - 1, i + 1)); }}
                        disabled={viewImageIndex >= viewImageDetail.imageBase64s.length - 1}
                        aria-label="Next image"
                      >
                        ›
                      </button>
                    </div>
                  )}
                  {viewImageDetail.imageBase64s.length > 1 && (
                    <div className="sales-images-modal-thumbs">
                      {viewImageDetail.imageBase64s.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`sales-images-modal-thumb ${viewImageIndex === idx ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setViewImageIndex(idx); }}
                          aria-label={`View image ${idx + 1}`}
                        >
                          <img src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`} alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="sales-images-modal-no-img">No images</div>
              )}
            </div>
            <aside className="sales-images-modal-sidebar">
              <div className="sales-images-sidebar-header">
                <h3 className="sales-images-sidebar-title">{viewImageDetail.title}</h3>
                <span className="sales-images-sidebar-date">
                  {new Date(viewImageDetail.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="sales-images-sidebar-badge">{viewImageDetail.branchName}</span>
              </div>
              {(viewImageDetail.description != null && viewImageDetail.description !== '') && (
                <p className="sales-images-sidebar-desc">{viewImageDetail.description}</p>
              )}
              <div className="sales-images-sidebar-stats">
                <div className="sales-images-sidebar-stat">
                  <span className="sales-images-sidebar-count">{viewImageDetail.salesCount}</span>
                  <span className="sales-images-sidebar-count-label">sales {viewImageDetail.manualSalesCount != null ? '(manual)' : ''}</span>
                </div>
                {(viewImageDetail.salesAmount != null && viewImageDetail.salesAmount > 0) && (
                  <div className="sales-images-sidebar-stat">
                    <span className="sales-images-sidebar-count">{formatCurrency(viewImageDetail.salesAmount)}</span>
                    <span className="sales-images-sidebar-count-label">sales amount</span>
                  </div>
                )}
              </div>
            </aside>
            <button type="button" className="sales-images-modal-close" onClick={closeViewImage} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
