import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Zap, AlertTriangle, BarChart3, Globe } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

const API = 'http://localhost:8000/api/admin';
const COLORS = ['#7c6fef','#5bb8f5','#4fd69c','#f7c948','#f78c6c','#d97aff'];

export default function AIGlobalIntelligence() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/ai-insights`).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:80, color:'var(--text-muted)' }}>Loading AI Intelligence…</div>;

  const INSIGHT_CARDS = [
    {
      title: '🔥 Top Selling Products', color:'#7c6fef', bg:'linear-gradient(135deg,#ede9fe,#ddd6fe)',
      content: data?.top_products,
      render: (items) => items?.map((p,i) => {
        const max = items[0]?.sold || 1;
        return (
          <div key={i} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:12.5, fontWeight:600 }}>{p.name}</span>
              <span style={{ fontSize:12, fontWeight:700, color:'#7c6fef' }}>{p.sold?.toLocaleString('en-IN')} units</span>
            </div>
            <div style={{ height:7, background:'rgba(0,0,0,.08)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, width:`${(p.sold/max)*100}%`, background:'linear-gradient(90deg,#7c6fef,#5bb8f5)' }}/>
            </div>
          </div>
        );
      }),
    },
    {
      title: '💀 Dead Stock Detection', color:'#f78c6c', bg:'linear-gradient(135deg,#fff5f5,#fee2e2)',
      content: data?.dead_stock,
      render: (items) => items?.map((p,i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,.06)' }}>
          <div>
            <div style={{ fontSize:12.5, fontWeight:600 }}>{p.name}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.category}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:6 }}>
            Stock: {p.stock}
          </span>
        </div>
      )),
    },
    {
      title: '⚡ Demand Spikes (3d)', color:'#4fd69c', bg:'linear-gradient(135deg,#d1fae5,#a7f3d0)',
      content: data?.demand_spikes,
      render: (items) => items?.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,.06)' }}>
          <div style={{ background:'#059669', borderRadius:8, padding:'5px 7px' }}>
            <TrendingUp size={13} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12.5, fontWeight:600 }}>{p.name}</div>
            <div style={{ fontSize:11, color:'#059669', fontWeight:600 }}>+{p.qty_3d} units in 3 days</div>
          </div>
        </div>
      )),
    },
  ];

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom:28 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ background:'linear-gradient(135deg,#d97aff,#7c6fef)', borderRadius:10, padding:'7px 14px', color:'white', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:7 }}>
              <Brain size={15}/> AI GLOBAL INTELLIGENCE
            </div>
          </div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Enterprise AI Insights</h2>
          <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>Cross-branch ML analytics · Demand forecasting · Performance prediction</p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ textAlign:'center', padding:'12px 20px', background:'linear-gradient(135deg,#ede9fe,#ddd6fe)', borderRadius:14 }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#7c6fef' }}>{data?.prediction_accuracy}%</div>
            <div style={{ fontSize:11, color:'#7c6fef', fontWeight:600 }}>Model Accuracy</div>
          </div>
          <div style={{ textAlign:'center', padding:'12px 20px', background:'linear-gradient(135deg,#fee2e2,#fecaca)', borderRadius:14 }}>
            <div style={{ fontSize:22, fontWeight:800, color:'#dc2626' }}>{data?.total_ai_alerts}</div>
            <div style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>Active Alerts</div>
          </div>
        </div>
      </div>

      {/* TOP 3 INSIGHT CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:24 }}>
        {INSIGHT_CARDS.map(card => (
          <div key={card.title} style={{ background:card.bg, borderRadius:18, padding:22, border:'1px solid rgba(0,0,0,.06)' }}>
            <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700 }}>{card.title}</h3>
            {card.render(card.content)}
          </div>
        ))}
      </div>

      {/* BAR CHART + CHAIN INSIGHTS */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:20, marginBottom:24 }}>
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <BarChart3 size={18} style={{ color:'#5bb8f5' }}/>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Top Products — Units Sold</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.top_products} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="name" tick={{ fontSize:10 }} tickFormatter={n => n.split(' ')[0]}/>
              <YAxis tick={{ fontSize:10 }}/>
              <Tooltip contentStyle={{ borderRadius:10, fontSize:12 }}/>
              <Bar dataKey="sold" radius={[6,6,0,0]}>
                {data?.top_products?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chain Insights Feed */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <Globe size={18} style={{ color:'#d97aff' }}/>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Chain Intelligence Feed</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {data?.chain_insights?.map((insight, i) => (
              <div key={i} style={{ display:'flex', gap:12, padding:'11px 14px', background:'#f8f9ff', borderRadius:12, border:'1px solid #e2e0f9', alignItems:'flex-start' }}>
                <div style={{ minWidth:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#d97aff,#7c6fef)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Zap size={12} color="white"/>
                </div>
                <p style={{ margin:0, fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.5 }}>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOW PERFORMING BRANCH + PREDICTION SUMMARY */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ background:'linear-gradient(135deg,#fef3c7,#fde68a)', borderRadius:18, padding:24, border:'1px solid #fcd34d' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <AlertTriangle size={18} color="#d97706"/>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#92400e' }}>⚠ Low Performing Branch</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:24, fontWeight:800, color:'#92400e' }}>{data?.low_performing_branch?.name}</div>
            <div style={{ fontSize:13, color:'#78350f' }}>
              Ranked <strong>#{data?.low_performing_branch?.rank}</strong> of all branches
            </div>
            <div style={{ fontSize:13, color:'#78350f' }}>
              Revenue: <strong>₹{data?.low_performing_branch?.revenue?.toLocaleString('en-IN', { maximumFractionDigits:0 })}</strong>
            </div>
            <div style={{ padding:'10px 14px', background:'rgba(255,255,255,.5)', borderRadius:10 }}>
              <p style={{ margin:0, fontSize:12, color:'#92400e', lineHeight:1.6 }}>
                📌 Recommendation: Schedule operational audit. Consider targeted promotions and increased warehouse supply.
              </p>
            </div>
          </div>
        </div>

        <div style={{ background:'linear-gradient(135deg,#d1fae5,#a7f3d0)', borderRadius:18, padding:24, border:'1px solid #6ee7b7' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <Brain size={18} color="#059669"/>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:'#065f46' }}>🧠 AI Prediction Summary</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Top Category (Chain)', value:'Dairy & Beverages', icon:'🥛' },
              { label:'Predicted Growth (7d)', value:'+8.4% chain-wide', icon:'📈' },
              { label:'Restock Priority', value:`${data?.total_ai_alerts} products flagged`, icon:'🔔' },
              { label:'Model Accuracy', value:`${data?.prediction_accuracy}%`, icon:'🎯' },
              { label:'Dead Stock Items', value:`${data?.dead_stock?.length} products (5 shown)`, icon:'❌' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(255,255,255,.5)', borderRadius:10 }}>
                <span style={{ fontSize:12, color:'#065f46', fontWeight:600 }}>{item.icon} {item.label}</span>
                <span style={{ fontSize:12.5, fontWeight:700, color:'#065f46' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
