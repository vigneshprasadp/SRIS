import { useState, useEffect } from 'react';
import { Package, Warehouse, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

const API = 'http://localhost:8000/api/admin';

const STATUS_STYLE = {
  OK:       { bg:'#d1fae5', color:'#059669' },
  LOW:      { bg:'#fef3c7', color:'#d97706' },
  CRITICAL: { bg:'#fee2e2', color:'#dc2626' },
};

export default function GlobalInventory() {
  const [warehouse, setWarehouse] = useState([]);
  const [lowStock, setLowStock]   = useState([]);
  const [tab, setTab]             = useState('warehouse');
  const [loading, setLoading]     = useState(true);

  const [dispatch, setDispatch] = useState({ warehouse_item_id:'', to_branch:'B001', quantity:'' });
  const [dispResult, setDispResult] = useState(null);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/warehouse`).then(r => r.json()),
      fetch(`${API}/global-low-stock`).then(r => r.json()),
    ]).then(([w, l]) => { setWarehouse(w); setLowStock(l); setLoading(false); });
  }, []);

  const handleDispatch = async () => {
    if (!dispatch.warehouse_item_id || !dispatch.quantity) return;
    setDispatching(true); setDispResult(null);
    try {
      const res = await fetch(`${API}/warehouse-dispatch`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ warehouse_item_id: parseInt(dispatch.warehouse_item_id), to_branch: dispatch.to_branch, quantity: parseInt(dispatch.quantity) }),
      }).then(r => r.json());
      setDispResult(res);
      if (!res.error) {
        const updated = await fetch(`${API}/warehouse`).then(r => r.json());
        setWarehouse(updated);
      }
    } catch(e) { setDispResult({ error:'Network error' }); }
    setDispatching(false);
  };

  const TAB_STYLE = (t) => ({
    padding:'9px 20px', borderRadius:9, border:'none', cursor:'pointer',
    fontWeight:600, fontSize:13,
    background: tab===t ? '#7c6fef' : 'white',
    color: tab===t ? 'white' : 'var(--text-secondary)',
    boxShadow: tab===t ? '0 2px 8px rgba(124,111,239,.3)' : 'none',
    transition:'all .2s',
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Global Inventory View</h2>
          <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Warehouse stock · Branch shortages · Transfer suggestions</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={TAB_STYLE('warehouse')} onClick={() => setTab('warehouse')}>🏭 Warehouse</button>
          <button style={TAB_STYLE('lowstock')} onClick={() => setTab('lowstock')}>⚠️ Low Stock ({lowStock.length})</button>
          <button style={TAB_STYLE('dispatch')} onClick={() => setTab('dispatch')}>🚚 Dispatch</button>
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Loading inventory…</div> : (
        <>
          {/* ── WAREHOUSE TAB ─────────────────── */}
          {tab === 'warehouse' && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Warehouse size={18} style={{ color:'#7c6fef' }}/>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Central Warehouse Inventory</h3>
                </div>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{warehouse.length} items tracked</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Product','Category','Total Stock','Incoming','Outgoing','Supplier','Status'].map(h => (
                        <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.6 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {warehouse.map((w, i) => {
                      const st = STATUS_STYLE[w.stock_status] || STATUS_STYLE.OK;
                      return (
                        <tr key={w.id} style={{ borderTop:'1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background=''}>
                          <td style={{ padding:'12px 16px' }}>
                            <div style={{ fontSize:13, fontWeight:600 }}>{w.product_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{w.unit}</div>
                          </td>
                          <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{w.category}</td>
                          <td style={{ padding:'12px 16px', fontSize:14, fontWeight:700 }}>{w.total_stock?.toLocaleString('en-IN')}</td>
                          <td style={{ padding:'12px 16px', fontSize:13, color:'#059669', fontWeight:600 }}>+{w.incoming_stock?.toLocaleString('en-IN')}</td>
                          <td style={{ padding:'12px 16px', fontSize:13, color:'#dc2626', fontWeight:600 }}>-{w.outgoing_stock?.toLocaleString('en-IN')}</td>
                          <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{w.supplier}</td>
                          <td style={{ padding:'12px 16px' }}>
                            <span style={{ fontSize:11, fontWeight:700, background:st.bg, color:st.color, padding:'3px 10px', borderRadius:20 }}>{w.stock_status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LOW STOCK TAB ─────────────────── */}
          {tab === 'lowstock' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:14 }}>
              {lowStock.map((a, i) => (
                <div key={i} style={{
                  padding:'16px 18px', borderRadius:14,
                  background: a.severity==='CRITICAL' ? '#fff5f5' : '#fffbeb',
                  border:`1.5px solid ${a.severity==='CRITICAL'?'#fecaca':'#fde68a'}`,
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{a.product}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{a.branch_name}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, background:a.severity==='CRITICAL'?'#fee2e2':'#fef3c7', color:a.severity==='CRITICAL'?'#dc2626':'#d97706', padding:'3px 10px', borderRadius:20 }}>{a.severity}</span>
                  </div>
                  <div style={{ display:'flex', gap:16 }}>
                    <div><div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>CURRENT STOCK</div><div style={{ fontSize:18, fontWeight:800, color:a.severity==='CRITICAL'?'#dc2626':'#d97706' }}>{a.stock}</div></div>
                    <ArrowRight size={16} style={{ color:'var(--text-muted)', alignSelf:'center' }}/>
                    <div><div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>REORDER LEVEL</div><div style={{ fontSize:18, fontWeight:800 }}>{a.reorder_level}</div></div>
                  </div>
                  <div style={{ marginTop:10, height:5, background:'rgba(0,0,0,.08)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, width:`${Math.min((a.stock/a.reorder_level)*100,100)}%`, background:a.severity==='CRITICAL'?'#ef4444':'#f59e0b' }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── DISPATCH TAB ─────────────────── */}
          {tab === 'dispatch' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <div className="card" style={{ padding:28 }}>
                <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}><Package size={18} style={{ color:'#7c6fef' }}/> Warehouse → Branch Dispatch</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {[
                    { label:'Warehouse Item', type:'select', key:'warehouse_item_id', options: warehouse.map(w => ({ value:w.id, label:`${w.product_name} (${w.total_stock} in stock)` })) },
                    { label:'Destination Branch', type:'select', key:'to_branch', options: ['B001','B002','B003','B004','B005','B006'].map(b => ({ value:b, label:b })) },
                    { label:'Quantity', type:'number', key:'quantity', placeholder:'e.g. 100' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }}>{f.label}</label>
                      {f.type==='select' ? (
                        <select value={dispatch[f.key]} onChange={e => setDispatch(p => ({...p,[f.key]:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, background:'white', color:'var(--text-primary)' }}>
                          <option value="">Select…</option>
                          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input type="number" placeholder={f.placeholder} value={dispatch[f.key]} onChange={e => setDispatch(p => ({...p,[f.key]:e.target.value}))}
                          style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, boxSizing:'border-box' }}/>
                      )}
                    </div>
                  ))}
                  <button onClick={handleDispatch} disabled={dispatching} style={{ marginTop:6, padding:'11px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#7c6fef,#5bb8f5)', color:'white', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                    {dispatching ? 'Dispatching…' : '🚚 Dispatch to Branch'}
                  </button>
                </div>
                {dispResult && (
                  <div style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:dispResult.error?'#fee2e2':'#d1fae5', border:`1px solid ${dispResult.error?'#fecaca':'#a7f3d0'}` }}>
                    {dispResult.error ? <span style={{ color:'#dc2626', fontSize:13 }}>❌ {dispResult.error}</span>
                      : <span style={{ color:'#059669', fontSize:13 }}>✅ Dispatched {dispResult.quantity} units of <strong>{dispResult.warehouse_item}</strong> to <strong>{dispResult.dispatched_to}</strong>. Remaining: {dispResult.remaining_stock}</span>}
                  </div>
                )}
              </div>
              {/* Suggested Transfers */}
              <div className="card" style={{ padding:28 }}>
                <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}>💡 Smart Transfer Suggestions</h3>
                {lowStock.slice(0,6).map((a, i) => (
                  <div key={i} style={{ padding:'12px 14px', marginBottom:10, borderRadius:12, background:'#f8f9ff', border:'1.5px solid #e2e0f9' }}>
                    <div style={{ fontSize:12.5, fontWeight:700, marginBottom:4 }}>
                      <span style={{ color:'#dc2626' }}>⬇ {a.branch_name?.replace('RetailQ ','')}</span> → <span style={{ color:'#059669' }}>Warehouse</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}><strong>{a.product}</strong> — Only {a.stock} left (need {a.reorder_level})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
