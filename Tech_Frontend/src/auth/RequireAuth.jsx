import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

// Component to protect routes that require authentication
const RequireAuth = ({ children, role }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="p-6">Loading...</div>; // Show loading state while checking authentication
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />; // Redirect to login if not authenticated
  }

  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />; // Redirect if user doesn't have the required role
    }
  }

  return children; // Render the protected component if authenticated and has the required role
}

export default RequireAuth;