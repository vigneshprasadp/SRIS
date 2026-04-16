import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Package, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const DEMO_PRODUCTS = [
  { id: 1, name: 'Amul Full Cream Milk 1L', category: 'Dairy', brand: 'Amul', price: 68, stock: 82, reorder_level: 20 },
  { id: 2, name: 'Tata Salt 1kg', category: 'Grocery', brand: 'Tata', price: 25, stock: 14, reorder_level: 25 },
  { id: 3, name: 'Surf Excel 1kg', category: 'Household', brand: 'HUL', price: 190, stock: 3, reorder_level: 15 },
  { id: 4, name: 'Cotton T-Shirt (M)', category: 'Clothing', brand: 'DMart', price: 249, stock: 60, reorder_level: 20 },
  { id: 5, name: 'Fortune Oil 1L', category: 'Grocery', brand: 'Fortune', price: 148, stock: 18, reorder_level: 30 },
  { id: 6, name: 'Parle-G Biscuit 800g', category: 'Grocery', brand: 'Parle', price: 82, stock: 120, reorder_level: 40 },
  { id: 7, name: 'Lux Soap (pack of 3)', category: 'Household', brand: 'HUL', price: 90, stock: 0, reorder_level: 20 },
  { id: 8, name: 'Bonjour Face Wash', category: 'Personal Care', brand: 'Bonjour', price: 120, stock: 45, reorder_level: 15 },
  { id: 9, name: 'Aashirvaad Atta 5kg', category: 'Grocery', brand: 'ITC', price: 295, stock: 35, reorder_level: 20 },
  { id: 10, name: 'Women Kurti (XL)', category: 'Clothing', brand: 'DMart', price: 399, stock: 22, reorder_level: 10 },
  { id: 11, name: 'Amul Butter 500g', category: 'Dairy', brand: 'Amul', price: 265, stock: 9, reorder_level: 15 },
  { id: 12, name: 'Dettol Floor Cleaner', category: 'Household', brand: 'Reckitt', price: 155, stock: 55, reorder_level: 20 },
];

const CATEGORIES = ['All', 'Dairy', 'Grocery', 'Household', 'Clothing', 'Personal Care'];

const stockColor = (stock, reorder) => {
  if (stock <= 0) return 'pink';
  if (stock < reorder) return 'yellow';
  return 'green';
};

const stockLabel = (stock, reorder) => {
  if (stock <= 0) return 'Critical';
  if (stock < reorder) return 'Low Stock';
  return 'In Stock';
};

const stockIcon = (stock, reorder) => {
  if (stock <= 0) return <AlertCircle size={12} />;
  if (stock < reorder) return <AlertTriangle size={12} />;
  return <CheckCircle size={12} />;
};

const catEmoji = { Dairy: '🥛', Grocery: '🛒', Household: '🏠', Clothing: '👕', 'Personal Care': '🧴' };

export default function Inventory() {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    axios.get('http://localhost:8000/api/products')
      .then(r => { if (r.data.length) setProducts(r.data); })
      .catch(() => {});
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const inStock = products.filter(p => p.stock >= p.reorder_level).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock < p.reorder_level).length;
  const critical = products.filter(p => p.stock <= 0).length;

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Inventory Management</h2>
          <p className="page-subtitle">Manage and track all branch products · {products.length} total items</p>
        </div>
        <button className="btn btn-blue">
          <Plus size={18} /> Add Product
        </button>
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
            <div style={{ fontSize: 11, opacity: 0.8 }}>Critical / Out</div>
          </div>
        </div>
      </div>

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

      {/* PRODUCT GRID */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={64} />
          <h3>No products found</h3>
          <p>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map(product => {
            const color = stockColor(product.stock, product.reorder_level);
            const label = stockLabel(product.stock, product.reorder_level);
            const icon  = stockIcon(product.stock, product.reorder_level);
            const emoji = catEmoji[product.category] || '📦';
            return (
              <div className="product-card" key={product.id}>
                <div className="product-image-box">
                  <div className="product-image-box-inner" style={{ fontSize: 48 }}>{emoji}</div>
                  <div className="product-badge-overlay">
                    <span className={`badge badge-${color}`}>{icon}{label}</span>
                  </div>
                </div>
                <div className="product-name">{product.name}</div>
                <div className="product-meta">{product.category}{product.brand ? ` · ${product.brand}` : ''}</div>
                <div className="product-price">₹{product.price}</div>
                <div className="product-footer">
                  <div className="product-stock-count"><span>{product.stock}</span> units</div>
                  <button className="btn-sm btn-sm-indigo">Update</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
