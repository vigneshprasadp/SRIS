import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, TrendingUp, ShoppingBag, AlertTriangle,
  Brain, ArrowUpRight, ArrowDownRight, RefreshCw,
  Globe, Zap, BarChart3, Package, Users, DollarSign, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${(n||0).toLocaleString('en-IN')}`;
const BRANCH_COLORS = ['#7c6fef','#5bb8f5','#4fd69c','#f7c948','#f78c6c','#d97aff','#64748b'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { BRANCHES, revenue, getBranchInventory } = useAuth();
  const [refreshed, setRefreshed] = useState(new Date());

  const handleRefresh = () => setRefreshed(new Date());

  /* Compute live data from context */
  const branchList = Object.values(BRANCHES).map((b, i) => {
    const rev = revenue[b.id] || { today: b.revenue, month: b.monthRevenue, orders: b.ordersToday };
    const inv = getBranchInventory(b.id);
    const lowStock = inv.filter(p => p.stock < p.reorder_level).length;
    const totalItems = inv.length;
    const healthScore = Math.round(((totalItems - lowStock) / totalItems) * 100);
    return {
      ...b,
      revenue: rev.today,
      monthRevenue: rev.month,
      orders: rev.orders,
      lowStock,
      healthScore,
      growth: ((Math.random() * 20 - 5)).toFixed(1), // demo growth %
      rank: i + 1,
    };
  }).sort((a, b) => b.revenue - a.revenue).map((b, i) => ({ ...b, rank: i + 1 }));

  const totalRevenue    = branchList.reduce((s, b) => s + b.revenue, 0);
  const totalOrders     = branchList.reduce((s, b) => s + b.orders, 0);
  const totalLowStock   = branchList.reduce((s, b) => s + b.lowStock, 0);
  const chartData       = branchList.map(b => ({ name: b.name, revenue: b.revenue }));

  const KPI_CARDS = [
    {
      label: 'Chain Revenue Today',
      value: fmt(totalRevenue),
      icon: TrendingUp, color: '#5bb8f5',
      bg: 'linear-gradient(135deg,#e8f4fd 0%,#d0eafc 100%)',
      badge: 'Live · All 5 branches',
      badgeColor: '#2d9d5f',
    },
    {
      label: 'Total Orders Today',
      value: totalOrders.toLocaleString('en-IN'),
      icon: ShoppingBag, color: '#7c6fef',
      bg: 'linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%)',
      badge: `Avg ${fmt(totalOrders ? totalRevenue/totalOrders : 0)}/order`,
      badgeColor: '#6d28d9',
    },
    {
      label: 'Active Branches',
      value: `${branchList.length} / ${branchList.length}`,
      icon: Building2, color: '#4fd69c',
      bg: 'linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%)',
      badge: 'All systems live',
      badgeColor: '#059669',
    },
    {
      label: 'Low Stock Alerts',
      value: totalLowStock,
      icon: AlertTriangle, color: '#f78c6c',
      bg: 'linear-gradient(135deg,#fef3c7 0%,#fde68a 100%)',
      badge: `Across ${branchList.length} branches`,
      badgeColor: '#d97706',
    },
  ];

  const AI_INSIGHTS = [
    `${branchList[0]?.name?.replace('RetailQ ','') || 'Top'} branch is your top performer today — ${fmt(branchList[0]?.revenue)} revenue.`,
    `${branchList[branchList.length-1]?.name?.replace('RetailQ ','') || 'Hebbal'} branch needs attention — lowest stock health score across the chain.`,
    `${totalLowStock} SKUs need restocking across the chain. Consider urgent bulk transfer.`,
    'Peak hours: 11 AM–1 PM and 6 PM–8 PM. Staff up at all branches during these windows.',
    'Dairy & Grocery categories are driving 65% of chain revenue today.',
  ];

  return (
    <div className="page-container">
      {/* ── HEADER ─────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
            <div style={{
              background:'linear-gradient(135deg,#DCCCEC,#BCD8EC)',
              borderRadius:12, padding:'8px 14px',
              display:'flex', alignItems:'center', gap:8,
              color:'#6c4cb0', fontWeight:800, fontSize:13,
              border:'1px solid rgba(108,76,176,.2)',
            }}>
              <Globe size={16}/> SUPER ADMIN
            </div>
            <h2 style={{ margin:0, fontSize:22, fontWeight:700, color:'var(--text-primary)' }}>
              Enterprise Control Tower
            </h2>
          </div>
          <p style={{ color:'var(--text-muted)', fontSize:13, margin:0 }}>
            {branchList.length} branches · Live as of {refreshed.toLocaleTimeString('en-IN')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            display:'flex', alignItems:'center', gap:8,
            background:'white', border:'1.5px solid var(--border)',
            borderRadius:10, padding:'9px 18px', cursor:'pointer',
            fontWeight:600, fontSize:13, color:'var(--text-primary)',
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* ── KPI CARDS ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:28 }}>
        {KPI_CARDS.map((k) => (
          <div key={k.label} style={{
            background:k.bg, borderRadius:16, padding:'20px 22px',
            border:'1px solid rgba(0,0,0,.06)',
            boxShadow:'0 2px 10px rgba(0,0,0,.04)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.8, margin:'0 0 6px' }}>{k.label}</p>
                <p style={{ fontSize:24, fontWeight:800, color:'var(--text-primary)', margin:'0 0 8px' }}>{k.value}</p>
                <span style={{ fontSize:11, fontWeight:600, color:k.badgeColor,
                  background:'rgba(255,255,255,.6)', padding:'2px 8px', borderRadius:20 }}>
                  {k.badge}
                </span>
              </div>
              <div style={{ background:k.color, borderRadius:12, padding:10, opacity:.9 }}>
                <k.icon size={20} color="white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── BRANCH CHART + AI INSIGHTS ────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20, marginBottom:24 }}>
        {/* Bar chart */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <BarChart3 size={18} style={{ color:'#7c6fef' }} />
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Branch Revenue Today</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize:10 }} tickFormatter={n => n.replace('RetailQ ','')} />
              <YAxis tickFormatter={v => `${(v/1e5).toFixed(0)}L`} tick={{ fontSize:10 }} />
              <Tooltip
                formatter={(v) => [fmt(v), 'Revenue']}
                contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', fontSize:12 }}
              />
              <Bar dataKey="revenue" radius={[6,6,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Chain Insights */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <Brain size={18} style={{ color:'#d97aff' }} />
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>AI Chain Insights</h3>
          </div>
          {AI_INSIGHTS.map((insight, i) => (
            <div key={i} style={{
              display:'flex', gap:12, padding:'10px 0',
              borderBottom: i < AI_INSIGHTS.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems:'flex-start',
            }}>
              <div style={{
                minWidth:28, height:28, borderRadius:8,
                background:'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Zap size={13} color="#7c6fef" />
              </div>
              <p style={{ margin:0, fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.5 }}>{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PERFORMANCE TABLE + LOW STOCK ──── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20 }}>
        {/* Branch Performance Table */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <Building2 size={18} style={{ color:'#5bb8f5' }} />
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Branch Leaderboard</h3>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                {['#','Branch','Revenue Today','Orders','Health','Action'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'6px 10px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchList.map((b, i) => (
                <tr key={b.id} style={{ borderBottom:'1px solid var(--border)', transition:'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background=''}
                >
                  <td style={{ padding:'10px 10px', fontSize:13 }}>
                    <span style={{
                      width:22, height:22, borderRadius:6,
                      background: i===0?'#fef3c7':i===1?'#f1f5f9':i===2?'#fef3c7':'#f8fafc',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:11, color: i<3?'#d97706':'#64748b',
                    }}>{b.rank}</span>
                  </td>
                  <td style={{ padding:'10px 10px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{b.name.replace('RetailQ ','')}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{b.manager}</div>
                  </td>
                  <td style={{ padding:'10px 10px', fontSize:13, fontWeight:700, color:'#1e293b' }}>{fmt(b.revenue)}</td>
                  <td style={{ padding:'10px 10px', fontSize:12, color:'var(--text-secondary)' }}>{b.orders}</td>
                  <td style={{ padding:'10px 10px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ flex:1, height:5, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${b.healthScore}%`,
                          background: b.healthScore>75?'#4fd69c':b.healthScore>55?'#f7c948':'#f78c6c',
                          borderRadius:4 }} />
                      </div>
                      <span style={{ fontSize:11, fontWeight:600 }}>{b.healthScore}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 10px' }}>
                    <button
                      onClick={() => navigate(`/admin/branch-dive/${b.id}`)}
                      style={{
                        display:'flex', alignItems:'center', gap:4,
                        padding:'5px 10px', borderRadius:7, cursor:'pointer',
                        background:'#ede9fe', border:'none', color:'#7c6fef',
                        fontSize:11, fontWeight:700, fontFamily:'inherit',
                      }}
                    >
                      <Eye size={11}/> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Low Stock */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <AlertTriangle size={18} style={{ color:'#f78c6c' }} />
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Global Low Stock</h3>
            <span style={{
              marginLeft:'auto', fontSize:11, fontWeight:700,
              background:'#fee2e2', color:'#dc2626', padding:'2px 10px', borderRadius:20,
            }}>{totalLowStock} alerts</span>
          </div>
          <div style={{ maxHeight:380, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {branchList.map(b =>
              getBranchInventory(b.id)
                .filter(p => p.stock < p.reorder_level)
                .map((p, i) => (
                  <div key={`${b.id}-${p.id}`} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px', borderRadius:10,
                    background: p.stock<=0 ? '#fff5f5' : '#fffbeb',
                    border: `1px solid ${p.stock<=0 ? '#fecaca' : '#fde68a'}`,
                  }}>
                    <div style={{
                      width:8, height:8, borderRadius:'50%', flexShrink:0,
                      background: p.stock<=0 ? '#ef4444' : '#f59e0b',
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{b.name.replace('RetailQ ','')}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700,
                      color: p.stock<=0 ? '#dc2626' : '#d97706',
                      background: p.stock<=0 ? '#fee2e2' : '#fef3c7',
                      padding:'2px 8px', borderRadius:6, flexShrink:0,
                    }}>
                      Qty: {p.stock}
                    </span>
                  </div>
                ))
            )}
            {totalLowStock === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
                <Package size={32} style={{ margin:'0 auto 8px', opacity:.3 }}/>
                <div style={{ fontSize:13 }}>All branches are well stocked! 🎉</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
