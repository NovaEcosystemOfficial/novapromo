import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && (location.pathname === '/' || location.pathname === '')) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner auth-spinner--large" />
        <p>Caricamento sessione…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
