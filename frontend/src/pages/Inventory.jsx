import { useState } from 'react';
import { Search, Plus, Filter, Package, AlertTriangle, AlertCircle, CheckCircle, RefreshCcw, ShoppingBag, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All', 'Dairy', 'Grocery', 'Household', 'Clothing', 'Personal Care', 'Beverages'];

const catEmoji = {
  Dairy: '🥛', Grocery: '🛒', Household: '🏠',
  Clothing: '👕', 'Personal Care': '🧴', Beverages: '🧃',
};

const stockStatus = (stock, reorder) => {
  if (stock <= 0) return { color: 'pink', label: 'Out of Stock', icon: AlertCircle };
  if (stock < reorder) return { color: 'yellow', label: 'Low Stock', icon: AlertTriangle };
  return { color: 'green', label: 'In Stock', icon: CheckCircle };
};

export default function Inventory() {
  const { user, getBranchInventory, reorderItem, fillAllLowStock } = useAuth();
  const branchId = user?.branchId || 'B001';
  const products = getBranchInventory(branchId);

  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [reorderingId, setReorderingId] = useState(null);
  const [fillingAll, setFillingAll]     = useState(false);
  const [toast, setToast]              = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const inStock   = products.filter(p => p.stock >= p.reorder_level).length;
  const lowStock  = products.filter(p => p.stock > 0 && p.stock < p.reorder_level).length;
  const critical  = products.filter(p => p.stock <= 0).length;
  const lowItems  = products.filter(p => p.stock < p.reorder_level);

  const handleReorder = async (productId, productName) => {
    setReorderingId(productId);
    await new Promise(r => setTimeout(r, 800));
    reorderItem(branchId, productId);
    setReorderingId(null);
    showToast(`✅ Reorder placed for "${productName}" — stock refilled!`);
  };

  const handleFillAll = async () => {
    setFillingAll(true);
    await new Promise(r => setTimeout(r, 1200));
    fillAllLowStock(branchId);
    setFillingAll(false);
    showToast(`✅ All ${lowItems.length} low-stock items have been restocked!`);
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:24, right:24, zIndex:9999,
          background:'linear-gradient(135deg,#065f46,#047857)',
          color:'white', padding:'12px 20px', borderRadius:14,
          fontSize:13, fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,.2)',
          animation:'slideDown .3s ease',
        }}>
          {toast}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventory Management</h2>
          <p className="page-subtitle">Branch stock levels · {products.length} total items</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {lowItems.length > 0 && (
            <button
              className="btn"
              onClick={handleFillAll}
              disabled={fillingAll}
              style={{
                background:'linear-gradient(135deg,#fef3c7,#fde68a)',
                color:'#92400e', border:'1px solid rgba(217,119,6,.2)',
                gap:8, cursor: fillingAll ? 'not-allowed' : 'pointer',
                opacity: fillingAll ? 0.7 : 1,
              }}
            >
              {fillingAll ? (
                <><RefreshCcw size={16} style={{ animation:'spin .8s linear infinite' }} /> Restocking…</>
              ) : (
                <><Truck size={16} /> Restock All Low ({lowItems.length})</>
              )}
            </button>
          )}
          <button className="btn btn-blue">
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* SUMMARY PILLS */}
      <div className="alert-summary-bar">
        <div className="alert-summary-pill" style={{ background: 'var(--green)', color: 'var(--green-dark)' }}>
          <CheckCircle size={18} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{inStock}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>In Stock</div>
          </div>
        </div>
        <div className="alert-summary-pill" style={{ background: 'var(--yellow)', color: 'var(--yellow-dark)' }}>
          <AlertTriangle size={18} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{lowStock}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Low Stock</div>
          </div>
        </div>
        <div className="alert-summary-pill" style={{ background: 'var(--pink)', color: 'var(--pink-dark)' }}>
          <AlertCircle size={18} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{critical}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Out of Stock</div>
          </div>
        </div>
        <div className="alert-summary-pill" style={{ background: 'var(--blue)', color: 'var(--blue-dark)' }}>
          <ShoppingBag size={18} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{products.length}</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Total SKUs</div>
          </div>
        </div>
      </div>

      {/* LOW STOCK BANNER */}
      {lowItems.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#fef3c7,#fde68a)',
          border:'1.5px solid rgba(217,119,6,.3)',
          borderRadius:14, padding:'14px 20px', marginBottom:20,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <AlertTriangle size={20} color="#d97706" />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>
              {lowItems.length} items need restocking
            </div>
            <div style={{ fontSize:12, color:'#b45309', marginTop:2 }}>
              {lowItems.slice(0,3).map(p => p.name).join(', ')}{lowItems.length > 3 ? ` +${lowItems.length - 3} more` : ''}
            </div>
          </div>
          <button
            onClick={handleFillAll}
            disabled={fillingAll}
            style={{
              padding:'8px 16px', borderRadius:10, cursor:'pointer',
              background:'#d97706', color:'white', border:'none',
              fontSize:12, fontWeight:700, fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:6,
            }}
          >
            <Truck size={13} /> Auto-Fill All
          </button>
        </div>
      )}

      {/* SEARCH & FILTER */}
      <div className="search-container">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by product name or brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost">
          <Filter size={18} /> Filters
        </button>
      </div>

      {/* CATEGORY PILLS */}
      <div className="filter-pills">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-pill${activeCategory === cat ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {catEmoji[cat] || ''} {cat}
          </button>
        ))}
      </div>

      {/* PRODUCT TABLE */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'2px solid var(--border)' }}>
              {['Product', 'Category', 'Brand', 'Price', 'Stock', 'Reorder Level', 'Status', 'Action'].map(h => (
                <th key={h} style={{
                  textAlign:'left', padding:'12px 16px', fontSize:11,
                  fontWeight:700, color:'var(--text-muted)',
                  textTransform:'uppercase', letterSpacing:.6,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(product => {
              const { color, label, icon: Icon } = stockStatus(product.stock, product.reorder_level);
              const emoji = catEmoji[product.category] || '📦';
              const isLow = product.stock < product.reorder_level;
              const isReordering = reorderingId === product.id;
              return (
                <tr
                  key={product.id}
                  style={{
                    borderBottom:'1px solid var(--border)',
                    background: product._reordered ? '#f0fdf4' : 'white',
                    transition:'background .3s',
                  }}
                  onMouseEnter={e => { if (!product._reordered) e.currentTarget.style.background='#f8fafc'; }}
                  onMouseLeave={e => { if (!product._reordered) e.currentTarget.style.background='white'; }}
                >
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:36, height:36, borderRadius:10,
                        background:'linear-gradient(135deg,#f8f9fa,#eef0f2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, flexShrink:0,
                      }}>{emoji}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{product.name}</div>
                        {product._reordered && (
                          <div style={{ fontSize:10, color:'#059669', fontWeight:700 }}>✓ Restocked</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{product.category}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-secondary)' }}>{product.brand || '—'}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'var(--lavender-dark)' }}>₹{product.price}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {/* Stock bar */}
                      <div style={{ width:60, height:6, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                        <div style={{
                          height:'100%',
                          width:`${Math.min(100, (product.stock / (product.reorder_level * 2)) * 100)}%`,
                          background: color === 'green' ? '#4fd69c' : color === 'yellow' ? '#f7c948' : '#f78c6c',
                          borderRadius:4, transition:'width .4s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize:13, fontWeight:700,
                        color: color === 'green' ? '#059669' : color === 'yellow' ? '#d97706' : '#dc2626',
                      }}>{product.stock}</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>{product.unit}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-secondary)' }}>{product.reorder_level}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span className={`badge badge-${color}`}>
                      <Icon size={11} />{label}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    {isLow ? (
                      <button
                        onClick={() => handleReorder(product.id, product.name)}
                        disabled={isReordering}
                        style={{
                          display:'flex', alignItems:'center', gap:5,
                          padding:'6px 12px', borderRadius:8, cursor: isReordering ? 'not-allowed' : 'pointer',
                          background: isReordering ? '#f1f5f9' : 'linear-gradient(135deg,#fef3c7,#fde68a)',
                          border:'1px solid rgba(217,119,6,.25)',
                          color:'#92400e', fontSize:11, fontWeight:700, fontFamily:'inherit',
                          transition:'all .2s',
                        }}
                      >
                        {isReordering ? (
                          <><RefreshCcw size={11} style={{ animation:'spin .8s linear infinite' }} /> Ordering…</>
                        ) : (
                          <><Truck size={11} /> Reorder</>
                        )}
                      </button>
                    ) : (
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <Package size={64} />
            <h3>No products found</h3>
            <p>Try adjusting your search or filter.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
