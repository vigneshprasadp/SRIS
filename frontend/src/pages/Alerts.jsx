import { useState, useEffect, useCallback } from 'react';
import {
  BellRing, AlertCircle, AlertTriangle, PackageOpen,
  Clock, CheckCircle2, RefreshCw, Brain, Zap,
} from 'lucide-react';

const API = 'http://localhost:8000';

const alertMeta = {
  LOW_STOCK:    { icon: PackageOpen,   label: 'Low Stock',     colorKey: 'warning'  },
  OUT_OF_STOCK: { icon: AlertCircle,   label: 'Out of Stock',  colorKey: 'critical' },
  EXPIRY_ALERT: { icon: Clock,         label: 'Expiry Alert',  colorKey: 'critical' },
  DAMAGED_ITEM: { icon: AlertTriangle, label: 'Damaged Goods', colorKey: 'warning'  },
  AI_RESTOCK:   { icon: Brain,         label: 'AI Restock',    colorKey: 'info'     },
};

function severityClass(sev) {
  if (sev === 'CRITICAL') return 'critical';
  if (sev === 'WARNING')  return 'warning';
  return 'info';
}

function timeAgo(dt) {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Alerts() {
  const [alerts,    setAlerts]    = useState([]);
  const [aiAlerts,  setAiAlerts]  = useState([]);
  const [resolved,  setResolved]  = useState(new Set());
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading,   setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/alerts?branch_id=B001&limit=50`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/ai/smart-restock-all?branch_id=B001`).then(r => r.json()).catch(() => []),
    ]).then(([dbAlerts, restockData]) => {
      const alertArr = Array.isArray(dbAlerts) ? dbAlerts : dbAlerts.items || [];
      setAlerts(alertArr);

      // Build AI-powered restock alerts (CRITICAL / HIGH priority only)
      const aiArr = (Array.isArray(restockData) ? restockData : [])
        .filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH')
        .slice(0, 8)
        .map((r, i) => ({
          id: `ai-${r.product_id}-${i}`,
          alert_type: 'AI_RESTOCK',
          severity: r.priority === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          message: `🤖 AI Forecast: ${r.product_name} — Stock ${r.current_stock} units, predicted demand ${r.predicted_sales_2d} units over 2 days. Restock ${r.recommended_restock} units immediately.`,
          branch_id: 'B001',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          product_id: r.product_id,
          _productName: r.product_name,
        }));
      setAiAlerts(aiArr);
      setLastRefresh(new Date());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const resolveAlert = useCallback(async (alertId, isAI) => {
    if (isAI || typeof alertId === 'string') {
      setResolved(prev => new Set([...prev, alertId]));
      return;
    }
    try {
      await fetch(`${API}/api/alerts/${alertId}/resolve`, { method: 'PATCH' });
      setResolved(prev => new Set([...prev, alertId]));
    } catch {
      setResolved(prev => new Set([...prev, alertId]));
    }
  }, []);

  const allAlerts = [
    ...aiAlerts,
    ...alerts.filter(a => a.status === 'ACTIVE'),
  ];

  const activeAlerts = allAlerts.filter(a => !resolved.has(a.id));

  const filtered = activeAlerts.filter(a => {
    if (typeFilter === 'All') return true;
    return a.alert_type === typeFilter;
  });

  const criticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const warningCount  = activeAlerts.filter(a => a.severity === 'WARNING').length;
  const resolvedCount = resolved.size;

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts & Notifications</h1>
          <p className="page-subtitle">
            Real-time alerts + AI-powered restock intelligence · auto-refreshes every 30s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="refresh-indicator">
            <span className="refresh-dot" />
            {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button className="btn btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Critical Alerts', count: criticalCount,  bg: 'var(--pink)',    color: 'var(--pink-dark)',    icon: <AlertCircle size={22} /> },
          { label: 'Warnings',        count: warningCount,   bg: 'var(--yellow)',  color: 'var(--yellow-dark)',  icon: <AlertTriangle size={22} /> },
          { label: 'AI Restock Alerts', count: aiAlerts.filter(a => !resolved.has(a.id)).length, bg: 'var(--lavender)', color: 'var(--lavender-dark)', icon: <Brain size={22} /> },
          { label: 'Resolved Today',  count: resolvedCount,  bg: 'var(--green)',   color: 'var(--green-dark)',   icon: <CheckCircle2 size={22} /> },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: s.bg, borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.5)', width: 44, height: 44,
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.6)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── AI ENGINE BANNER ── */}
      <div className="ai-model-banner" style={{ marginBottom: 20 }}>
        <div className="ai-model-banner-dot" />
        <Zap size={14} />
        <span>AI Restock Intelligence Active</span>
        <span className="ai-model-tag">RandomForest + KMeans</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          Predicting low-stock risks 2 days ahead
        </span>
      </div>

      {/* ── TYPE FILTER PILLS ── */}
      <div className="filter-pills">
        {['All', 'AI_RESTOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRY_ALERT', 'DAMAGED_ITEM'].map(t => (
          <button
            key={t}
            className={`filter-pill${typeFilter === t ? ' active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'All' ? 'All Types' : t.replace(/_/g, ' ')}
            {t !== 'All' && (
              <span style={{
                marginLeft: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 20,
                padding: '1px 7px', fontSize: 11, fontWeight: 800,
              }}>
                {allAlerts.filter(a => a.alert_type === t && !resolved.has(a.id)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ALERTS LIST ── */}
      {loading && activeAlerts.length === 0 ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <CheckCircle2 size={64} style={{ color: 'var(--green-dark)', opacity: 0.5, margin: '0 auto 16px' }} />
          <h3>No active alerts</h3>
          <p>All alerts have been resolved. The branch looks healthy!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {filtered.map(alert => {
            const type = alert.alert_type || 'LOW_STOCK';
            const meta = alertMeta[type] || alertMeta['LOW_STOCK'];
            const IconComp = meta.icon;
            const sev = severityClass(alert.severity || 'WARNING');
            const isAI = type === 'AI_RESTOCK';

            return (
              <div
                key={alert.id}
                className={`alert-card alert-card-${sev}`}
                style={isAI ? { borderLeft: '3px solid var(--lavender-dark)', background: 'linear-gradient(135deg, rgba(220,204,236,0.25), rgba(188,216,236,0.15))' } : {}}
              >
                <div className={`alert-icon-wrap alert-icon-${sev}`} style={isAI ? { background: 'var(--lavender)', color: 'var(--lavender-dark)' } : {}}>
                  <IconComp size={22} />
                </div>
                <div className="alert-body">
                  <div className="alert-type-tag" style={{
                    color: isAI ? 'var(--lavender-dark)' :
                      sev === 'critical' ? 'var(--pink-dark)' : 'var(--yellow-dark)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {isAI && '🤖 '}{meta.label}
                    {isAI && <span className="ai-model-tag" style={{ marginLeft: 4 }}>AI Predicted</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, marginTop: 4 }}>
                    {alert._productName ? `Restock Alert — ${alert._productName}` : `Alert #${alert.id}`}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  {alert.created_at && (
                    <div className="alert-time">🕐 {timeAgo(alert.created_at)}</div>
                  )}
                </div>
                <button
                  className="btn-resolve"
                  onClick={() => resolveAlert(alert.id, isAI)}
                >
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
