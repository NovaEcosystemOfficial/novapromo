import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { isDemoMode } from '../../lib/features.js';
import { normalizeReturnPath } from '../../lib/postAuthRedirect.js';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const demo = isDemoMode();
  const returnPath = normalizeReturnPath(`${location.pathname}${location.search}`);

  useEffect(() => {
    if (!loading && user && (location.pathname === '/' || location.pathname === '')) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  if (loading && !demo) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner auth-spinner--large" />
        <p>Caricamento sessione…</p>
      </div>
    );
  }

  if (!user && !demo) {
    return <Navigate to="/login" state={{ from: returnPath }} replace />;
  }

  return children;
}
