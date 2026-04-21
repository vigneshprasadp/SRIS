import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, BRANCHES } from '../context/AuthContext';
import { ShoppingCart, Shield, Building2, CreditCard, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

/* ─── Gelato Days Palette ─────────────────────────────────────── */
const G = {
  pink:     '#FFCBE1',
  green:    '#D6E5BD',
  yellow:   '#F9E1A8',
  blue:     '#BCD8EC',
  lavender: '#DCCCEC',
  peach:    '#FFDAB4',
  pinkDark:     '#c45c8a',
  greenDark:    '#5a8a3a',
  yellowDark:   '#a07800',
  blueDark:     '#3570a0',
  lavenderDark: '#6c4cb0',
  peachDark:    '#b06020',
};

const ROLE_CARDS = [
  {
    role:       'admin',
    label:      'Super Admin',
    subtitle:   'All branches · Full control',
    icon:       Shield,
    bg:         G.lavender,
    border:     G.lavenderDark,
    textColor:  G.lavenderDark,
    badge:      '👑',
    credentials: { username: 'admin', password: 'admin123' },
  },
  {
    role:       'branch_manager',
    label:      'Branch Manager',
    subtitle:   'Single branch · Operations',
    icon:       Building2,
    bg:         G.blue,
    border:     G.blueDark,
    textColor:  G.blueDark,
    badge:      '🏢',
    credentials: { username: 'priya.sharma', password: 'manager123' },
  },
  {
    role:       'cashier',
    label:      'Cashier',
    subtitle:   'POS billing only',
    icon:       CreditCard,
    bg:         G.green,
    border:     G.greenDark,
    textColor:  G.greenDark,
    badge:      '💳',
    credentials: { username: 'cashier1', password: 'cashier123' },
  },
];

const BRANCH_MANAGER_USERS = [
  { username: 'priya.sharma',  name: 'Priya Sharma',  branch: 'B001' },
  { username: 'rahul.verma',   name: 'Rahul Verma',   branch: 'B002' },
  { username: 'ananya.patel',  name: 'Ananya Patel',  branch: 'B003' },
  { username: 'kiran.nair',    name: 'Kiran Nair',    branch: 'B004' },
  { username: 'deepa.reddy',   name: 'Deepa Reddy',   branch: 'B005' },
];

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.7)',
  border: `1.5px solid rgba(0,0,0,0.1)`,
  borderRadius: 12,
  color: '#1a1a2e',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color .2s, box-shadow .2s',
  backdropFilter: 'blur(8px)',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleRoleSelect = (card) => {
    setSelectedRole(card);
    setUsername(card.credentials.username);
    setPassword(card.credentials.password);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter your credentials'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 600));
    const result = await login(username, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
    } else {
      // Explicitly navigate rather than relying purely on GuestRoute wrapper
      if (result.user.role === 'admin') navigate('/admin');
      else if (result.user.role === 'cashier') navigate('/pos');
      else navigate('/');
    }
  };

  const activePalette = selectedRole
    ? { bg: selectedRole.bg, border: selectedRole.border, text: selectedRole.textColor }
    : { bg: G.lavender, border: G.lavenderDark, text: G.lavenderDark };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${G.lavender} 0%, ${G.blue} 35%, ${G.pink} 65%, ${G.peach} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'absolute', top:-80, left:-80, width:320, height:320, borderRadius:'50%', background:G.yellow, opacity:.35, filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-100, right:-60, width:380, height:380, borderRadius:'50%', background:G.pink, opacity:.4, filter:'blur(70px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'35%', right:'10%', width:200, height:200, borderRadius:'50%', background:G.green, opacity:.3, filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'20%', left:'5%', width:180, height:180, borderRadius:'50%', background:G.peach, opacity:.35, filter:'blur(45px)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:960, display:'flex', flexDirection:'column', gap:28, position:'relative', zIndex:1 }}>

        {/* ── HEADER ───────────────────────────── */}
        <div style={{ textAlign:'center' }}>
          {/* Logo pill */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:12, marginBottom:20,
            background:'rgba(255,255,255,0.65)',
            border:`1.5px solid rgba(255,255,255,0.9)`,
            borderRadius:24, padding:'10px 24px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.08)',
            backdropFilter:'blur(12px)',
          }}>
            <div style={{
              width:38, height:38, borderRadius:11,
              background:`linear-gradient(135deg,${G.lavenderDark},${G.blueDark})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 4px 12px rgba(108,76,176,.35)`,
            }}>
              <ShoppingCart size={18} color="white" />
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:20, fontWeight:900, color:'#1a1a2e', letterSpacing:-.5, lineHeight:1 }}>RetailQ</div>
              <div style={{ fontSize:10, fontWeight:700, color:G.lavenderDark, letterSpacing:1.2, textTransform:'uppercase' }}>SRIS Platform</div>
            </div>
          </div>

          <h1 style={{ fontSize:34, fontWeight:900, color:'#1a1a2e', letterSpacing:-1, margin:'0 0 8px', textShadow:'0 2px 16px rgba(255,255,255,.6)' }}>
            Retail Intelligence System
          </h1>
          <p style={{ color:'rgba(26,26,46,.55)', fontSize:15, margin:0, fontWeight:500 }}>
            Select your role to sign in
          </p>
        </div>

        {/* ── ROLE CARDS ───────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            const isSelected = selectedRole?.role === card.role;
            return (
              <button
                key={card.role}
                onClick={() => handleRoleSelect(card)}
                style={{
                  background: isSelected
                    ? card.bg
                    : 'rgba(255,255,255,0.5)',
                  border: `2px solid ${isSelected ? card.border : 'rgba(255,255,255,0.8)'}`,
                  borderRadius: 20,
                  padding: '24px 20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .22s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isSelected
                    ? `0 8px 32px ${card.border}40, 0 2px 8px rgba(0,0,0,0.06)`
                    : '0 2px 12px rgba(0,0,0,0.06)',
                  transform: isSelected ? 'translateY(-5px) scale(1.02)' : 'none',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Shine overlay when selected */}
                {isSelected && (
                  <div style={{
                    position:'absolute', inset:0, borderRadius:18,
                    background:'linear-gradient(135deg,rgba(255,255,255,.35) 0%,transparent 60%)',
                    pointerEvents:'none',
                  }}/>
                )}

                <div style={{ fontSize:34, marginBottom:12 }}>{card.badge}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <Icon size={16} color={isSelected ? card.textColor : '#64748b'} />
                  <span style={{
                    fontSize:15, fontWeight:800,
                    color: isSelected ? card.textColor : '#1e293b',
                  }}>{card.label}</span>
                  {isSelected && (
                    <div style={{
                      marginLeft:'auto', width:20, height:20, borderRadius:'50%',
                      background: card.border, opacity:.8,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <ArrowRight size={11} color="white" />
                    </div>
                  )}
                </div>
                <p style={{
                  margin:0, fontSize:12, fontWeight:500,
                  color: isSelected ? `${card.textColor}cc` : '#94a3b8',
                }}>{card.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* ── LOGIN FORM ───────────────────────── */}
        {selectedRole && (
          <div style={{
            background:'rgba(255,255,255,0.72)',
            border:`1.5px solid rgba(255,255,255,0.92)`,
            borderRadius:24,
            padding:'32px',
            backdropFilter:'blur(20px)',
            boxShadow:'0 16px 56px rgba(0,0,0,0.1)',
            animation:'slideUp .28s cubic-bezier(.4,0,.2,1)',
          }}>
            {/* Form header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <div style={{
                width:40, height:40, borderRadius:12,
                background: selectedRole.bg,
                border:`2px solid ${selectedRole.border}40`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <selectedRole.icon size={18} color={selectedRole.textColor} />
              </div>
              <div>
                <h2 style={{ color:'#1a1a2e', fontSize:17, fontWeight:800, margin:0, lineHeight:1.2 }}>
                  Sign in as {selectedRole.label}
                </h2>
                <p style={{ margin:0, fontSize:12, color:'#64748b', fontWeight:500 }}>
                  {selectedRole.subtitle}
                </p>
              </div>
            </div>

            {/* Branch manager picker */}
            {selectedRole.role === 'branch_manager' && (
              <div style={{ marginBottom:22 }}>
                <label style={{
                  display:'block', fontSize:11, fontWeight:700,
                  color:'#64748b', marginBottom:10,
                  textTransform:'uppercase', letterSpacing:1,
                }}>
                  Select Branch Manager
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {BRANCH_MANAGER_USERS.map(mgr => {
                    const branch = BRANCHES[mgr.branch];
                    const isActive = username === mgr.username;
                    return (
                      <button
                        key={mgr.username}
                        type="button"
                        onClick={() => { setUsername(mgr.username); setPassword('manager123'); }}
                        style={{
                          background: isActive ? G.blue : 'rgba(255,255,255,0.6)',
                          border: `1.5px solid ${isActive ? G.blueDark : 'rgba(0,0,0,0.1)'}`,
                          borderRadius:12, padding:'10px 12px',
                          cursor:'pointer', textAlign:'left', transition:'all .18s',
                          boxShadow: isActive ? `0 4px 12px ${G.blueDark}30` : 'none',
                        }}
                      >
                        <div style={{ fontSize:11, fontWeight:800, color: isActive ? G.blueDark : '#334155' }}>
                          {mgr.name}
                        </div>
                        <div style={{ fontSize:10, color: isActive ? G.blueDark : '#94a3b8', marginTop:2, fontWeight:500 }}>
                          {branch?.name.replace('RetailQ ','')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {/* Username */}
                <div>
                  <label style={{
                    display:'block', fontSize:11, fontWeight:700,
                    color:'#64748b', marginBottom:8,
                    textTransform:'uppercase', letterSpacing:1,
                  }}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = activePalette.border; e.target.style.boxShadow = `0 0 0 3px ${activePalette.bg}`; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none'; }}
                    placeholder="Enter username"
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display:'block', fontSize:11, fontWeight:700,
                    color:'#64748b', marginBottom:8,
                    textTransform:'uppercase', letterSpacing:1,
                  }}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight:48 }}
                      onFocus={e => { e.target.style.borderColor = activePalette.border; e.target.style.boxShadow = `0 0 0 3px ${activePalette.bg}`; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.boxShadow = 'none'; }}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer', color:'#94a3b8',
                        display:'flex', alignItems:'center', padding:0,
                      }}
                    >
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: G.pink,
                    border:`1px solid ${G.pinkDark}40`,
                    borderRadius:10, padding:'10px 14px',
                    color: G.pinkDark, fontSize:13, fontWeight:700,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding:'14px 24px',
                    background: loading
                      ? 'rgba(0,0,0,0.06)'
                      : `linear-gradient(135deg, ${activePalette.bg}, ${activePalette.bg}cc)`,
                    border: `2px solid ${activePalette.border}60`,
                    borderRadius:14, color: activePalette.text,
                    fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    transition:'all .2s',
                    boxShadow: loading ? 'none' : `0 6px 24px ${activePalette.border}30`,
                    letterSpacing:.3,
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 10px 32px ${activePalette.border}45`; }}}
                  onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`0 6px 24px ${activePalette.border}30`; }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width:16, height:16,
                        border:`2.5px solid ${activePalette.border}50`,
                        borderTopColor: activePalette.text,
                        borderRadius:'50%',
                        animation:'spin .7s linear infinite',
                      }} />
                      Signing in…
                    </>
                  ) : (
                    <>Sign In <ArrowRight size={16}/></>
                  )}
                </button>
              </div>
            </form>

            {/* Hint */}
            <div style={{
              marginTop:16, padding:'10px 14px',
              background: activePalette.bg + '60',
              borderRadius:10, fontSize:11.5, color: activePalette.text,
              fontWeight:600, display:'flex', alignItems:'center', gap:6,
            }}>
              <Sparkles size={12}/> Demo credentials are pre-filled — just click Sign In.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:12, color:'rgba(26,26,46,.4)', fontWeight:500, margin:0 }}>
            RetailQ SRIS · Enterprise Retail Intelligence Platform · Bengaluru Region
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        input::placeholder { color:#b0bec5; }
      `}</style>
    </div>
  );
}
