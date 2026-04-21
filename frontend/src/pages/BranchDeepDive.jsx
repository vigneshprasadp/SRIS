import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, Package, TrendingUp, AlertTriangle, Star, ShoppingBag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:8000/api/admin';
const fmt = (n) => n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n?.toLocaleString('en-IN')}`;

/* Gelato Days colours */
const G = {
  lavender: '#DCCCEC', lavenderDark: '#6c4cb0',
  blue: '#BCD8EC',     blueDark: '#3570a0',
  green: '#D6E5BD',    greenDark: '#5a8a3a',
  yellow: '#F9E1A8',   yellowDark: '#a07800',
  pink: '#FFCBE1',     pinkDark: '#c45c8a',
  peach: '#FFDAB4',    peachDark: '#b06020',
};

export default function BranchDeepDive() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(code || 'B001');

  const load = async (bc) => {
    setLoading(true);
    try { setData(await fetch(`${API}/branch/${bc}/deep-dive`).then(r => r.json())); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(selected); }, [selected]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate('/admin')} style={{ background:'white', border:'1.5px solid var(--border)', borderRadius:10, padding:'8px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600 }}>
            <ArrowLeft size={15}/> Back
          </button>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Branch Deep Dive</h2>
            <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Detailed analytics for individual branch</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {ALL_BRANCHES.map(bc => (
            <button key={bc} onClick={() => setSelected(bc)} style={{ padding:'7px 14px', borderRadius:9, border:'1.5px solid', borderColor: selected===bc ? G.lavenderDark : 'var(--border)', background: selected===bc ? G.lavender : 'white', color: selected===bc ? G.lavenderDark : 'var(--text-secondary)', fontWeight:600, fontSize:12, cursor:'pointer' }}>{bc}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:80, color:'var(--text-muted)' }}>Loading branch data…</div>
      : data && !data.error ? (
        <>
          <div style={{ background:`linear-gradient(135deg, ${G.lavenderDark} 0%, ${G.blueDark} 100%)`, borderRadius:18, padding:'24px 28px', marginBottom:24, color:'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, opacity:.8, textTransform:'uppercase', letterSpacing:.8, marginBottom:4 }}>{data.branch_code} · {data.city}</div>
                <h3 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800 }}>{data.name}</h3>
                <p style={{ margin:0, fontSize:13, opacity:.85 }}>{data.location}</p>
              </div>
              <div style={{ display:'flex', gap:28, textAlign:'center' }}>
                {[['Revenue', fmt(data.revenue)], ['Orders', data.orders?.toLocaleString('en-IN')], ['Staff', data.staff_total], ['Health', `${data.stock_health}%`]].map(([l,v]) => (
                  <div key={l}><div style={{ fontSize:20, fontWeight:800 }}>{v}</div><div style={{ fontSize:11, opacity:.8 }}>{l}</div></div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
            {[
              { label:'Products', value:data.total_products, icon:Package, color:G.lavenderDark, bg:G.lavender },
              { label:'Low Stock', value:data.low_stock_count, icon:AlertTriangle, color:G.peachDark, bg:G.peach },
              { label:'Staff', value:data.staff_total, icon:Users, color:G.greenDark, bg:G.green },
              { label:'Avg Order', value:fmt(data.avg_order_value||0), icon:ShoppingBag, color:G.blueDark, bg:G.blue },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ background:k.bg, borderRadius:12, padding:10 }}><k.icon size={18} color={k.color}/></div>
                <div>
                  <p style={{ margin:'0 0 3px', fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>{k.label}</p>
                  <p style={{ margin:0, fontSize:19, fontWeight:800 }}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:20 }}>
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}><TrendingUp size={17} style={{ color:G.blueDark }}/><h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>7-Day Revenue Trend</h3></div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.revenue_trend}>
                  <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={G.lavenderDark} stopOpacity={0.25}/><stop offset="95%" stopColor={G.lavenderDark} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="date" tick={{ fontSize:10 }} tickFormatter={d => d.slice(5)}/>
                  <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize:10 }}/>
                  <Tooltip formatter={v => [fmt(v),'Revenue']} contentStyle={{ borderRadius:10, fontSize:12 }}/>
                  <Area type="monotone" dataKey="revenue" stroke={G.lavenderDark} strokeWidth={2.5} fill="url(#rg)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}><Star size={17} style={{ color:G.yellowDark }}/><h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Top Products</h3></div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {data.top_products?.map((p, i) => {
                  const max = data.top_products[0]?.sold || 1;
                  return (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:600 }}>{p.name}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:G.lavenderDark }}>{p.sold?.toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ height:6, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:4, width:`${(p.sold/max)*100}%`, background:`linear-gradient(90deg,${G.lavenderDark},${G.blueDark})` }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:16, padding:'12px 14px', background: data.stock_health>75?'#d1fae5':data.stock_health>55?'#fef3c7':'#fee2e2', borderRadius:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:600 }}>Stock Health</span>
                  <span style={{ fontSize:14, fontWeight:800, color:data.stock_health>75?'#059669':data.stock_health>55?'#d97706':'#dc2626' }}>{data.stock_health}%</span>
                </div>
                <div style={{ height:6, background:'rgba(0,0,0,.1)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:4, width:`${data.stock_health}%`, background:data.stock_health>75?'#10b981':data.stock_health>55?'#f59e0b':'#ef4444' }}/>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : <div style={{ textAlign:'center', padding:80, color:'#dc2626' }}>{data?.error||'Failed to load.'}</div>}
    </div>
  );
}
