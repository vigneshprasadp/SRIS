import { useState, useEffect } from 'react';
import { BellRing, AlertCircle, AlertTriangle, PackageOpen, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const DEMO_ALERTS = [
  {
    id: 1, type: 'LOW_STOCK', severity: 'warning',
    title: 'Low Stock — Tata Salt 1kg',
    message: 'Current: 14 units, Reorder level: 25 units. Please initiate purchase order.',
    time: '10 mins ago',
  },
  {
    id: 2, type: 'LOW_STOCK', severity: 'critical',
    title: 'Critical Stock — Surf Excel 1kg',
    message: 'Current: 3 units, Reorder level: 15 units. Immediate restocking needed.',
    time: '25 mins ago',
  },
  {
    id: 3, type: 'EXPIRY', severity: 'critical',
    title: 'Expiry Alert — Amul Dahi 200g',
    message: '32 units of Amul Dahi are expiring within 2 days. Consider promotion or disposal.',
    time: '1 hr ago',
  },
  {
    id: 4, type: 'OUT_OF_STOCK', severity: 'critical',
    title: 'Out of Stock — Lux Soap Pack',
    message: 'Zero units remaining. Product has been auto-flagged. Restock immediately.',
    time: '2 hrs ago',
  },
  {
    id: 5, type: 'DAMAGE', severity: 'warning',
    title: 'Damaged Goods — Aisle 4',
    message: '8 units of Fortune Oil reported damaged during last delivery. Logged for insurance.',
    time: '3 hrs ago',
  },
  {
    id: 6, type: 'LOW_STOCK', severity: 'warning',
    title: 'Low Stock — Amul Butter 500g',
    message: 'Current: 9 units, Reorder level: 15 units. Refill from cold storage.',
    time: '4 hrs ago',
  },
  {
    id: 7, type: 'EXPIRY', severity: 'warning',
    title: 'Approaching Expiry — Britannia Bread',
    message: '15 packs expire in 4 days. Consider bundle discount to clear stock.',
    time: '5 hrs ago',
  },
];

const alertMeta = {
  LOW_STOCK:    { icon: PackageOpen,   label: 'Low Stock',    colorKey: 'warning' },
  EXPIRY:       { icon: Clock,         label: 'Expiry Alert', colorKey: 'critical' },
  OUT_OF_STOCK: { icon: AlertCircle,   label: 'Out of Stock', colorKey: 'critical' },
  DAMAGE:       { icon: AlertTriangle, label: 'Damaged Goods',colorKey: 'warning' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [resolved, setResolved] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    axios.get('http://localhost:8000/api/alerts/low-stock')
      .then(r => {
        if (r.data.length) {
          const apiAlerts = r.data.map((item, i) => ({
            id: `api-${i}`, type: 'LOW_STOCK',
            severity: item.current_stock === 0 ? 'critical' : 'warning',
            title: `Low Stock — ${item.product}`,
            message: `Current: ${item.current_stock} units, Reorder level: ${item.required_stock} units.`,
            time: 'Just now',
          }));
          setAlerts(prev => [...apiAlerts, ...prev]);
        }
      })
      .catch(() => {});
  }, []);

  const resolve = (id) => {
    setResolved(prev => [...prev, id]);
  };

  const active = alerts
    .filter(a => !resolved.includes(a.id))
    .filter(a => typeFilter === 'All' || a.type === typeFilter);

  const criticalCount = alerts.filter(a => !resolved.includes(a.id) && a.severity === 'critical').length;
  const warningCount  = alerts.filter(a => !resolved.includes(a.id) && a.severity === 'warning').length;

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Alerts & Notifications</h2>
          <p className="page-subtitle">Real-time alerts requiring branch attention</p>
        </div>
        <button className="btn btn-ghost" style={{ gap: 6 }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* SUMMARY */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Critical Alerts', count: criticalCount, bg: 'var(--pink)',    color: 'var(--pink-dark)',   icon: <AlertCircle size={22}/> },
          { label: 'Warnings',        count: warningCount,  bg: 'var(--yellow)',  color: 'var(--yellow-dark)', icon: <AlertTriangle size={22}/> },
          { label: 'Resolved Today',  count: resolved.length, bg: 'var(--green)', color: 'var(--green-dark)',  icon: <CheckCircle2 size={22}/> },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ background: 'rgba(255,255,255,0.5)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.6)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TYPE FILTER */}
      <div className="filter-pills">
        {['All', 'LOW_STOCK', 'EXPIRY', 'DAMAGE', 'OUT_OF_STOCK'].map(t => (
          <button key={t} className={`filter-pill${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'All' ? 'All Types' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ALERTS LIST */}
      {active.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <CheckCircle2 size={64} style={{ color: 'var(--green-dark)', opacity: 0.5 }} />
          <h3>No active alerts</h3>
          <p>All alerts have been resolved. The branch looks healthy!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {active.map(alert => {
            const meta = alertMeta[alert.type] || alertMeta['LOW_STOCK'];
            const IconComp = meta.icon;
            const severity = alert.severity;
            return (
              <div key={alert.id} className={`alert-card alert-card-${severity}`}>
                <div className={`alert-icon-wrap alert-icon-${severity}`}>
                  <IconComp size={22} />
                </div>
                <div className="alert-body">
                  <div className={`alert-type-tag`} style={{ color: severity === 'critical' ? 'var(--pink-dark)' : 'var(--yellow-dark)' }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">🕐 {alert.time}</div>
                </div>
                <button className="btn-resolve" onClick={() => resolve(alert.id)}>
                  <CheckCircle2 size={16} style={{ color: 'var(--green-dark)' }} /> Resolve
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
