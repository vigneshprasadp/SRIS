import { useState, useEffect, useCallback } from 'react';
import {
  Brain, TrendingUp, AlertTriangle, Package,
  Zap, RefreshCw, Activity, BarChart3, ChevronRight,
  Flame, Snowflake, ShieldAlert, Sparkles,
} from 'lucide-react';

const API = 'http://localhost:8000';
const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const PRIORITY_STYLES = {
  CRITICAL: { bg: 'var(--pink)',    color: 'var(--pink-dark)',    label: '🔴 CRITICAL' },
  HIGH:     { bg: 'var(--peach)',   color: 'var(--peach-dark)',   label: '🟠 HIGH'     },
  MEDIUM:   { bg: 'var(--yellow)', color: 'var(--yellow-dark)',   label: '🟡 MEDIUM'   },
  OK:       { bg: 'var(--green)',   color: 'var(--green-dark)',   label: '🟢 OK'       },
};

const CLUSTER_CONFIG = {
  'Fast Moving':   { icon: <Flame size={14} />,      color: 'var(--green-dark)',    bg: 'var(--green)'    },
  'Steady Seller': { icon: <TrendingUp size={14} />, color: 'var(--blue-dark)',     bg: 'var(--blue)'     },
  'Slow Moving':   { icon: <Activity size={14} />,   color: 'var(--yellow-dark)',   bg: 'var(--yellow)'   },
  'Dead Stock':    { icon: <Snowflake size={14} />,  color: 'var(--pink-dark)',     bg: 'var(--pink)'     },
};

const ANOMALY_META = {
  STOCK_RISK:    { label: '🚨 Stock Risk',    color: 'var(--pink-dark)',    bg: 'var(--pink)'    },
  SALES_STALL:   { label: '📉 Sales Stall',  color: 'var(--yellow-dark)',  bg: 'var(--yellow)'  },
  DEMAND_SPIKE:  { label: '📈 Demand Spike', color: 'var(--blue-dark)',    bg: 'var(--blue)'    },
};

// ── Donut chart for cluster distribution ──────────────────────────────────────
function ClusterDonut({ summary }) {
  const labels = ['Fast Moving', 'Steady Seller', 'Slow Moving', 'Dead Stock'];
  const colors = ['#4ade80', '#60a5fa', '#fbbf24', '#f87171'];
  const total  = Object.values(summary).reduce((a, b) => a + b, 0) || 1;
  let offset   = 0;
  const R = 52, CX = 64, CY = 64, STROKE = 20;
  const circumference = 2 * Math.PI * R;

  const slices = labels.map((label, i) => {
    const count = summary[label] || 0;
    const pct   = count / total;
    const dash  = pct * circumference;
    const slice = {
      label, count, color: colors[i],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset * circumference,
    };
    offset += pct;
    return slice;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <svg width={128} height={128} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f0f0f4" strokeWidth={STROKE} />
        {slices.map((s, i) => (
          <circle
            key={i} cx={CX} cy={CY} r={R}
            fill="none" stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={s.dasharray} strokeDashoffset={s.dashoffset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="#1e293b">{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={9} fill="#94a3b8">products</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AIInsights() {
  const [insights,  setInsights]  = useState(null);
  const [clusters,  setClusters]  = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [retraining, setRetraining]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`${API}/api/ai/branch-insights?branch_id=B001`).then(r => r.json()),
      fetch(`${API}/api/ai/product-clusters?branch_id=B001`).then(r => r.json()),
      fetch(`${API}/api/ai/anomaly-alerts?branch_id=B001`).then(r => r.json()).catch(() => []),
    ])
      .then(([ins, clust, anom]) => {
        setInsights(ins);
        setClusters(clust);
        setAnomalies(Array.isArray(anom) ? anom : []);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await fetch(`${API}/api/ai/retrain`, { method: 'POST' });
      setTimeout(() => { setRetraining(false); load(); }, 2000);
    } catch {
      setRetraining(false);
    }
  };

  const STAT_CARDS = insights ? [
    {
      label: 'Predicted Revenue Tomorrow',
      value: fmt(insights.predicted_revenue_tomorrow),
      icon: <TrendingUp size={20} />,
      bg: 'var(--blue)', color: 'var(--blue-dark)',
      sub: 'RandomForest demand × price',
    },
    {
      label: 'Weekly Revenue Forecast',
      value: fmt(insights.weekly_predicted_revenue),
      icon: <BarChart3 size={20} />,
      bg: 'var(--lavender)', color: 'var(--lavender-dark)',
      sub: 'Next 7 days projected',
    },
    {
      label: 'Restock Alerts',
      value: insights.restock_alert_count,
      icon: <AlertTriangle size={20} />,
      bg: 'var(--peach)', color: 'var(--peach-dark)',
      sub: `${insights.critical_products?.length || 0} critical items`,
    },
    {
      label: 'Fast Moving Products',
      value: insights.fast_movers_count,
      icon: <Zap size={20} />,
      bg: 'var(--green)', color: 'var(--green-dark)',
      sub: 'High-demand items',
    },
    {
      label: 'Dead Stock Items',
      value: insights.dead_stock_count,
      icon: <Snowflake size={20} />,
      bg: 'var(--pink)', color: 'var(--pink-dark)',
      sub: 'Require action',
    },
    {
      label: 'Anomalies Detected',
      value: insights.anomaly_count ?? anomalies.length,
      icon: <ShieldAlert size={20} />,
      bg: 'var(--yellow)', color: 'var(--yellow-dark)',
      sub: `${insights.stock_risk_count ?? 0} stock-risk items`,
    },
  ] : [];

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#BCD8EC,#D6E5BD)',
            }}>
              <Brain size={20} color="var(--blue-dark)" />
            </span>
            AI Insights Dashboard
          </h1>
          <p className="page-subtitle">
            Live ML intelligence · Demand Forecasting · Anomaly Detection · Auto-refreshes every 60s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="refresh-indicator">
            <span className="refresh-dot" />
            {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleRetrain}
            disabled={retraining}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: retraining ? 0.6 : 1 }}
          >
            <Sparkles size={14} /> {retraining ? 'Retraining…' : 'Retrain AI'}
          </button>
          <button className="btn btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Model Status Banner ── */}
      <div className="ai-model-banner">
        <div className="ai-model-banner-dot" />
        <span>AI Engine Active</span>
        <span className="ai-model-tag">RandomForest · KMeans · 8-Feature Model</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          Trained on 180-day history + live Phase 2 sales data
        </span>
      </div>

      {loading && !insights ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state">
          <Brain size={44} color="var(--pink-dark)" />
          <h3>AI Engine Unavailable</h3>
          <p>Could not connect to backend. Ensure the FastAPI server is running on port 8000.</p>
          <button className="btn-primary" onClick={load} style={{ marginTop: 16 }}>Retry</button>
        </div>
      ) : insights ? (
        <>
          {/* ── Stat Cards (6 cards) ── */}
          <div className="ai-stat-grid">
            {STAT_CARDS.map((c, i) => (
              <div key={i} className="ai-stat-card">
                <div className="ai-stat-icon" style={{ background: c.bg, color: c.color }}>
                  {c.icon}
                </div>
                <div className="ai-stat-label">{c.label}</div>
                <div className="ai-stat-value">{c.value}</div>
                <div className="ai-stat-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Critical Products + Cluster Distribution ── */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Critical Stock Alert */}
            <div className="card">
              <div className="chart-header">
                <div className="chart-title">🚨 Critical Stock Alert</div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--pink-dark)',
                  background: 'var(--pink)', borderRadius: 20, padding: '3px 10px',
                }}>
                  {insights.critical_products?.length || 0} critical
                </span>
              </div>
              {insights.critical_products && insights.critical_products.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {insights.critical_products.map((name, i) => (
                    <div key={i} className="ai-critical-row">
                      <div className="ai-critical-indicator" />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        background: 'var(--pink)', color: 'var(--pink-dark)',
                        borderRadius: 20, padding: '3px 10px',
                      }}>OUT OF STOCK RISK</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div style={{ fontSize: 36 }}>✅</div>
                  <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>No critical stock issues</p>
                </div>
              )}
            </div>

            {/* Cluster Distribution Donut */}
            <div className="card">
              <div className="chart-header">
                <div className="chart-title">📊 Product Performance Clusters</div>
                <a href="/smart-restock" style={{ fontSize: 12, color: 'var(--blue-dark)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Restock Panel <ChevronRight size={13} />
                </a>
              </div>
              {clusters ? (
                <ClusterDonut summary={clusters.summary} />
              ) : (
                <div className="spinner-wrap" style={{ padding: 32 }}><div className="spinner" /></div>
              )}
            </div>
          </div>

          {/* ── Anomaly Alerts Panel ── */}
          {anomalies.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="chart-header" style={{ marginBottom: 16 }}>
                <div className="chart-title">⚠️ AI Anomaly Detection</div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--yellow-dark)',
                  background: 'var(--yellow)', borderRadius: 20, padding: '3px 10px',
                }}>
                  {anomalies.length} anomalies
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anomalies.slice(0, 8).map((a, i) => {
                  const meta = ANOMALY_META[a.type] || ANOMALY_META.SALES_STALL;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      background: '#fafafa', border: '1px solid var(--border)',
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: meta.color,
                        background: meta.bg, borderRadius: 20, padding: '3px 10px',
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}>{meta.label}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {a.product_name}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                            {a.category}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top Urgent Restock ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="chart-header" style={{ marginBottom: 16 }}>
              <div className="chart-title">🛒 Top Urgent Restock Recommendations</div>
              <a href="/smart-restock" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                Full Panel →
              </a>
            </div>
            {insights.top_urgent_restock && insights.top_urgent_restock.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="txn-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Predicted 2d Demand</th>
                      <th>Restock Qty</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.top_urgent_restock.map((r, i) => {
                      const p = PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.OK;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.product_name}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.category}</td>
                          <td>
                            <span style={{ fontWeight: 700 }}>{r.current_stock}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>{r.unit}</span>
                          </td>
                          <td style={{ color: 'var(--blue-dark)', fontWeight: 600 }}>{r.predicted_sales_2d}</td>
                          <td style={{ color: 'var(--green-dark)', fontWeight: 700 }}>{r.recommended_restock}</td>
                          <td>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              background: p.bg, color: p.color,
                              borderRadius: 20, padding: '4px 12px',
                              whiteSpace: 'nowrap',
                            }}>{p.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <Package size={36} />
                <p>All products are sufficiently stocked.</p>
              </div>
            )}
          </div>

          {/* ── Product Intelligence — Cluster Bands ── */}
          {clusters && (
            <div className="card">
              <div className="chart-header" style={{ marginBottom: 16 }}>
                <div className="chart-title">🏷️ Product Intelligence — Performance Classification</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {clusters.clusters?.length || 0} products classified by KMeans
                </span>
              </div>
              <div className="ai-cluster-bands">
                {['Fast Moving', 'Steady Seller', 'Slow Moving', 'Dead Stock'].map(label => {
                  const cfg   = CLUSTER_CONFIG[label];
                  const items = clusters.clusters?.filter(c => c.cluster_label === label) || [];
                  return (
                    <div key={label} className="ai-cluster-band" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                      <div className="ai-cluster-band-header">
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: cfg.bg, color: cfg.color,
                          borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                        }}>
                          {cfg.icon} {label}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {items.length} products
                        </span>
                      </div>
                      <div className="ai-cluster-chips">
                        {items.slice(0, 8).map(p => (
                          <div key={p.product_id} className="ai-chip" title={`Avg ${p.avg_daily_sales} units/day`}>
                            {p.product_name}
                            <span style={{ marginLeft: 4, opacity: 0.65, fontSize: 10 }}>~{p.avg_daily_sales}/d</span>
                          </div>
                        ))}
                        {items.length > 8 && (
                          <div className="ai-chip ai-chip-more">+{items.length - 8} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
