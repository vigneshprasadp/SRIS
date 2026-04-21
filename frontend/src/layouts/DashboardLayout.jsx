import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Bell, ShoppingCart, BarChart2,
  Zap, Brain, LineChart, RefreshCcw, Globe, ShieldCheck,
  TrendingUp, LogOut, DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout, getBranchRevenue, BRANCHES } = useAuth();
  const navigate = useNavigate();

  const branch    = BRANCHES[user?.branchId] || null;
  const rev       = getBranchRevenue(user?.branchId);
  const isCashier = user?.role === 'cashier';

  const fmt = (n) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${n?.toLocaleString('en-IN') || 0}`;

  const handleLogout = () => { logout(); navigate('/login'); };

  // Nav sections differ by role
  const NAV_SECTIONS = isCashier ? [
    { label: 'Billing', items: [
      { name: 'POS Billing', path: '/', icon: ShoppingCart, end: true },
    ]},
  ] : [
    {
      label: 'Operations',
      items: [
        { name: 'Dashboard',  path: '/',          icon: LayoutDashboard, end: true },
        { name: 'Inventory',  path: '/inventory', icon: Package },
        { name: 'Employees',  path: '/employees', icon: Users },
        { name: 'Alerts',     path: '/alerts',    icon: Bell },
      ],
    },
    {
      label: 'Sales',
      items: [
        { name: 'POS Billing',    path: '/pos',                icon: ShoppingCart },
        { name: 'Analytics',      path: '/sales-analytics',    icon: BarChart2 },
        { name: 'Intelligence',   path: '/sales-intelligence', icon: Zap },
      ],
    },
    {
      label: 'AI Engine',
      items: [
        { name: 'AI Insights',    path: '/ai-insights',    icon: Brain },
        { name: 'Forecast Chart', path: '/forecast-chart', icon: LineChart },
        { name: 'Smart Restock',  path: '/smart-restock',  icon: RefreshCcw },
      ],
    },
  ];

  const roleColor = isCashier ? '#4fd69c' : '#5bb8f5';
  const roleLabel = isCashier ? 'Cashier' : 'Branch Manager';

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <ShoppingCart size={20} color="white" />
          </div>
          <div>
            <span className="sidebar-brand-text" style={{ color:'#1a1a2e' }}>RetailQ</span>
            <div style={{ fontSize:9, color:'var(--lavender-dark)', fontWeight:700, letterSpacing:.9, textTransform:'uppercase', marginTop:1 }}>
              {isCashier ? 'POS Terminal' : 'Branch Ops'}
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{
          margin:'0 0 16px', padding:'10px 14px',
          background:'rgba(255,255,255,.6)',
          borderRadius:12, border:'1px solid rgba(0,0,0,.05)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{
              width:8, height:8, borderRadius:'50%',
              background: roleColor, boxShadow:`0 0 6px ${roleColor}`,
            }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:.8 }}>{roleLabel}</span>
          </div>
          {branch && <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', marginTop:4 }}>{branch.name}</div>}
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <span className="sidebar-label">{section.label}</span>
            {section.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <item.icon size={18} className="nav-icon" />
                {item.name}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Super Admin Portal Button (only for non-cashier) */}
        {!isCashier && (
          <div style={{ padding: '12px 0 4px' }}>
            <Link to="/admin" className="admin-portal-btn">
              <div style={{
                width:28, height:28, borderRadius:8,
                background:'linear-gradient(135deg,#7c6fef,#5bb8f5)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <Globe size={14} color="white" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>Super Admin</div>
                <div style={{ fontSize:10, color:'#a78bfa', fontWeight:500 }}>Enterprise Portal →</div>
              </div>
              <ShieldCheck size={14} color="#7c6fef" style={{ opacity:0.7 }} />
            </Link>
          </div>
        )}

        <div className="sidebar-footer" style={{ marginTop:'8px' }}>
          <div className="sidebar-footer-label">System Status</div>
          <div className="status-dot">
            <span className="dot"></span>
            All systems operational
          </div>
          <button
            onClick={handleLogout}
            style={{
              display:'flex', alignItems:'center', gap:8, marginTop:10,
              width:'100%', padding:'8px 10px', borderRadius:8,
              background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.15)',
              color:'#dc2626', fontSize:12, fontWeight:600, cursor:'pointer',
              fontFamily:'inherit', transition:'all .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,.15)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,.08)'}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>{branch ? branch.name : 'Branch Operations'}</h1>
            <p>
              {isCashier ? 'POS Terminal · Cashier Mode · ' : 'Branch Operations Center · '}
              Today, {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </p>
          </div>
          <div className="topbar-right">
            {/* Money Earned (not for cashier) */}
            {!isCashier && branch && (
              <>
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'flex-end',
                  background:'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                  border:'1px solid rgba(5,150,105,.2)',
                  borderRadius:12, padding:'8px 14px',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <TrendingUp size={12} color="#059669" />
                    <span style={{ fontSize:10, fontWeight:700, color:'#059669', textTransform:'uppercase', letterSpacing:.6 }}>Today's Revenue</span>
                  </div>
                  <span style={{ fontSize:18, fontWeight:800, color:'#065f46', letterSpacing:-.5 }}>{fmt(rev.today)}</span>
                  <span style={{ fontSize:10, color:'#059669', fontWeight:600 }}>{rev.orders} orders</span>
                </div>
                <div style={{
                  display:'flex', flexDirection:'column', alignItems:'flex-end',
                  background:'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                  border:'1px solid rgba(124,111,239,.2)',
                  borderRadius:12, padding:'8px 14px',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <DollarSign size={12} color="#7c6fef" />
                    <span style={{ fontSize:10, fontWeight:700, color:'#7c6fef', textTransform:'uppercase', letterSpacing:.6 }}>Month Revenue</span>
                  </div>
                  <span style={{ fontSize:18, fontWeight:800, color:'#4c1d95', letterSpacing:-.5 }}>{fmt(rev.month)}</span>
                </div>
              </>
            )}
            <div className="avatar">{user?.initials || 'U'}</div>
            <div>
              <div className="topbar-user-name">{user?.name || 'User'}</div>
              <div className="topbar-user-status" style={{ color: roleColor }}>● {roleLabel}</div>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
