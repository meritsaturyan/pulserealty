import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const ok = !!localStorage.getItem('pulse:admin');
  if (!ok) return <Navigate to="/admin/login" replace />;
  return children;
}


