import { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Search, ChevronUp, ChevronDown, AlertTriangle, Filter } from 'lucide-react';

const API = 'http://localhost:8000';

const PRIORITY_META = {
  CRITICAL: { label: '🔴 CRITICAL', bg: '#fee2e2', color: '#dc2626', order: 0, pulse: true },
  HIGH:     { label: '🟠 HIGH',     bg: '#ffedd5', color: '#ea580c', order: 1, pulse: false },
  MEDIUM:   { label: '🟡 MEDIUM',   bg: '#fef9c3', color: '#ca8a04', order: 2, pulse: false },
  OK:       { label: '🟢 OK',       bg: '#dcfce7', color: '#16a34a', order: 3, pulse: false },
};

// Stock Level Bar
function StockBar({ current, reorder, predicted2d }) {
  const max = Math.max(current, reorder * 3, predicted2d, 1);
  const currentPct    = Math.min((current / max) * 100, 100);
  const reorderPct    = Math.min((reorder / max) * 100, 100);
  const futureStock   = Math.max(0, current - predicted2d);
  const futurePct     = Math.min((futureStock / max) * 100, 100);
  const barColor = current <= 0 ? '#ef4444' : current < reorder ? '#f97316' : '#4ade80';
  const futureColor = futureStock <= 0 ? '#ef4444' : futureStock < reorder ? '#f97316' : '#60a5fa';

  return (
    <div style={{ minWidth: 120 }}>
      {/* Current stock bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f0f0f4', position: 'relative' }}>
          <div style={{ height: '100%', width: `${currentPct}%`, borderRadius: 3, background: barColor, transition: 'width 0.4s ease' }} />
          {/* reorder marker */}
          <div style={{
            position: 'absolute', top: -3, left: `${reorderPct}%`,
            width: 2, height: 12, background: '#f97316', borderRadius: 1,
          }} title={`Reorder at ${reorder}`} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 28, textAlign: 'right' }}>{current}</span>
      </div>
      {/* Future stock bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#f0f0f4' }}>
          <div style={{ height: '100%', width: `${futurePct}%`, borderRadius: 2, background: futureColor, transition: 'width 0.4s ease', opacity: 0.7 }} />
        </div>
        <span style={{ fontSize: 10, color: futureColor, minWidth: 28, textAlign: 'right' }}>{futureStock}</span>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
        Now / After 2d
      </div>
    </div>
  );
}

export default function SmartRestock() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('ALL');
  const [sortKey, setSortKey]     = useState('priority');
  const [sortAsc, setSortAsc]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`${API}/api/ai/smart-restock-all?branch_id=B001`)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 90000);
    return () => clearInterval(id);
  }, [load]);

  // Apply filters and sorting
  const filtered = items
    .filter((r) => {
      if (filter !== 'ALL' && r.priority !== filter) return false;
      if (search && !r.product_name.toLowerCase().includes(search.toLowerCase()) &&
          !r.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va, vb;
      if (sortKey === 'priority') { va = PRIORITY_META[a.priority]?.order ?? 3; vb = PRIORITY_META[b.priority]?.order ?? 3; }
      else if (sortKey === 'stock')   { va = a.current_stock;       vb = b.current_stock; }
      else if (sortKey === 'demand')  { va = a.predicted_sales_2d;  vb = b.predicted_sales_2d; }
      else if (sortKey === 'restock') { va = a.recommended_restock; vb = b.recommended_restock; }
      else if (sortKey === 'name')    { va = a.product_name;        vb = b.product_name; }
      else { va = 0; vb = 0; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const summary = {
    CRITICAL: items.filter((r) => r.priority === 'CRITICAL').length,
    HIGH:     items.filter((r) => r.priority === 'HIGH').length,
    MEDIUM:   items.filter((r) => r.priority === 'MEDIUM').length,
    OK:       items.filter((r) => r.priority === 'OK').length,
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,var(--peach),var(--pink))',
            }}>
              <Package size={20} color="var(--peach-dark)" />
            </span>
            Smart Restock Panel
          </h1>
          <p className="page-subtitle">
            AI-predicted demand · Real-time stock monitoring · Auto-refreshes every 90s
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

      {/* ── Summary Pills ── */}
      <div className="restock-summary-row">
        {Object.entries(PRIORITY_META).map(([key, meta]) => (
          <button
            key={key}
            className={`restock-pill${filter === key ? ' restock-pill-active' : ''}`}
            style={{
              borderColor: meta.color,
              background: filter === key ? meta.bg : '#fff',
              color: meta.color,
            }}
            onClick={() => setFilter(filter === key ? 'ALL' : key)}
          >
            {meta.label}
            <span className="restock-pill-count">{summary[key]}</span>
          </button>
        ))}
        <button
          className={`restock-pill${filter === 'ALL' ? ' restock-pill-active' : ''}`}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          onClick={() => setFilter('ALL')}
        >
          All Products
          <span className="restock-pill-count">{items.length}</span>
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            className="form-input" style={{ paddingLeft: 36 }}
            placeholder="Search product or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <Filter size={14} />
          {filtered.length} / {items.length} products
        </div>
      </div>

      {/* ── Main Table ── */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : error ? (
        <div className="empty-state">
          <AlertTriangle size={44} color="var(--pink-dark)" />
          <h3>Backend Unreachable</h3>
          <p>Start the FastAPI server and click Refresh.</p>
          <button className="btn btn-primary" onClick={load} style={{ marginTop: 16 }}>Retry</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="txn-table restock-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Product <SortIcon k="name" /></span>
                  </th>
                  <th>Category</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('stock')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stock Level <SortIcon k="stock" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('demand')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Predicted 2d <SortIcon k="demand" /></span>
                  </th>
                  <th>Future Stock</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('restock')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Restock Qty <SortIcon k="restock" /></span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('priority')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Priority <SortIcon k="priority" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No products match this filter.
                    </td>
                  </tr>
                ) : filtered.map((r) => {
                  const meta = PRIORITY_META[r.priority] || PRIORITY_META.OK;
                  const futureStock = Math.max(0, r.current_stock - r.predicted_sales_2d);
                  return (
                    <tr
                      key={r.product_id}
                      style={{ background: r.priority === 'CRITICAL' ? '#fff5f5' : undefined }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Reorder level: {r.reorder_level} {r.unit}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, background: '#f0f0f4',
                          color: 'var(--text-secondary)', borderRadius: 20, padding: '3px 10px',
                        }}>
                          {r.category}
                        </span>
                      </td>
                      <td>
                        <StockBar
                          current={r.current_stock}
                          reorder={r.reorder_level}
                          predicted2d={r.predicted_sales_2d}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--blue-dark)', fontSize: 15 }}>
                          {r.predicted_sales_2d}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{r.unit}</span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: 15,
                          color: futureStock <= 0 ? '#ef4444' : futureStock < r.reorder_level ? '#f97316' : 'var(--green-dark)',
                        }}>
                          {futureStock}
                        </span>
                        {futureStock <= 0 && (
                          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>Stock-out risk!</div>
                        )}
                      </td>
                      <td>
                        {r.recommended_restock > 0 ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'var(--lavender)', border: '1.5px solid var(--lavender-dark)',
                            borderRadius: 10, padding: '6px 14px',
                          }}>
                            <Package size={13} color="var(--lavender-dark)" />
                            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--lavender-dark)' }}>
                              {r.recommended_restock}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--lavender-dark)', opacity: 0.8 }}>{r.unit}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: meta.bg, color: meta.color,
                          borderRadius: 20, padding: '5px 14px',
                          whiteSpace: 'nowrap',
                          boxShadow: meta.pulse ? `0 0 0 2px ${meta.color}30` : 'none',
                          display: 'inline-block',
                        }}>
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
