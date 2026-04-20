import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Employees from './pages/Employees';
import Alerts from './pages/Alerts';
import POS from './pages/POS';
import SalesAnalytics from './pages/SalesAnalytics';
import SalesIntelligence from './pages/SalesIntelligence';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory"          element={<Inventory />} />
          <Route path="employees"          element={<Employees />} />
          <Route path="alerts"             element={<Alerts />} />
          <Route path="pos"                element={<POS />} />
          <Route path="sales-analytics"    element={<SalesAnalytics />} />
          <Route path="sales-intelligence" element={<SalesIntelligence />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
