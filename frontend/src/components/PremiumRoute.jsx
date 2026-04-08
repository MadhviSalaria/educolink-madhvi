import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PremiumAccess from '../pages/PremiumAccess';

export default function PremiumRoute({ children }) {
  const location = useLocation();
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="module-page">
        <div className="feature-card">
          <div className="feature-card-title">Loading access...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role === 'wellwisher') {
    return <Navigate to="/wellwisher" replace />;
  }

  if (user.isPremium) {
    return children;
  }

  return <PremiumAccess lockedPath={location.pathname} />;
}
