import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protects a route by allowed roles.
 * If not logged in → redirect to /login
 * If logged in but wrong role → redirect to home
 */
export function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Cashiers go to POS, others to home
    if (user.role === 'cashier') return <Navigate to="/pos" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Redirect from /login if already authenticated
 */
export function GuestRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'cashier') return <Navigate to="/pos" replace />;
  return <Navigate to="/" replace />;
}
