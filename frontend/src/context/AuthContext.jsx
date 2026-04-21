import { createContext, useContext, useState, useEffect } from 'react';

/* ─── Branch Data ─────────────────────────────────────────────── */
export const BRANCHES = {
  B001: {
    id: 'B001', name: 'RetailQ Whitefield', city: 'Bengaluru', zone: 'East',
    manager: 'Priya Sharma', managerId: 'MGR001',
    revenue: 4820000, ordersToday: 342, monthRevenue: 14200000,
    color: '#7c6fef',
  },
  B002: {
    id: 'B002', name: 'RetailQ Koramangala', city: 'Bengaluru', zone: 'South',
    manager: 'Rahul Verma', managerId: 'MGR002',
    revenue: 3950000, ordersToday: 287, monthRevenue: 11800000,
    color: '#5bb8f5',
  },
  B003: {
    id: 'B003', name: 'RetailQ Indiranagar', city: 'Bengaluru', zone: 'Central',
    manager: 'Ananya Patel', managerId: 'MGR003',
    revenue: 5230000, ordersToday: 401, monthRevenue: 15600000,
    color: '#4fd69c',
  },
  B004: {
    id: 'B004', name: 'RetailQ HSR Layout', city: 'Bengaluru', zone: 'South',
    manager: 'Kiran Nair', managerId: 'MGR004',
    revenue: 3120000, ordersToday: 218, monthRevenue: 9400000,
    color: '#f7c948',
  },
  B005: {
    id: 'B005', name: 'RetailQ Hebbal', city: 'Bengaluru', zone: 'North',
    manager: 'Deepa Reddy', managerId: 'MGR005',
    revenue: 2870000, ordersToday: 196, monthRevenue: 8600000,
    color: '#f78c6c',
  },
};

/* ─── Users / Credentials ─────────────────────────────────────── */
export const USERS = [
  {
    id: 'admin_1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Super Admin',
    initials: 'SA',
    branchId: null,
  },
  // Branch Managers
  {
    id: 'MGR001',
    username: 'priya.sharma',
    password: 'manager123',
    role: 'branch_manager',
    name: 'Priya Sharma',
    initials: 'PS',
    branchId: 'B001',
  },
  {
    id: 'MGR002',
    username: 'rahul.verma',
    password: 'manager123',
    role: 'branch_manager',
    name: 'Rahul Verma',
    initials: 'RV',
    branchId: 'B002',
  },
  {
    id: 'MGR003',
    username: 'ananya.patel',
    password: 'manager123',
    role: 'branch_manager',
    name: 'Ananya Patel',
    initials: 'AP',
    branchId: 'B003',
  },
  {
    id: 'MGR004',
    username: 'kiran.nair',
    password: 'manager123',
    role: 'branch_manager',
    name: 'Kiran Nair',
    initials: 'KN',
    branchId: 'B004',
  },
  {
    id: 'MGR005',
    username: 'deepa.reddy',
    password: 'manager123',
    role: 'branch_manager',
    name: 'Deepa Reddy',
    initials: 'DR',
    branchId: 'B005',
  },
  // Cashiers
  {
    id: 'CSH001',
    username: 'cashier1',
    password: 'cashier123',
    role: 'cashier',
    name: 'Suresh Kumar',
    initials: 'SK',
    branchId: 'B001',
  },
  {
    id: 'CSH002',
    username: 'cashier2',
    password: 'cashier123',
    role: 'cashier',
    name: 'Meena Iyer',
    initials: 'MI',
    branchId: 'B002',
  },
];

/* ─── Branch Inventory (isolated per branch) ──────────────────── */
const buildInventory = (branchId) => {
  const base = [
    { id: 1,  name: 'Amul Full Cream Milk 1L', category: 'Dairy',         brand: 'Amul',    price: 68,  reorder_level: 20, unit: 'packets' },
    { id: 2,  name: 'Tata Salt 1kg',           category: 'Grocery',       brand: 'Tata',    price: 25,  reorder_level: 25, unit: 'packs'   },
    { id: 3,  name: 'Surf Excel 1kg',           category: 'Household',     brand: 'HUL',     price: 190, reorder_level: 15, unit: 'packs'   },
    { id: 4,  name: 'Cotton T-Shirt (M)',        category: 'Clothing',      brand: 'RetailQ', price: 249, reorder_level: 20, unit: 'pieces'  },
    { id: 5,  name: 'Fortune Oil 1L',           category: 'Grocery',       brand: 'Fortune', price: 148, reorder_level: 30, unit: 'bottles' },
    { id: 6,  name: 'Parle-G Biscuit 800g',     category: 'Grocery',       brand: 'Parle',   price: 82,  reorder_level: 40, unit: 'packs'   },
    { id: 7,  name: 'Lux Soap (pack of 3)',      category: 'Household',     brand: 'HUL',     price: 90,  reorder_level: 20, unit: 'packs'   },
    { id: 8,  name: 'Bonjour Face Wash',         category: 'Personal Care', brand: 'Bonjour', price: 120, reorder_level: 15, unit: 'bottles' },
    { id: 9,  name: 'Aashirvaad Atta 5kg',       category: 'Grocery',       brand: 'ITC',     price: 295, reorder_level: 20, unit: 'bags'    },
    { id: 10, name: 'Women Kurti (XL)',          category: 'Clothing',      brand: 'RetailQ', price: 399, reorder_level: 10, unit: 'pieces'  },
    { id: 11, name: 'Amul Butter 500g',          category: 'Dairy',         brand: 'Amul',    price: 265, reorder_level: 15, unit: 'packs'   },
    { id: 12, name: 'Dettol Floor Cleaner',      category: 'Household',     brand: 'Reckitt', price: 155, reorder_level: 20, unit: 'bottles' },
    { id: 13, name: 'Colgate MaxFresh 200g',     category: 'Personal Care', brand: 'Colgate', price: 75,  reorder_level: 25, unit: 'tubes'   },
    { id: 14, name: 'Maggi Noodles 4-pack',      category: 'Grocery',       brand: 'Nestle',  price: 72,  reorder_level: 30, unit: 'packs'   },
    { id: 15, name: 'Tropicana Orange 1L',       category: 'Beverages',     brand: 'Tropicana',price: 105, reorder_level: 20, unit: 'bottles' },
  ];

  // Randomize stock per branch
  const seeds = { B001: 7, B002: 13, B003: 3, B004: 19, B005: 11 };
  const seed = seeds[branchId] || 5;
  return base.map((p) => ({
    ...p,
    stock: Math.max(0, (((p.id * seed * 3) % 100) + 5)),
    is_active: true,
  }));
};

/* ─── Inventory Store ─────────────────────────────────────────── */
const inventoryStore = {};
Object.keys(BRANCHES).forEach((bid) => {
  inventoryStore[bid] = buildInventory(bid);
});

/* ─── Revenue Store ───────────────────────────────────────────── */
const revenueStore = {};
Object.keys(BRANCHES).forEach((bid) => {
  revenueStore[bid] = { today: BRANCHES[bid].revenue, month: BRANCHES[bid].monthRevenue, orders: BRANCHES[bid].ordersToday };
});

/* ─── Context ─────────────────────────────────────────────────── */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sris_user')); } catch { return null; }
  });
  const [inventory, setInventory] = useState(inventoryStore);
  const [revenue, setRevenue] = useState(revenueStore);

  const login = async (username, password) => {
    try {
      // Make a call to the backend so the login is logged in the terminal
      await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    } catch (error) {
      console.warn("Backend auth logging failed, proceeding with mock auth:", error);
    }

    const found = USERS.find(u => u.username === username && u.password === password);
    if (!found) return { ok: false, error: 'Invalid username or password' };
    setUser(found);
    sessionStorage.setItem('sris_user', JSON.stringify(found));
    return { ok: true, user: found };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('sris_user');
  };

  /* Reduce stock when sale is made */
  const deductStock = (branchId, items) => {
    setInventory(prev => {
      const branch = [...(prev[branchId] || [])];
      items.forEach(({ productId, quantity }) => {
        const idx = branch.findIndex(p => p.id === productId);
        if (idx !== -1) {
          branch[idx] = { ...branch[idx], stock: Math.max(0, branch[idx].stock - quantity) };
        }
      });
      return { ...prev, [branchId]: branch };
    });
  };

  /* Reorder (fill to 2× reorder_level) a single item */
  const reorderItem = (branchId, productId) => {
    setInventory(prev => {
      const branch = [...(prev[branchId] || [])];
      const idx = branch.findIndex(p => p.id === productId);
      if (idx !== -1) {
        const fillQty = branch[idx].reorder_level * 2;
        branch[idx] = { ...branch[idx], stock: fillQty, _reordered: true };
      }
      return { ...prev, [branchId]: branch };
    });
  };

  /* Fill ALL low-stock items in a branch */
  const fillAllLowStock = (branchId) => {
    setInventory(prev => {
      const branch = (prev[branchId] || []).map(p => {
        if (p.stock < p.reorder_level) {
          return { ...p, stock: p.reorder_level * 2, _reordered: true };
        }
        return p;
      });
      return { ...prev, [branchId]: branch };
    });
  };

  /* Add revenue after a sale */
  const addRevenue = (branchId, amount) => {
    setRevenue(prev => ({
      ...prev,
      [branchId]: {
        today: (prev[branchId]?.today || 0) + amount,
        month: (prev[branchId]?.month || 0) + amount,
        orders: (prev[branchId]?.orders || 0) + 1,
      },
    }));
  };

  const getBranchInventory = (branchId) => inventory[branchId] || [];
  const getBranchRevenue   = (branchId) => revenue[branchId]   || { today: 0, month: 0, orders: 0 };

  return (
    <AuthContext.Provider value={{
      user, login, logout,
      inventory, revenue,
      deductStock, reorderItem, fillAllLowStock, addRevenue,
      getBranchInventory, getBranchRevenue,
      BRANCHES, USERS,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
