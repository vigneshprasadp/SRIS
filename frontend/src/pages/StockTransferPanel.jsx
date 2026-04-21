import { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle, Clock, XCircle } from 'lucide-react';

const API = 'http://localhost:8000/api/admin';
const BRANCHES = ['B001','B002','B003','B004','B005','B006'];

const STATUS_ICON = {
  COMPLETED: <CheckCircle size={14} color="#059669"/>,
  PENDING:   <Clock size={14} color="#d97706"/>,
  CANCELLED: <XCircle size={14} color="#dc2626"/>,
};
const STATUS_COLOR = {
  COMPLETED: { bg:'#d1fae5', color:'#059669' },
  PENDING:   { bg:'#fef3c7', color:'#d97706' },
  CANCELLED: { bg:'#fee2e2', color:'#dc2626' },
};

export default function StockTransferPanel() {
  const [products, setProducts]   = useState([]);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);

  const [form, setForm] = useState({
    from_branch: 'B001', to_branch: 'B002',
    product_id: '', quantity: '', notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/products/?limit=100').then(r => r.json()),
      fetch(`${API}/transfer-history`).then(r => r.json()),
    ]).then(([p, h]) => {
      setProducts(Array.isArray(p) ? p : p.items || []);
      setHistory(h);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.product_id || !form.quantity || form.from_branch === form.to_branch) {
      setResult({ error: 'Please fill all fields. Source and destination must differ.' });
      return;
    }
    setSubmitting(true); setResult(null);
    try {
      const res = await fetch(`${API}/transfer-stock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, product_id: parseInt(form.product_id), quantity: parseInt(form.quantity) }),
      }).then(r => r.json());
      setResult(res);
      if (!res.error) {
        const h = await fetch(`${API}/transfer-history`).then(r => r.json());
        setHistory(h);
        setForm(f => ({ ...f, product_id:'', quantity:'', notes:'' }));
      }
    } catch(e) { setResult({ error:'Network error — backend may be offline.' }); }
    setSubmitting(false);
  };

  const inputStyle = {
    width:'100%', padding:'10px 13px', borderRadius:9,
    border:'1.5px solid var(--border)', fontSize:13,
    background:'white', color:'var(--text-primary)', boxSizing:'border-box',
  };
  const labelStyle = { fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom:28 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Stock Transfer Panel</h2>
          <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Move inventory between branches · Full audit trail</p>
        </div>
        <div style={{ padding:'10px 18px', background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', borderRadius:12, textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#7c6fef' }}>{history.length}</div>
          <div style={{ fontSize:11, color:'#7c6fef', fontWeight:600 }}>Total Transfers</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'420px 1fr', gap:24, alignItems:'start' }}>

        {/* ── TRANSFER FORM ──────────────────────── */}
        <div className="card" style={{ padding:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
            <div style={{ background:'linear-gradient(135deg,#7c6fef,#5bb8f5)', borderRadius:10, padding:8 }}>
              <ArrowRightLeft size={16} color="white"/>
            </div>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>New Transfer Request</h3>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Source branch */}
            <div>
              <label style={labelStyle}>Source Branch</label>
              <select value={form.from_branch} onChange={e => setForm(f => ({...f, from_branch:e.target.value}))} style={inputStyle}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Visual arrow */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
              <div style={{ flex:1, height:2, background:'linear-gradient(90deg,#7c6fef,#5bb8f5)', borderRadius:2 }}/>
              <div style={{ background:'linear-gradient(135deg,#7c6fef,#5bb8f5)', borderRadius:8, padding:'6px 10px' }}>
                <ArrowRightLeft size={14} color="white"/>
              </div>
              <div style={{ flex:1, height:2, background:'linear-gradient(90deg,#5bb8f5,#4fd69c)', borderRadius:2 }}/>
            </div>

            {/* Destination branch */}
            <div>
              <label style={labelStyle}>Destination Branch</label>
              <select value={form.to_branch} onChange={e => setForm(f => ({...f, to_branch:e.target.value}))} style={inputStyle}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              {form.from_branch === form.to_branch && (
                <p style={{ margin:'4px 0 0', fontSize:11, color:'#dc2626' }}>⚠ Source and destination cannot be the same.</p>
              )}
            </div>

            {/* Product */}
            <div>
              <label style={labelStyle}>Product</label>
              <select value={form.product_id} onChange={e => setForm(f => ({...f, product_id:e.target.value}))} style={inputStyle}>
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label style={labelStyle}>Quantity</label>
              <input type="number" min="1" placeholder="Enter quantity to transfer" value={form.quantity}
                onChange={e => setForm(f => ({...f, quantity:e.target.value}))} style={inputStyle}/>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea placeholder="Reason for transfer…" value={form.notes}
                onChange={e => setForm(f => ({...f, notes:e.target.value}))}
                style={{ ...inputStyle, resize:'vertical', minHeight:70, fontFamily:'inherit' }}/>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting} style={{
              padding:'12px 0', borderRadius:10, border:'none',
              background: submitting ? '#e2e8f0' : 'linear-gradient(135deg,#7c6fef,#5bb8f5)',
              color: submitting ? 'var(--text-muted)' : 'white',
              fontWeight:700, fontSize:14, cursor:submitting?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              <ArrowRightLeft size={16}/>
              {submitting ? 'Processing…' : 'Confirm Transfer'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              marginTop:16, padding:'14px 16px', borderRadius:12,
              background: result.error ? '#fff5f5' : '#f0fdf4',
              border: `1.5px solid ${result.error ? '#fecaca' : '#a7f3d0'}`,
            }}>
              {result.error ? (
                <p style={{ margin:0, fontSize:13, color:'#dc2626' }}>❌ {result.error}</p>
              ) : (
                <div>
                  <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#059669' }}>✅ Transfer Completed!</p>
                  <p style={{ margin:0, fontSize:12, color:'#065f46' }}>
                    <strong>{result.quantity}</strong> units of <strong>{result.product_name}</strong> moved from <strong>{result.from_branch}</strong> → <strong>{result.to_branch}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TRANSFER HISTORY ─────────────────── */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <Clock size={16} style={{ color:'#7c6fef' }}/> Transfer History
            </h3>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Last {history.length} transfers</span>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading history…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign:'center', padding:60 }}>
              <ArrowRightLeft size={36} color="#cbd5e1" style={{ marginBottom:12 }}/>
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>No transfers yet. Use the form to create the first one.</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['ID','From','To','Product','Qty','Status','Date','Notes'].map(h => (
                      <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(t => {
                    const st = STATUS_COLOR[t.status] || STATUS_COLOR.COMPLETED;
                    return (
                      <tr key={t.id} style={{ borderTop:'1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background=''}>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>#{t.id}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:12, fontWeight:700, background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:6 }}>{t.from_branch}</span>
                        </td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ fontSize:12, fontWeight:700, background:'#d1fae5', color:'#059669', padding:'2px 8px', borderRadius:6 }}>{t.to_branch}</span>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12.5, fontWeight:600 }}>{t.product}</td>
                        <td style={{ padding:'11px 14px', fontSize:14, fontWeight:800 }}>{t.quantity}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, background:st.bg, color:st.color, padding:'3px 10px', borderRadius:20, width:'fit-content' }}>
                            {STATUS_ICON[t.status]} {t.status}
                          </span>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{t.date}</td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-muted)', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
