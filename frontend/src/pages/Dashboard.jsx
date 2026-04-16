import { useState, useEffect } from 'react';
import { IndianRupee, Package, BellRing, Users, TrendingUp, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const weeklyData = [
  { day: 'Mon', revenue: 42000 },
  { day: 'Tue', revenue: 38000 },
  { day: 'Wed', revenue: 55000 },
  { day: 'Thu', revenue: 48000 },
  { day: 'Fri', revenue: 71000 },
  { day: 'Sat', revenue: 89000 },
  { day: 'Sun', revenue: 84500 },
];

const categoryData = [
  { name: 'Grocery', value: 38 },
  { name: 'Dairy',   value: 24 },
  { name: 'Clothing', value: 18 },
  { name: 'Household', value: 20 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, alerts: 0, employees: 0 });

  useEffect(() => {
    Promise.all([
      axios.get('http://localhost:8000/api/products').catch(() => ({ data: [] })),
      axios.get('http://localhost:8000/api/alerts').catch(() => ({ data: [] })),
      axios.get('http://localhost:8000/api/employees').catch(() => ({ data: [] })),
    ]).then(([p, a, e]) =>
      setStats({ products: p.data.length, alerts: a.data.length, employees: e.data.length })
    );
  }, []);

  return (
    <div>
      {/* WELCOME BANNER */}
      <div className="welcome-banner">
        <div className="welcome-banner-glow1" />
        <div className="welcome-banner-glow2" />
        <h2>Good evening, Branch Manager 👋</h2>
        <p>DMart Whitefield is running smoothly. Here's your daily operations summary.</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid-4 mb-24">
        <div className="stat-card stat-card-blue">
          <div className="stat-card-header">
            <span className="stat-card-label">Today Revenue</span>
            <div className="stat-card-icon"><IndianRupee size={18} color="var(--blue-dark)" /></div>
          </div>
          <div className="stat-card-value">₹84,500</div>
          <div className="stat-card-sub flex items-center gap-4" style={{ gap: '6px' }}>
            <ArrowUpRight size={14} color="var(--green-dark)" />
            +14% from yesterday
          </div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-green">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Inventory</span>
            <div className="stat-card-icon"><Package size={18} color="var(--green-dark)" /></div>
          </div>
          <div className="stat-card-value">{stats.products || '267'}</div>
          <div className="stat-card-sub">Products in stock</div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-card-header">
            <span className="stat-card-label">Critical Alerts</span>
            <div className="stat-card-icon"><BellRing size={18} color="var(--pink-dark)" /></div>
          </div>
          <div className="stat-card-value">{stats.alerts || '4'}</div>
          <div className="stat-card-sub">Action required</div>
          <div className="stat-card-glow" />
        </div>

        <div className="stat-card stat-card-peach">
          <div className="stat-card-header">
            <span className="stat-card-label">Staff Present</span>
            <div className="stat-card-icon"><Users size={18} color="var(--peach-dark)" /></div>
          </div>
          <div className="stat-card-value">{stats.employees || '124'}</div>
          <div className="stat-card-sub">Morning Shift Active</div>
          <div className="stat-card-glow" />
        </div>
      </div>

      {/* CHART + ACTIVITY */}
      <div className="grid-3-1 mb-24">
        <div className="card">
          <div className="chart-header">
            <div className="chart-title">Weekly Revenue Trend</div>
            <div className="tag-success">
              <TrendingUp size={14} />
              Steady Growth
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#BCD8EC" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#BCD8EC" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3f7ea8" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Branch Activity</div>
          <div>
            {[
              { color: 'green', title: 'Delivery Received', desc: '200 units of Dairy items stacked in Aisle 2.', time: '10 mins ago' },
              { color: 'pink',  title: 'Low Stock Alert',   desc: 'Amul Butter hit reorder threshold.', time: '1 hr ago' },
              { color: 'yellow', title: 'Shift Change',     desc: 'Evening staff checked in — 48 members.', time: '2 hrs ago' },
              { color: 'blue',  title: 'Stock Updated',     desc: 'Grocery section restocked with 150 items.', time: '3 hrs ago' },
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

      {/* BOTTOM ROW: Inventory Preview + Employee Snapshot */}
      <div className="grid-2">
        {/* Inventory Preview */}
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <div className="section-title" style={{ marginBottom: 0 }}>Inventory Preview</div>
            <a href="/inventory" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 14px' }}>View All →</a>
          </div>
          <div className="space-y-12">
            {[
              { name: 'Amul Full Cream Milk', cat: 'Dairy',     stock: 82,  level: 20,  color: 'green' },
              { name: 'Tata Salt 1kg',        cat: 'Grocery',   stock: 14,  level: 25,  color: 'yellow' },
              { name: 'Surf Excel 1kg',        cat: 'Household', stock: 3,   level: 15,  color: 'pink' },
              { name: 'Cotton T-Shirt (M)',    cat: 'Clothing',  stock: 60,  level: 20,  color: 'green' },
              { name: 'Fortune Oil 1L',        cat: 'Grocery',   stock: 18,  level: 30,  color: 'yellow' },
            ].map((p, i) => {
              const pct = Math.min((p.stock / Math.max(p.stock, p.level * 2)) * 100, 100);
              const trackColor = p.color === 'green' ? 'var(--green)' : p.color === 'yellow' ? 'var(--yellow)' : 'var(--pink)';
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={16} color="#9ca3af" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{p.name}</span>
                      <span className={`badge badge-${p.color}`}>{p.stock <= 0 ? 'Critical' : p.stock < p.level ? 'Low' : 'OK'}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#f0f0f4' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: trackColor, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{p.stock} units · reorder at {p.level}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee Snapshot */}
        <div className="card">
          <div className="flex items-center justify-between mb-16">
            <div className="section-title" style={{ marginBottom: 0 }}>Employee Snapshot</div>
            <a href="/employees" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '6px 14px' }}>View All →</a>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Present', count: 112, colorClass: 'badge-green' },
              { label: 'Absent',  count: 8,   colorClass: 'badge-pink' },
              { label: 'On Leave', count: 4,  colorClass: 'badge-yellow' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '12px', borderRadius: 12, background: '#f9f9fc' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{s.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-12">
            {[
              { name: 'Priya S.',     role: 'Cashier',   shift: 'Morning', status: 'PRESENT', color: '#BCD8EC' },
              { name: 'Rahul M.',     role: 'Supervisor', shift: 'Morning', status: 'PRESENT', color: '#D6E5BD' },
              { name: 'Anita K.',     role: 'Storekeeper', shift: 'Evening', status: 'ABSENT', color: '#FFCBE1' },
              { name: 'Vikram D.',    role: 'Guard',      shift: 'Night',  status: 'PRESENT', color: '#FFDAB4' },
            ].map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px', borderRadius: 12, background: '#f9f9fc' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                  {e.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.role} · {e.shift}</div>
                </div>
                <span className={`attendance-badge attendance-${e.status.toLowerCase()}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
