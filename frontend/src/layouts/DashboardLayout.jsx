import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Bell, ShoppingCart, BarChart2, Zap } from 'lucide-react';

const NAV_SECTIONS = [
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
];

export default function DashboardLayout() {
  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <ShoppingCart size={20} color="white" />
          </div>
          <span className="sidebar-brand-text">BranchOS</span>
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

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <div className="sidebar-footer-label">System Status</div>
          <div className="status-dot">
            <span className="dot"></span>
            All systems operational
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Phase 2 · POS Active</div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>DMart — Whitefield Branch</h1>
            <p>Branch Operations Center · Today, {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="topbar-right">
            <div className="avatar">BM</div>
            <div>
              <div className="topbar-user-name">Branch Manager</div>
              <div className="topbar-user-status">● Online</div>
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
