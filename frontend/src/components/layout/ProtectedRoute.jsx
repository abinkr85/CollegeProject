import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PORTAL_LOGIN_PATH } from '../../portalConfig';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute({ role, children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner fullPage />;
  }

  if (!user) {
    return <Navigate to={PORTAL_LOGIN_PATH} replace />;
  }

  if (role && user.role?.toLowerCase() !== role.toLowerCase()) {
    return <Navigate to={PORTAL_LOGIN_PATH} replace />;
  }

  return children;
}
