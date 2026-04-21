import { useState, useCallback } from 'react';
import { ShoppingCart, Search, X, Receipt, User, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAYMENT_MODES = [
  { key: 'Cash',   label: '💵 Cash',   cls: 'payment-btn-cash'   },
  { key: 'Card',   label: '💳 Card',   cls: 'payment-btn-card'   },
  { key: 'UPI',    label: '📱 UPI',    cls: 'payment-btn-upi'    },
  { key: 'Wallet', label: '👝 Wallet', cls: 'payment-btn-wallet' },
];

const CATEGORY_COLORS = {
  Dairy:'#BCD8EC', Grocery:'#D6E5BD', Bakery:'#F9E1A8',
  Beverages:'#FFCBE1', Snacks:'#FFDAB4', Household:'#DCCCEC',
  'Personal Care':'#BCD8EC', Clothing:'#D6E5BD', Health:'#F9E1A8',
  Frozen:'#FFCBE1', Other:'#FFDAB4',
};

const CAT_EMOJI = {
  Dairy:'🥛', Grocery:'🛒', Bakery:'🍞', Beverages:'🧃',
  Snacks:'🍿', Household:'🧹', Clothing:'👕', Health:'💊',
  Frozen:'🧊', 'Personal Care':'🧴',
};

function fmt(n) { return `₹${Number(n).toFixed(2)}`; }

/* ─── Invoice Modal ─────────────────────────────────────────── */
function InvoiceModal({ invoice, onClose }) {
  return (
    <div className="invoice-overlay" onClick={onClose}>
      <div className="invoice-card" onClick={e => e.stopPropagation()}>
        <div className="invoice-header">
          <div className="invoice-success-icon">✅</div>
          <div className="invoice-title">Payment Successful!</div>
          <div className="invoice-number">{invoice.invoice_number}</div>
        </div>

        <div className="invoice-body">
          <div className="invoice-meta">
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Date</div>
              <div className="invoice-meta-value">{new Date(invoice.sale_date).toLocaleDateString('en-IN')}</div>
            </div>
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Time</div>
              <div className="invoice-meta-value">{new Date(invoice.sale_date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
            </div>
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Payment</div>
              <div className="invoice-meta-value">{invoice.payment_mode}</div>
            </div>
            <div className="invoice-meta-item">
              <div className="invoice-meta-label">Cashier</div>
              <div className="invoice-meta-value">{invoice.cashier_name}</div>
            </div>
          </div>

          <table className="invoice-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign:'center' }}>Qty</th>
                <th style={{ textAlign:'right' }}>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.product_name}</td>
                  <td style={{ textAlign:'center' }}>{item.quantity}</td>
                  <td style={{ textAlign:'right', color:'var(--text-muted)' }}>{fmt(item.unit_price)}</td>
                  <td>{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-total-row">
            <div className="invoice-total-label">Total Amount</div>
            <div className="invoice-total-amount">{fmt(invoice.total_amount)}</div>
          </div>

          <div className="invoice-actions">
            <button className="btn-new-sale" onClick={onClose}>🛒 New Sale</button>
            <button className="btn-close-invoice" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main POS Page ─────────────────────────────────────────── */
export default function POS() {
  const { user, getBranchInventory, deductStock, addRevenue } = useAuth();
  const branchId = user?.branchId || 'B001';

  const products = getBranchInventory(branchId).filter(p => p.is_active);

  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('All');
  const [cart, setCart]             = useState([]);
  const [payMode, setPayMode]       = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice]       = useState(null);
  const [error, setError]           = useState('');

  const categories = ['All', ...new Set(products.map(p => p.category))].sort((a, b) =>
    a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)
  );

  const filtered = products.filter(p => {
    const inCat  = catFilter === 'All' || p.category === catFilter;
    const inSrch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
                   (p.brand || '').toLowerCase().includes(search.toLowerCase());
    return inCat && inSrch;
  });

  /* cart helpers */
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(ci => ci.product.id === product.id ? { ...ci, qty: ci.qty + 1 } : ci);
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateQty = (pid, delta) => {
    setCart(prev => prev
      .map(ci => {
        if (ci.product.id !== pid) return ci;
        const newQty = ci.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > ci.product.stock) return ci;
        return { ...ci, qty: newQty };
      })
      .filter(Boolean)
    );
  };

  const removeFromCart = (pid) => setCart(prev => prev.filter(ci => ci.product.id !== pid));
  const inCart = (pid) => cart.find(ci => ci.product.id === pid);
  const cartTotal = cart.reduce((sum, ci) => sum + ci.product.price * ci.qty, 0);
  const cartItems = cart.reduce((sum, ci) => sum + ci.qty, 0);

  /* generate invoice */
  const handleGenerateInvoice = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await new Promise(r => setTimeout(r, 700)); // simulate processing

      const invoiceData = {
        invoice_number: `INV-${Date.now().toString().slice(-8)}`,
        sale_date: new Date().toISOString(),
        payment_mode: payMode,
        cashier_name: user?.name || 'Cashier',
        branch_id: branchId,
        items: cart.map(ci => ({
          product_name: ci.product.name,
          quantity: ci.qty,
          unit_price: ci.product.price,
          subtotal: ci.product.price * ci.qty,
        })),
        total_amount: cartTotal,
      };

      // Deduct from branch inventory
      deductStock(branchId, cart.map(ci => ({ productId: ci.product.id, quantity: ci.qty })));
      // Add to branch revenue
      addRevenue(branchId, cartTotal);

      setInvoice(invoiceData);
      setCart([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">POS Billing Counter</h1>
          <p className="page-subtitle">Search products · Build cart · Generate invoice</p>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(79,214,156,.15)', border:'1px solid rgba(79,214,156,.3)',
          borderRadius:12, padding:'10px 16px',
        }}>
          <User size={14} color="#059669"/>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#065f46' }}>{user?.name}</div>
            <div style={{ fontSize:10, color:'#059669' }}>Logged in · Ready to bill</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background:'var(--pink)', color:'var(--pink-dark)',
          borderRadius:12, padding:'10px 16px', marginBottom:16,
          fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:8,
        }}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'inherit' }}>×</button>
        </div>
      )}

      <div className="pos-layout">
        {/* ─── LEFT: Product Panel ─── */}
        <div className="pos-product-panel">
          {/* Search */}
          <div className="search-input-wrap" style={{ position:'relative' }}>
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by name or brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div className="filter-pills" style={{ marginBottom:0 }}>
            {categories.map(c => (
              <button
                key={c}
                className={`filter-pill${catFilter === c ? ' active' : ''}`}
                onClick={() => setCatFilter(c)}
              >
                {CAT_EMOJI[c] || ''} {c}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Search size={40}/>
              <h3>No products found</h3>
              <p>Try a different search or category</p>
            </div>
          ) : (
            <div className="pos-product-scroll">
              {filtered.map(prod => {
                const inC   = inCart(prod.id);
                const color = CATEGORY_COLORS[prod.category] || '#BCD8EC';
                const oos   = prod.stock <= 0;
                const isLow = prod.stock > 0 && prod.stock < prod.reorder_level;
                return (
                  <div
                    key={prod.id}
                    className="pos-product-card"
                    style={{ opacity: oos ? 0.55 : 1 }}
                  >
                    <div style={{
                      height:56, borderRadius:10, marginBottom:10,
                      background:`linear-gradient(135deg, ${color}, ${color}99)`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                    }}>
                      {CAT_EMOJI[prod.category] || '📦'}
                    </div>
                    <div className="pos-product-card-cat">{prod.category}</div>
                    <div className="pos-product-card-name">{prod.name}</div>
                    <div className="pos-product-card-brand">{prod.brand || '—'}</div>
                    <div className="pos-product-card-footer">
                      <div>
                        <div className="pos-product-price">₹{prod.price}</div>
                        <div className="pos-product-stock" style={{ color: oos ? '#dc2626' : isLow ? '#d97706' : undefined }}>
                          {oos ? '❌ Out of stock' : isLow ? `⚠️ ${prod.stock} left` : `${prod.stock} ${prod.unit || 'units'} left`}
                        </div>
                      </div>
                      {inC ? (
                        <div className="qty-ctrl">
                          <button className="qty-btn" onClick={() => updateQty(prod.id, -1)}>−</button>
                          <span className="qty-num">{inC.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(prod.id, +1)} disabled={inC.qty >= prod.stock}>+</button>
                        </div>
                      ) : (
                        <button
                          className="btn-add-cart"
                          disabled={oos}
                          onClick={() => addToCart(prod)}
                        >+</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT: Cart Panel ─── */}
        <div className="pos-cart-panel">
          <div className="pos-cart-header">
            <div className="pos-cart-title">
              <ShoppingCart size={16}/>
              Cart
              {cart.length > 0 && (
                <span className="cart-count-badge">{cartItems}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:12, fontWeight:600 }}
              >Clear all</button>
            )}
          </div>

          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <div className="pos-cart-empty">
                <ShoppingCart size={44}/>
                <p>Cart is empty.<br/>Add products from the left panel.</p>
              </div>
            ) : (
              cart.map(ci => (
                <div key={ci.product.id} className="cart-item-row">
                  <span className="cart-item-name">{ci.product.name}</span>
                  <div className="qty-ctrl">
                    <button className="qty-btn" onClick={() => updateQty(ci.product.id, -1)}>−</button>
                    <span className="qty-num">{ci.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(ci.product.id, +1)} disabled={ci.qty >= ci.product.stock}>+</button>
                  </div>
                  <span className="cart-item-price">{fmt(ci.product.price * ci.qty)}</span>
                  <button className="cart-remove-btn" onClick={() => removeFromCart(ci.product.id)}>×</button>
                </div>
              ))
            )}
          </div>

          {/* Bill summary */}
          <div className="pos-bill-summary">
            <div className="bill-row"><span>Items ({cartItems})</span><span>{fmt(cartTotal)}</span></div>
            <div className="bill-row"><span>GST (0%)</span><span>₹0.00</span></div>
            <div className="bill-total-row">
              <span className="bill-total-label">Total</span>
              <span className="bill-total-amount">{fmt(cartTotal)}</span>
            </div>
          </div>

          {/* Payment mode */}
          <div className="pos-payment-section">
            <div className="payment-label">Payment Mode</div>
            <div className="payment-mode-grid">
              {PAYMENT_MODES.map(pm => (
                <button
                  key={pm.key}
                  className={`payment-btn ${pm.cls}${payMode === pm.key ? ' selected' : ''}`}
                  onClick={() => setPayMode(pm.key)}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            <button
              className="btn-generate-invoice"
              disabled={cart.length === 0 || submitting}
              onClick={handleGenerateInvoice}
            >
              <Receipt size={16}/>
              {submitting ? 'Processing…' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}
