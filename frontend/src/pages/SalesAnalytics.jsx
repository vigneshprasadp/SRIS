import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';

const API = 'http://localhost:8000';

const CATEGORY_PALETTE = [
  '#BCD8EC','#D6E5BD','#F9E1A8','#FFCBE1','#FFDAB4',
  '#DCCCEC','#a8d8b9','#f7c5a0','#b8d4e8','#e8c5d8',
];

function fmt(n) { return `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits:0})}`; }

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e8e8e8', borderRadius:12, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:700, fontSize:13, marginBottom:6, color:'#1a1a2e' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:12, color: p.color, fontWeight:600 }}>
          {p.name === 'daily_revenue' ? `Revenue: ${fmt(p.value)}` : `Orders: ${p.value}`}
        </div>
      ))}
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e8e8e8', borderRadius:12, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:700, fontSize:12, marginBottom:4, color:'#1a1a2e' }}>{label}</div>
      <div style={{ fontSize:13, color:'var(--lavender-dark)', fontWeight:700 }}>Qty: {payload[0]?.value}</div>
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>Revenue: {fmt(payload[1]?.value || 0)}</div>
    </div>
  );
};

export default function SalesAnalytics() {
  const [daily,    setDaily]    = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [catRevs,  setCatRevs]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [days, setDays]         = useState(7);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/sales/daily-revenue?branch_id=B001&days=${days}`).then(r=>r.json()),
      fetch(`${API}/api/sales/top-products?branch_id=B001&days=${days}&top_n=8`).then(r=>r.json()),
      fetch(`${API}/api/sales/category-revenue?branch_id=B001&days=${days}`).then(r=>r.json()),
    ]).then(([d, t, c]) => {
      setDaily(d);
      setTopProds(t);
      setCatRevs(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days]);

  const totalRevenue  = daily.reduce((s, r) => s + r.daily_revenue, 0);
  const totalOrders   = daily.reduce((s, r) => s + r.daily_orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const todayRevenue  = daily.length > 0 ? daily[daily.length - 1]?.daily_revenue ?? 0 : 0;

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { weekday:'short', day:'numeric' });
  };

  const chartDaily = daily.map(r => ({ ...r, label: formatDate(r.date) }));
  const chartProds = topProds.map(p => ({ ...p, name: p.product_name.length > 16 ? p.product_name.slice(0,14)+'…' : p.product_name }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Analytics</h1>
          <p className="page-subtitle">Revenue trends, top products and category breakdown</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              className={`filter-pill${days === d ? ' active' : ''}`}
              onClick={() => setDays(d)}
            >Last {d}d</button>
          ))}
          <button className="btn btn-ghost" onClick={load} style={{ padding:'8px 12px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid-4" style={{ marginBottom:0 }}>
        {[
          { label:'Today Revenue',   value:fmt(todayRevenue),  color:'stat-card-lavender', icon:'💰' },
          { label:`${days}d Revenue`, value:fmt(totalRevenue), color:'stat-card-green',    icon:'📈' },
          { label:`${days}d Orders`,  value:totalOrders,       color:'stat-card-blue',     icon:'🧾' },
          { label:'Avg Order Value',  value:fmt(avgOrderValue), color:'stat-card-peach',   icon:'⚡' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-card-header">
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-icon" style={{ fontSize:18 }}>{s.icon}</div>
            </div>
            <div className="stat-card-value" style={{ fontSize:28 }}>{s.value}</div>
            <div className="stat-card-glow"/>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="spinner-wrap" style={{ marginTop:40 }}><div className="spinner"/></div>
      ) : (
        <div className="analytics-grid">

          {/* ── Daily Revenue Line Chart (full width) ── */}
          <div className="chart-card chart-card-full">
            <div className="chart-card-title">📈 Daily Revenue Trend</div>
            <div className="chart-card-sub">Revenue and order count per day (last {days} days)</div>
            {chartDaily.length === 0 ? (
              <div className="empty-state"><p>No revenue data yet. Complete a sale from the POS counter.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartDaily} margin={{ top:5, right:20, bottom:5, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f4" />
                  <XAxis dataKey="label" tick={{ fontSize:12, fill:'#94a3b8' }} />
                  <YAxis yAxisId="rev" tick={{ fontSize:12, fill:'#94a3b8' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="ord" orientation="right" tick={{ fontSize:12, fill:'#94a3b8' }} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Line yAxisId="rev" type="monotone" dataKey="daily_revenue" name="daily_revenue"
                    stroke="#7c5cbf" strokeWidth={2.5} dot={{ fill:'#7c5cbf', r:4 }} activeDot={{ r:6 }} />
                  <Line yAxisId="ord" type="monotone" dataKey="daily_orders" name="daily_orders"
                    stroke="#BCD8EC" strokeWidth={2} dot={{ fill:'#BCD8EC', r:3 }} strokeDasharray="5 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Top Products Bar Chart ── */}
          <div className="chart-card">
            <div className="chart-card-title">📊 Top Selling Products</div>
            <div className="chart-card-sub">By quantity sold in last {days} days</div>
            {chartProds.length === 0 ? (
              <div className="empty-state"><p>No sales data yet.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartProds} layout="vertical" margin={{ top:5, right:20, bottom:5, left:10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:11, fill:'#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:'#555', width:100 }} width={110} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="total_qty" name="Qty Sold" fill="#BCD8EC" radius={[0,6,6,0]}>
                    {chartProds.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="total_revenue" name="Revenue" fill="#DCCCEC" radius={[0,6,6,0]} hide />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Category Revenue Pie Chart ── */}
          <div className="chart-card">
            <div className="chart-card-title">🥧 Revenue by Category</div>
            <div className="chart-card-sub">Category breakdown — last {days} days</div>
            {catRevs.length === 0 ? (
              <div className="empty-state"><p>No sales data yet.</p></div>
            ) : (
              <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                <ResponsiveContainer width="55%" height={260}>
                  <PieChart>
                    <Pie
                      data={catRevs}
                      dataKey="revenue"
                      nameKey="category"
                      cx="50%" cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                    >
                      {catRevs.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [fmt(v), name]}
                      contentStyle={{ borderRadius:12, border:'1px solid #e8e8e8', fontSize:12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  {catRevs.slice(0, 8).map((c, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:CATEGORY_PALETTE[i%CATEGORY_PALETTE.length], flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:500, flex:1 }}>{c.category}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--lavender-dark)' }}>{fmt(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
