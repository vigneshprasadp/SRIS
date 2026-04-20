import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, TrendingUp, Package, ShoppingBag, Zap } from 'lucide-react';

const API = 'http://localhost:8000';

function fmt(n) { return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function fmtLong(n) { return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

const payChipClass = (mode) => ({
  Cash: 'payment-chip payment-chip-cash',
  Card: 'payment-chip payment-chip-card',
  UPI:  'payment-chip payment-chip-upi',
  Wallet:'payment-chip payment-chip-wallet',
}[mode] || 'payment-chip payment-chip-cash');

export default function SalesIntelligence() {
  const [intel,   setIntel]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/sales/intelligence?branch_id=B001`).then(r => r.json()),
      fetch(`${API}/api/sales/history?branch_id=B001&limit=20`).then(r => r.json()),
    ]).then(([i, h]) => {
      setIntel(i);
      setHistory(h.items || []);
      setLastRefresh(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const WIDGETS = intel ? [
    {
      label: "Today's Orders",
      value: intel.today_orders,
      icon: <ShoppingBag size={18} />,
      bg: 'var(--blue)',
      color: 'var(--blue-dark)',
    },
    {
      label: "Today's Revenue",
      value: fmt(intel.today_revenue),
      icon: <TrendingUp size={18} />,
      bg: 'var(--green)',
      color: 'var(--green-dark)',
    },
    {
      label: 'Week Revenue',
      value: fmt(intel.week_revenue),
      icon: <Zap size={18} />,
      bg: 'var(--lavender)',
      color: 'var(--lavender-dark)',
    },
    {
      label: 'Avg Order Value',
      value: fmtLong(intel.avg_order_value),
      icon: <Package size={18} />,
      bg: 'var(--peach)',
      color: 'var(--peach-dark)',
    },
  ] : [];

  const INFO_CARDS = intel ? [
    {
      label: 'Peak Hour',
      value: intel.peak_hour,
      icon: <Clock size={18} />,
      bg: 'var(--yellow)',
      color: 'var(--yellow-dark)',
      small: true,
    },
    {
      label: 'Top Category',
      value: intel.top_category,
      icon: <ShoppingBag size={18} />,
      bg: 'var(--pink)',
      color: 'var(--pink-dark)',
      small: true,
    },
    {
      label: 'Fast-Moving Product',
      value: intel.top_product,
      icon: <Zap size={18} />,
      bg: 'var(--green)',
      color: 'var(--green-dark)',
      small: true,
    },
  ] : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Branch Sales Intelligence</h1>
          <p className="page-subtitle">Live operational insights · auto-refreshes every 30s</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="refresh-indicator">
            <span className="refresh-dot"/>
            Last refreshed {lastRefresh.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          </div>
          <button className="btn btn-ghost" onClick={load} style={{ padding:'8px 12px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading && !intel ? (
        <div className="spinner-wrap"><div className="spinner"/></div>
      ) : intel ? (
        <>
          {/* ── KPI Stat Widgets ── */}
          <div className="intelligence-stat-grid">
            {WIDGETS.map((w, i) => (
              <div key={i} className="intel-widget">
                <div className="intel-widget-icon" style={{ background: w.bg, color: w.color }}>
                  {w.icon}
                </div>
                <div className="intel-widget-label">{w.label}</div>
                <div className="intel-widget-value">{w.value}</div>
              </div>
            ))}
          </div>

          {/* ── Info cards row ── */}
          <div className="grid-3" style={{ marginBottom:24 }}>
            {INFO_CARDS.map((w, i) => (
              <div key={i} className="intel-widget" style={{ flexDirection:'row', alignItems:'center', gap:16 }}>
                <div className="intel-widget-icon" style={{ background: w.bg, color: w.color, flexShrink:0 }}>
                  {w.icon}
                </div>
                <div>
                  <div className="intel-widget-label">{w.label}</div>
                  <div className="intel-widget-value-sm">{w.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Payment Mode Breakdown ── */}
          {intel.recent_payment_modes && Object.keys(intel.recent_payment_modes).length > 0 && (
            <div className="card" style={{ marginBottom:24 }}>
              <div className="chart-header" style={{ marginBottom:16 }}>
                <div className="chart-title">💳 Today's Payment Modes</div>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {Object.entries(intel.recent_payment_modes).map(([mode, cnt]) => (
                  <div key={mode} style={{
                    display:'flex', alignItems:'center', gap:10,
                    background:'#fafafa', borderRadius:12, padding:'12px 18px',
                    border:'1px solid var(--border)',
                  }}>
                    <span className={payChipClass(mode)}>{mode}</span>
                    <span style={{ fontWeight:800, fontSize:20, color:'var(--text-primary)' }}>{cnt}</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>transactions</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent Transactions Table ── */}
          <div className="card">
            <div className="chart-header">
              <div className="chart-title">🧾 Recent Transactions</div>
              <div className="refresh-indicator">
                <span className="refresh-dot"/>
                Live
              </div>
            </div>
            {history.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={40}/>
                <h3>No transactions yet</h3>
                <p>Start a sale from the POS Billing Counter.</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="txn-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Cashier</th>
                      <th>Items</th>
                      <th>Payment</th>
                      <th>Time</th>
                      <th style={{ textAlign:'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(txn => {
                      const dt = new Date(txn.sale_date);
                      return (
                        <tr key={txn.id}>
                          <td>
                            <div className="txn-invoice-num">{txn.invoice_number}</div>
                          </td>
                          <td style={{ color:'var(--text-secondary)' }}>
                            {txn.cashier_name || <span style={{ color:'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            <span style={{ fontWeight:600 }}>{txn.items.length}</span>
                            <span style={{ color:'var(--text-muted)', fontSize:12, marginLeft:4 }}>
                              product{txn.items.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>
                            <span className={payChipClass(txn.payment_mode)}>{txn.payment_mode}</span>
                          </td>
                          <td style={{ color:'var(--text-muted)', fontSize:12 }}>
                            <div>{dt.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</div>
                            <div>{dt.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
                          </td>
                          <td style={{ textAlign:'right' }}>
                            <span className="txn-amount">{fmtLong(txn.total_amount)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Could not load intelligence data. Check if backend is running.</p>
        </div>
      )}
    </div>
  );
}
