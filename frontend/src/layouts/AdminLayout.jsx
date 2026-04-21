import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Globe, LayoutDashboard, Building2,
  Brain, ArrowRightLeft, Warehouse, ShieldCheck, LogOut,
  TrendingUp, DollarSign, ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Gelato Days palette ─────────────────────────────────────── */
const G = {
  lavender:     '#DCCCEC',
  lavenderMid:  '#c8b8e0',
  lavenderDark: '#6c4cb0',
  blue:         '#BCD8EC',
  blueDark:     '#3570a0',
  pink:         '#FFCBE1',
  pinkDark:     '#c45c8a',
  peach:        '#FFDAB4',
  green:        '#D6E5BD',
  greenDark:    '#5a8a3a',
  yellow:       '#F9E1A8',
};

const NAV_ITEMS = [
  { label: 'Enterprise', items: [
    { name: 'Control Tower',    path: '/admin',              icon: LayoutDashboard, end: true },
    { name: 'Branch Deep Dive', path: '/admin/branch-dive',  icon: Building2 },
  ]},
  { label: 'Inventory', items: [
    { name: 'Global Inventory', path: '/admin/global-inventory', icon: Warehouse },
    { name: 'Stock Transfer',   path: '/admin/stock-transfer',   icon: ArrowRightLeft },
  ]},
  { label: 'Intelligence', items: [
    { name: 'AI Intelligence',  path: '/admin/ai-intelligence',  icon: Brain },
  ]},
];

export default function AdminLayout() {
  const { user, logout, revenue, BRANCHES } = useAuth();
  const navigate = useNavigate();

  const fmt = (n) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${(n||0).toLocaleString('en-IN')}`;

  const totalRevenue = Object.values(revenue || {}).reduce((s, b) => s + (b.today || 0), 0);
  const totalOrders  = Object.values(revenue || {}).reduce((s, b) => s + (b.orders || 0), 0);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="sidebar" style={{
        background: `linear-gradient(170deg, ${G.lavender} 0%, ${G.lavenderMid} 55%, ${G.blue} 100%)`,
        borderRight: `1px solid ${G.lavenderDark}20`,
      }}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" style={{
            background: `linear-gradient(135deg, ${G.lavenderDark}, ${G.blueDark})`,
            boxShadow: `0 4px 12px ${G.lavenderDark}40`,
          }}>
            <Globe size={18} color="white"/>
          </div>
          <div>
            <span className="sidebar-brand-text" style={{ color:'#1a1a2e' }}>RetailQ</span>
            <div style={{ fontSize:9, color:G.lavenderDark, fontWeight:700, letterSpacing:.9, textTransform:'uppercase', marginTop:1 }}>Admin Portal</div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{
          margin:'0 0 20px', padding:'10px 14px',
          background:`rgba(255,255,255,0.5)`,
          borderRadius:12, border:`1px solid rgba(255,255,255,0.8)`,
          boxShadow:'0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <ShieldCheck size={14} color={G.lavenderDark}/>
            <span style={{ fontSize:11, fontWeight:800, color:G.lavenderDark, textTransform:'uppercase', letterSpacing:.8 }}>
              Super Admin Access
            </span>
          </div>
          <div style={{ fontSize:12, color:'#475569', marginTop:4, fontWeight:600 }}>
            {user?.name} · All {Object.keys(BRANCHES).length} branches
          </div>
        </div>

        {/* Nav */}
        {NAV_ITEMS.map(section => (
          <div key={section.label}>
            <span className="sidebar-label" style={{ color:G.lavenderDark, fontSize:10 }}>
              {section.label}
            </span>
            {section.items.map(item => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={({ isActive }) => ({
                  color: isActive ? G.lavenderDark : '#475569',
                  background: isActive ? 'rgba(255,255,255,0.75)' : 'transparent',
                  fontWeight: isActive ? 700 : 500,
                  borderLeft: `3px solid ${isActive ? G.lavenderDark : 'transparent'}`,
                  boxShadow: isActive ? '0 2px 8px rgba(108,76,176,0.1)' : 'none',
                })}
              >
                <item.icon size={17} className="nav-icon"/>
                {item.name}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Back to branch + Logout */}
        <div style={{ marginTop:'auto', padding:'0 0 16px' }}>
          <NavLink to="/" style={{
            display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.8)',
            color:'#475569', fontSize:12, fontWeight:700, textDecoration:'none',
            marginBottom:8, transition:'all .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.75)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.5)'}
          >
            <LayoutDashboard size={14}/> ← Branch Dashboard
          </NavLink>
          <button
            onClick={handleLogout}
            style={{
              display:'flex', alignItems:'center', gap:8, width:'100%',
              padding:'10px 14px', borderRadius:10, cursor:'pointer',
              background:`${G.pink}80`, border:`1px solid ${G.pinkDark}30`,
              color:G.pinkDark, fontSize:12, fontWeight:700, fontFamily:'inherit',
              transition:'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background=G.pink}
            onMouseLeave={e => e.currentTarget.style.background=`${G.pink}80`}
          >
            <LogOut size={14}/> Sign Out
          </button>
          <div style={{ fontSize:10, color:G.lavenderDark, opacity:.6, textAlign:'center', marginTop:10, fontWeight:600 }}>
            RetailQ SRIS · Enterprise
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <div className="main-content">
        <header className="topbar" style={{ borderBottom:`1px solid ${G.lavender}`, background:'white' }}>
          <div className="topbar-left">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:8, height:8, borderRadius:'50%',
                background:G.lavenderDark,
                boxShadow:`0 0 6px ${G.lavenderDark}80`,
              }}/>
              <h1 style={{ fontSize:16, margin:0, fontWeight:800, color:'#1a1a2e' }}>
                RetailQ Enterprise — Super Admin Portal
              </h1>
            </div>
            <p style={{ margin:0, fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>
              {Object.keys(BRANCHES).length} Branches · Bengaluru Region · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="topbar-right">
            {/* Chain Revenue */}
            <div style={{
              display:'flex', flexDirection:'column', alignItems:'flex-end',
              background:`linear-gradient(135deg,${G.green},${G.green}90)`,
              border:`1px solid ${G.greenDark}30`,
              borderRadius:14, padding:'8px 16px',
              boxShadow:`0 4px 16px ${G.greenDark}15`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <TrendingUp size={12} color={G.greenDark} />
                <span style={{ fontSize:10, fontWeight:800, color:G.greenDark, textTransform:'uppercase', letterSpacing:.6 }}>Chain Revenue Today</span>
              </div>
              <span style={{ fontSize:18, fontWeight:900, color:G.greenDark, letterSpacing:-.5 }}>{fmt(totalRevenue)}</span>
              <span style={{ fontSize:10, color:G.greenDark, fontWeight:700, opacity:.8 }}>{totalOrders} orders · all branches</span>
            </div>

            {/* Live badge */}
            <div style={{
              padding:'6px 14px', borderRadius:20,
              background:`${G.lavender}`,
              border:`1px solid ${G.lavenderDark}30`,
              fontSize:11, fontWeight:800, color:G.lavenderDark,
            }}>
              ● Live Data
            </div>

            {/* Avatar */}
            <div className="avatar" style={{
              background:`linear-gradient(135deg,${G.lavender},${G.blue})`,
              color:G.lavenderDark, fontWeight:800,
            }}>
              {user?.initials || 'SA'}
            </div>
            <div>
              <div className="topbar-user-name">{user?.name || 'Super Admin'}</div>
              <div className="topbar-user-status" style={{ color:G.lavenderDark }}>● Head Office</div>
            </div>
          </div>
        </header>
        <main className="page-body"><Outlet/></main>
      </div>
    </div>
  );
}
