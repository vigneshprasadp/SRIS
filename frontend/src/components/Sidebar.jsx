import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Users, Bell } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Alerts', path: '/alerts', icon: Bell },
  ];

  return (
    <aside className="w-64 bg-pastel-lavender/30 border-r border-pastel-lavender/50 h-full p-4 flex flex-col">
      <div className="mb-10 mt-4 px-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-pastel-blue flex items-center justify-center shadow-sm">
            <LayoutDashboard size={18} className="text-white"/>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-gray-800">BranchOS</h2>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-medium",
                isActive 
                  ? "bg-white shadow-sm text-indigo-900 border border-black/5 object-cover" 
                  : "text-gray-600 hover:bg-white/50 hover:text-gray-900"
              )}
            >
              <item.icon size={20} className={isActive ? "text-indigo-500" : "text-gray-400"} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 bg-white/60 rounded-2xl border border-black/5">
         <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Status</p>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-700">All systems operational</span>
         </div>
      </div>
    </aside>
  );
}
