import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Auth
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequireAuth, GuestRoute } from './components/RouteGuards';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout     from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/Login';

// Branch / Manager Pages
import Dashboard        from './pages/Dashboard';
import Inventory        from './pages/Inventory';
import Employees        from './pages/Employees';
import Alerts           from './pages/Alerts';
import POS              from './pages/POS';
import SalesAnalytics   from './pages/SalesAnalytics';
import SalesIntelligence from './pages/SalesIntelligence';
import AIInsights       from './pages/AIInsights';
import ForecastChart    from './pages/ForecastChart';
import SmartRestock     from './pages/SmartRestock';

// Super Admin Pages
import SuperAdminDashboard  from './pages/SuperAdminDashboard';
import BranchDeepDive       from './pages/BranchDeepDive';
import GlobalInventory      from './pages/GlobalInventory';
import AIGlobalIntelligence from './pages/AIGlobalIntelligence';
import StockTransferPanel   from './pages/StockTransferPanel';

/* Cashiers land on /pos; managers on dashboard */
function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'cashier') return <Navigate to="/pos" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── LOGIN ─────────────────────────────────── */}
          <Route path="/login" element={
            <GuestRoute><Login /></GuestRoute>
          } />

          {/* ── BRANCH OPERATIONS (Manager + Cashier) ── */}
          <Route path="/" element={
            <RequireAuth allowedRoles={['branch_manager', 'cashier']}>
              <DashboardLayout />
            </RequireAuth>
          }>
            <Route index                    element={<HomeRedirect />} />
            <Route path="inventory"         element={<RequireAuth allowedRoles={['branch_manager']}><Inventory /></RequireAuth>} />
            <Route path="employees"         element={<RequireAuth allowedRoles={['branch_manager']}><Employees /></RequireAuth>} />
            <Route path="alerts"            element={<RequireAuth allowedRoles={['branch_manager']}><Alerts /></RequireAuth>} />
            <Route path="pos"               element={<POS />} />
            <Route path="sales-analytics"   element={<RequireAuth allowedRoles={['branch_manager']}><SalesAnalytics /></RequireAuth>} />
            <Route path="sales-intelligence" element={<RequireAuth allowedRoles={['branch_manager']}><SalesIntelligence /></RequireAuth>} />
            <Route path="ai-insights"       element={<RequireAuth allowedRoles={['branch_manager']}><AIInsights /></RequireAuth>} />
            <Route path="forecast-chart"    element={<RequireAuth allowedRoles={['branch_manager']}><ForecastChart /></RequireAuth>} />
            <Route path="smart-restock"     element={<RequireAuth allowedRoles={['branch_manager']}><SmartRestock /></RequireAuth>} />
          </Route>

          {/* ── SUPER ADMIN PORTAL ──────────────────── */}
          <Route path="/admin" element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminLayout />
            </RequireAuth>
          }>
            <Route index                    element={<SuperAdminDashboard />} />
            <Route path="branch-dive"       element={<BranchDeepDive />} />
            <Route path="branch-dive/:code" element={<BranchDeepDive />} />
            <Route path="global-inventory"  element={<GlobalInventory />} />
            <Route path="ai-intelligence"   element={<AIGlobalIntelligence />} />
            <Route path="stock-transfer"    element={<StockTransferPanel />} />
          </Route>

          {/* ── CATCH ALL ───────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
