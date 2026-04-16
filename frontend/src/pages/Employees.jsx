import { useState, useEffect } from 'react';
import { Plus, Briefcase, Clock, IndianRupee, Search, Users } from 'lucide-react';
import axios from 'axios';

const DEMO_EMPS = [
  { id: 1, name: 'Priya Sharma',  role: 'Cashier',       shift: 'Morning', attendance_status: 'PRESENT', salary: 18000 },
  { id: 2, name: 'Rahul Mehta',   role: 'Supervisor',    shift: 'Morning', attendance_status: 'PRESENT', salary: 28000 },
  { id: 3, name: 'Anita Kumar',   role: 'Storekeeper',   shift: 'Evening', attendance_status: 'ABSENT',  salary: 16000 },
  { id: 4, name: 'Vikram Das',    role: 'Security Guard',shift: 'Night',   attendance_status: 'PRESENT', salary: 15000 },
  { id: 5, name: 'Sunita Rao',    role: 'Cashier',       shift: 'Morning', attendance_status: 'PRESENT', salary: 18000 },
  { id: 6, name: 'Mohan Lal',     role: 'Floor Manager', shift: 'Morning', attendance_status: 'LEAVE',   salary: 24000 },
  { id: 7, name: 'Kavya Iyer',    role: 'Cashier',       shift: 'Evening', attendance_status: 'PRESENT', salary: 18000 },
  { id: 8, name: 'Deepak Singh',  role: 'Storekeeper',   shift: 'Morning', attendance_status: 'PRESENT', salary: 16000 },
  { id: 9, name: 'Ritu Verma',    role: 'Cashier',       shift: 'Evening', attendance_status: 'PRESENT', salary: 18000 },
  { id: 10, name: 'Arjun Nair',   role: 'Security Guard',shift: 'Night',  attendance_status: 'ABSENT',  salary: 15000 },
  { id: 11, name: 'Meena Pillai', role: 'Floor Manager', shift: 'Evening', attendance_status: 'PRESENT', salary: 24000 },
  { id: 12, name: 'Sanjay Gupta', role: 'Supervisor',    shift: 'Evening', attendance_status: 'PRESENT', salary: 28000 },
];

const AVATAR_COLORS = [
  'var(--blue)', 'var(--green)', 'var(--yellow)',
  'var(--pink)', 'var(--peach)', 'var(--lavender)',
];

const roleIcon = (role) => {
  const icons = { Cashier: '💳', Supervisor: '🎯', Storekeeper: '📦', 'Security Guard': '🛡️', 'Floor Manager': '📋' };
  return icons[role] || '👤';
};

export default function Employees() {
  const [employees, setEmployees] = useState(DEMO_EMPS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    axios.get('http://localhost:8000/api/employees')
      .then(r => { if (r.data.length) setEmployees(r.data); })
      .catch(() => {});
  }, []);

  const present = employees.filter(e => e.attendance_status === 'PRESENT').length;
  const absent  = employees.filter(e => e.attendance_status === 'ABSENT').length;
  const onLeave = employees.filter(e => e.attendance_status === 'LEAVE').length;

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || e.attendance_status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Staff Management</h2>
          <p className="page-subtitle">Manage employee records, shifts, and attendance · {employees.length} staff members</p>
        </div>
        <button className="btn btn-peach"><Plus size={18} /> Add Staff</button>
      </div>

      {/* SUMMARY ROW */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Present',  count: present,  bg: 'var(--green)',    color: 'var(--green-dark)',  icon: <Users size={20}/> },
          { label: 'Absent',   count: absent,   bg: 'var(--pink)',     color: 'var(--pink-dark)',   icon: <Users size={20}/> },
          { label: 'On Leave', count: onLeave,  bg: 'var(--yellow)',   color: 'var(--yellow-dark)', icon: <Users size={20}/> },
          { label: 'Total',    count: employees.length, bg: 'var(--lavender)', color: 'var(--lavender-dark)', icon: <Users size={20}/> },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(255,255,255,0.6)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.6)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTER */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="search-input-wrap" style={{ flex: 1 }}>
          <Search size={18} className="search-icon" />
          <input className="search-input" placeholder="Search by name or role..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-pills" style={{ marginBottom: 0, flexWrap: 'nowrap' }}>
          {['All', 'PRESENT', 'ABSENT', 'LEAVE'].map(f => (
            <button key={f} className={`filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)} style={{ whiteSpace: 'nowrap' }}>
              {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* EMPLOYEE GRID */}
      {filtered.length === 0 ? (
        <div className="empty-state"><Users size={64} /><h3>No staff found</h3><p>Try adjusting your search filters.</p></div>
      ) : (
        <div className="grid-3" style={{ gap: 16 }}>
          {filtered.map((emp, i) => {
            const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2);
            const attClass = emp.attendance_status === 'PRESENT' ? 'attendance-present' : emp.attendance_status === 'ABSENT' ? 'attendance-absent' : 'attendance-leave';
            return (
              <div className="employee-card" key={emp.id}>
                <div className="employee-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {initials}
                </div>
                <div className="employee-info">
                  <div className="employee-name">{emp.name}</div>
                  <div className="employee-role">
                    <span>{roleIcon(emp.role)}</span> {emp.role}
                  </div>
                  <div className="employee-chips">
                    <span className="employee-chip"><Clock size={10} style={{ display: 'inline', marginRight: 3 }}/>{emp.shift} Shift</span>
                    <span className="employee-chip"><IndianRupee size={10} style={{ display: 'inline', marginRight: 2 }}/>₹{(emp.salary || 0).toLocaleString('en-IN')}/mo</span>
                  </div>
                </div>
                <div className="employee-actions">
                  <span className={`attendance-badge ${attClass}`}>{emp.attendance_status}</span>
                  <button className="btn-sm btn-sm-indigo" style={{ marginTop: 8 }}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
