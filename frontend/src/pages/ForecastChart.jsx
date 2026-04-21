import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { TrendingUp, Search, RefreshCw, BarChart3, Package } from 'lucide-react';

const API = 'http://localhost:8000';

// Custom tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '10px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: '1px solid var(--border)',
      fontFamily: 'Inter, sans-serif', fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{p.value} units</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          Δ = {Math.abs(payload[0].value - payload[1].value)} units
        </div>
      )}
    </div>
  );
}

export default function ForecastChart() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [days, setDays] = useState(7);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingPred, setLoadingPred] = useState(false);
  const [search, setSearch] = useState('');

  // Load products list on mount
  useEffect(() => {
    fetch(`${API}/api/products?branch_id=B001&limit=200`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.items || [];
        setProducts(arr);
        if (arr.length > 0) setSelected(arr[0]);
      })
      .catch(() => {});
  }, []);

  // Load chart data when product or days change
  const loadChart = useCallback(() => {
    if (!selected) return;
    setLoadingChart(true);
    setLoadingPred(true);
    Promise.all([
      fetch(`${API}/api/ai/forecast-chart/${selected.id}?days=${days}`).then((r) => r.json()),
      fetch(`${API}/api/ai/predict-sales/${selected.id}`).then((r) => r.json()),
    ])
      .then(([chart, pred]) => {
        setChartData(Array.isArray(chart) ? chart : []);
        setPrediction(pred);
        setLoadingChart(false);
        setLoadingPred(false);
      })
      .catch(() => {
        setLoadingChart(false);
        setLoadingPred(false);
      });
  }, [selected, days]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalActual    = chartData.reduce((a, d) => a + (d.actual || 0), 0);
  const totalPredicted = chartData.reduce((a, d) => a + (d.predicted || 0), 0);
  const accuracy       = totalPredicted > 0
    ? Math.max(0, 100 - Math.abs(((totalActual - totalPredicted) / Math.max(totalPredicted, 1)) * 100)).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 160px)', minHeight: 600 }}>
      {/* ── LEFT: Product Selector ── */}
      <div className="card" style={{ width: 260, flexShrink: 0, overflowY: 'auto', padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <div className="chart-title" style={{ marginBottom: 10 }}>📦 Select Product</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32, fontSize: 12, height: 36 }}
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: 'none',
                background: selected?.id === p.id ? 'var(--blue)' : 'transparent',
                color: selected?.id === p.id ? 'var(--blue-dark)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{p.category} · ₹{p.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Chart + Stats ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        {/* Header */}
        <div className="page-header" style={{ padding: 0, marginBottom: 0 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}>
              <BarChart3 size={20} color="var(--blue-dark)" />
              Demand Forecast Chart
            </h1>
            <p className="page-subtitle">
              {selected ? `${selected.name} — Actual vs Predicted sales` : 'Select a product to view forecast'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Days Selector */}
            <div className="seg-control">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  className={`seg-btn${days === d ? ' seg-btn-active' : ''}`}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={loadChart} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Prediction Cards Row */}
        {!loadingPred && prediction && (
          <div className="grid-4" style={{ marginBottom: 0 }}>
            {[
              { label: 'Predicted Tomorrow', value: `${prediction.predicted_sales} ${prediction.unit || 'units'}`, bg: 'var(--blue)', color: 'var(--blue-dark)' },
              { label: 'Current Stock',       value: `${prediction.current_stock} ${prediction.unit || 'units'}`, bg: 'var(--green)', color: 'var(--green-dark)' },
              { label: '7d Rolling Avg',      value: prediction.rolling_avg_7d != null ? `${prediction.rolling_avg_7d} ${prediction.unit || 'units'}` : '—', bg: 'var(--lavender)', color: 'var(--lavender-dark)' },
              { label: 'Forecast Accuracy',   value: `${accuracy}%`, bg: 'var(--peach)', color: 'var(--peach-dark)' },
            ].map((c, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 14, padding: '14px 18px',
                border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="card" style={{ flex: 1, minHeight: 300 }}>
          <div className="chart-header" style={{ marginBottom: 16 }}>
            <div className="chart-title">📈 Actual vs Predicted Demand ({days} Days)</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 3, background: '#3f7ea8', display: 'inline-block', borderRadius: 2 }} />
                Actual Sales
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: 3, background: '#a78bfa', display: 'inline-block', borderRadius: 2, borderStyle: 'dashed' }} />
                Predicted
              </span>
            </div>
          </div>

          {loadingChart ? (
            <div className="spinner-wrap" style={{ height: 300 }}><div className="spinner" /></div>
          ) : chartData.length === 0 ? (
            <div className="empty-state" style={{ height: 300 }}>
              <Package size={40} />
              <p>No forecast data available. Select a product or check backend.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f4" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={chartData.reduce((a, d) => a + d.actual, 0) / Math.max(chartData.length, 1)}
                  stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
                />
                <Line
                  type="monotone" dataKey="actual" name="Actual"
                  stroke="#3f7ea8" strokeWidth={2.5} dot={{ r: 4, fill: '#3f7ea8', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="predicted" name="Predicted"
                  stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 3"
                  dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart Summary */}
        {chartData.length > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: `Total Actual (${days}d)`, value: totalActual, color: '#3f7ea8' },
              { label: `Total Predicted (${days}d)`, value: totalPredicted, color: '#a78bfa' },
              { label: 'Variance', value: Math.abs(totalActual - totalPredicted), color: totalActual > totalPredicted ? 'var(--green-dark)' : 'var(--pink-dark)' },
            ].map((s, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 12, padding: '12px 16px',
                border: '1px solid var(--border)', flex: 1, textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
