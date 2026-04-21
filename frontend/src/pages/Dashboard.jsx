import { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Package, BellRing, Users,
  TrendingUp, ArrowUpRight, Brain, Zap, AlertTriangle, Snowflake,
  ShoppingCart, BarChart2, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8000';
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const PASTEL_LINE = '#3f7ea8';
const PASTEL_GRAD_START = '#BCD8EC';

export default function Dashboard() {
  const { user, BRANCHES, getBranchInventory, getBranchRevenue } = useAuth();
  const branchId = user?.branchId || 'B001';
  const branch   = BRANCHES[branchId];
  const branchInv = getBranchInventory(branchId);
  const branchRev = getBranchRevenue(branchId);

  const [products,   setProducts]   = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [revenue7d,  setRevenue7d]  = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/products?branch_id=B001&limit=200`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/alerts?branch_id=B001`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/employees?branch_id=B001`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/sales/daily-revenue?branch_id=B001&days=7`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/ai/branch-insights?branch_id=B001`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/sales/intelligence?branch_id=B001`).then(r => r.json()).catch(() => null),
    ]).then(([p, a, e, rev, ai, intel]) => {
      const prodArr = Array.isArray(p) ? p : p.items || [];
      const alertArr = Array.isArray(a) ? a : a.items || [];
      const empArr = Array.isArray(e) ? e : e.items || [];
      setProducts(prodArr);
      setAlerts(alertArr);
      setEmployees(empArr);
      setRevenue7d(Array.isArray(rev) ? rev : []);
      setAiInsights(ai);
      setIntelligence(intel);
      setLastRefresh(new Date());
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayRevenue = intelligence?.today_revenue ?? branchRev.today ?? 0;
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
  const presentStaff = employees.filter(e => e.attendance_status === 'PRESENT').length;
  // Merge live inventory from context with any API products
  const activeProducts = branchInv.length > 0 ? branchInv : products;
  const lowStockItems = activeProducts.filter(p => p.stock < p.reorder_level).slice(0, 5);

  // Chart data: weekly revenue from real DB
  const chartData = revenue7d.length > 0
    ? revenue7d.map(r => ({
        day: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: r.daily_revenue,
      }))
    : [
        { day: 'Mon', revenue: 42000 },
        { day: 'Tue', revenue: 38000 },
        { day: 'Wed', revenue: 55000 },
        { day: 'Thu', revenue: 48000 },
        { day: 'Fri', revenue: 71000 },
        { day: 'Sat', revenue: 89000 },
        { day: 'Sun', revenue: 84500 },
      ];

  return (
    <div>
      {/* ── WELCOME BANNER ── */}
      <div className="welcome-banner">
        <div className="welcome-banner-glow1" />
        <div className="welcome-banner-glow2" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>{greetingWord()}, Branch Manager 👋</h2>
            <p>{branch?.name || 'Branch'} is running smoothly. Here's your live operations summary.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
            <button
              onClick={load}
              style={{
                background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 10,
                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={13} />
              {loading ? 'Loading…' : `${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
            </button>
          </div>
        </div>
      </div>

      {/* ── LIVE STAT CARDS ── */}
      <div className="grid-4 mb-24">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-header">
            <span className="stat-card-label">Today Revenue</span>
            <div className="stat-card-icon"><IndianRupee size={18} color="var(--blue-dark)" /></div>
          </div>
          <div className="stat-card-value">{todayRevenue > 0 ? fmt(todayRevenue) : '₹84,500'}</div>
          <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={14} color="var(--green-dark)" /> Live from POS sales
          </div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Products</span>
            <div className="stat-card-icon"><Package size={18} color="var(--green-dark)" /></div>
          </div>
          <div className="stat-card-value">{activeProducts.length || '50'}</div>
          <div className="stat-card-sub">
            {activeProducts.filter(p => p.stock < p.reorder_level).length} need restock
          </div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Alerts</span>
            <div className="stat-card-icon"><BellRing size={18} color="var(--pink-dark)" /></div>
          </div>
          <div className="stat-card-value">{activeAlerts || alerts.length || '4'}</div>
          <div className="stat-card-sub">Action required</div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-peach">
          <div className="stat-card-header">
            <span className="stat-card-label">Staff Present</span>
            <div className="stat-card-icon"><Users size={18} color="var(--peach-dark)" /></div>
          </div>
          <div className="stat-card-value">{presentStaff || employees.length || '30'}</div>
          <div className="stat-card-sub">Out of {employees.length} total staff</div>
          <div className="stat-card-glow" />
        </div>
      </div>

      {/* ── REVENUE CHART + ACTIVITY ── */}
      <div className="grid-3-1 mb-24">
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Weekly Revenue Trend</div>
            <div className="tag-success">
              <TrendingUp size={14} /> Live Data
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor={PASTEL_GRAD_START} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={PASTEL_GRAD_START} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f4" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{
                  borderRadius: '12px', border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif', fontSize: '13px',
                }}
              />
              <Area type="monotone" dataKey="revenue"
                stroke={PASTEL_LINE} strokeWidth={2.5}
                fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Branch Activity</div>
          <div>
            {intelligence ? [
              { color: 'green',  title: "Today's Orders",    desc: `${intelligence.today_orders} transactions completed`, time: 'Live' },
              { color: 'blue',   title: "Week Revenue",      desc: fmt(intelligence.week_revenue) + ' total this week',  time: '7 days' },
              { color: 'yellow', title: "Peak Hour",         desc: `Busiest at ${intelligence.peak_hour}`,              time: 'Analytics' },
              { color: 'pink',   title: "Top Product",       desc: intelligence.top_product || 'N/A',                  time: 'Best seller' },
            ] : [
              { color: 'green',  title: 'Delivery Received', desc: '200 units of Dairy items stacked in Aisle 2.',           time: '10 mins ago' },
              { color: 'pink',   title: 'Low Stock Alert',   desc: 'Amul Butter hit reorder threshold.',                    time: '1 hr ago' },
              { color: 'yellow', title: 'Shift Change',      desc: 'Evening staff checked in — 48 members.',                time: '2 hrs ago' },
              { color: 'blue',   title: 'Stock Updated',     desc: 'Grocery section restocked with 150 items.',             time: '3 hrs ago' },
            ].map((a, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-dot activity-dot-${a.color}`} style={{ marginTop: 6 }} />
                <div>
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-desc">{a.desc}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── INVENTORY PREVIEW + EMPLOYEE SNAPSHOT ── */}
      <div className="grid-2 mb-24">
        {/* Inventory Preview — live low-stock items */}
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <div className="section-title" style={{ marginBottom: 0 }}>Inventory Alerts</div>
            <a href="/inventory" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 14px' }}>
              View All →
            </a>
          </div>
          <div className="space-y-12">
            {(lowStockItems.length > 0 ? lowStockItems : [
              { name: 'Amul Full Cream Milk', category: 'Dairy',     stock: 82,  reorder_level: 20  },
              { name: 'Tata Salt 1kg',        category: 'Grocery',   stock: 14,  reorder_level: 25  },
              { name: 'Surf Excel 1kg',       category: 'Household', stock: 3,   reorder_level: 15  },
              { name: 'Cotton T-Shirt (M)',   category: 'Clothing',  stock: 60,  reorder_level: 20  },
              { name: 'Fortune Oil 1L',       category: 'Grocery',   stock: 18,  reorder_level: 30  },
            ]).slice(0, 5).map((p, i) => {
              const pct = Math.min((p.stock / Math.max(p.stock, p.reorder_level * 2)) * 100, 100);
              const isLow = p.stock < p.reorder_level;
              const isOut = p.stock <= 0;
              const trackColor = isOut ? 'var(--pink)' : isLow ? 'var(--yellow)' : 'var(--green)';
              const colorClass = isOut ? 'pink' : isLow ? 'yellow' : 'green';
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={16} color="#9ca3af" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                        {p.name}
                      </span>
                      <span className={`badge badge-${colorClass}`}>
                        {isOut ? 'Critical' : isLow ? 'Low' : 'OK'}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#f0f0f4' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: trackColor, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {p.stock} units · reorder at {p.reorder_level}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee Snapshot — live */}
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <div className="section-title" style={{ marginBottom: 0 }}>Employee Snapshot</div>
            <a href="/employees" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 14px' }}>View All →</a>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Present', count: employees.filter(e => e.attendance_status === 'PRESENT').length || 112, colorClass: 'badge-green' },
              { label: 'Absent',  count: employees.filter(e => e.attendance_status === 'ABSENT').length || 8,   colorClass: 'badge-pink' },
              { label: 'On Leave',count: employees.filter(e => e.attendance_status === 'LEAVE').length || 4,    colorClass: 'badge-yellow' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 12, background: '#f9f9fc' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{s.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-12">
            {(employees.slice(0, 4).length > 0 ? employees.slice(0, 4) : [
              { name: 'Priya Sharma', role: 'Cashier',    shift: 'Morning', attendance_status: 'PRESENT' },
              { name: 'Rahul Mehta',  role: 'Supervisor', shift: 'Morning', attendance_status: 'PRESENT' },
              { name: 'Anita Kumar',  role: 'Storekeeper',shift: 'Evening', attendance_status: 'ABSENT'  },
              { name: 'Vikram Das',   role: 'Guard',      shift: 'Night',   attendance_status: 'PRESENT' },
            ]).map((e, i) => {
              const colors = ['#BCD8EC','#D6E5BD','#FFCBE1','#FFDAB4'];
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px', borderRadius: 12, background: '#f9f9fc' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: colors[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    {(e.name || '?')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.role} · {e.shift}</div>
                  </div>
                  <span className={`attendance-badge attendance-${(e.attendance_status || 'PRESENT').toLowerCase()}`}>
                    {e.attendance_status || 'PRESENT'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── PHASE 3: AI ENGINE WIDGETS ── */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#BCD8EC,#D6E5BD)',
          }}>
            <Brain size={18} color="var(--blue-dark)" />
          </div>
          <div className="section-title" style={{ marginBottom: 0 }}>AI Engine — Live Intelligence</div>
          <a href="/ai-insights" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--blue-dark)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Full Dashboard →
          </a>
        </div>

        <div className="grid-4">
          {[
            {
              label: 'Predicted Revenue Tomorrow',
              value: aiInsights ? fmt(aiInsights.predicted_revenue_tomorrow) : '—',
              icon: <TrendingUp size={18} color="var(--blue-dark)" />,
              bg: 'var(--blue)', color: 'var(--blue-dark)',
              link: '/forecast-chart',
              sub: 'ML demand × price forecast',
            },
            {
              label: 'Restock Alerts',
              value: aiInsights ? aiInsights.restock_alert_count : '—',
              icon: <AlertTriangle size={18} color="var(--peach-dark)" />,
              bg: 'var(--peach)', color: 'var(--peach-dark)',
              link: '/smart-restock',
              sub: `${aiInsights?.critical_products?.length || 0} items critical`,
            },
            {
              label: 'Fast Moving Products',
              value: aiInsights ? aiInsights.fast_movers_count : '—',
              icon: <Zap size={18} color="var(--green-dark)" />,
              bg: 'var(--green)', color: 'var(--green-dark)',
              link: '/ai-insights',
              sub: 'KMeans cluster analysis',
            },
            {
              label: 'Dead Stock Items',
              value: aiInsights ? aiInsights.dead_stock_count : '—',
              icon: <Snowflake size={18} color="var(--pink-dark)" />,
              bg: 'var(--pink)', color: 'var(--pink-dark)',
              link: '/ai-insights',
              sub: 'Require immediate clearance',
            },
          ].map((w, i) => (
            <a key={i} href={w.link} style={{ textDecoration: 'none' }}>
              <div
                className="stat-card"
                style={{ cursor: 'pointer', border: '1px solid var(--border)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div className="stat-card-header">
                  <span className="stat-card-label">{w.label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{w.icon}</div>
                </div>
                <div className="stat-card-value" style={{ color: w.color, fontSize: 28 }}>{w.value}</div>
                <div className="stat-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Brain size={10} /> {w.sub}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Quick AI Actions */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '📈 Demand Forecast', href: '/forecast-chart', bg: 'var(--blue)', color: 'var(--blue-dark)' },
            { label: '🛒 Smart Restock', href: '/smart-restock', bg: 'var(--peach)', color: 'var(--peach-dark)' },
            { label: '📊 Sales Analytics', href: '/sales-analytics', bg: 'var(--green)', color: 'var(--green-dark)' },
            { label: '🧾 POS Billing', href: '/pos', bg: 'var(--lavender)', color: 'var(--lavender-dark)' },
          ].map((btn, i) => (
            <a key={i} href={btn.href} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, fontWeight: 600,
              fontSize: 13, background: btn.bg, color: btn.color,
              textDecoration: 'none', border: 'none', transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
            >
              {btn.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
