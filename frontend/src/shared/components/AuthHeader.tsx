import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOutIcon, ChevronLeftIcon } from 'lucide-react';
import { useAuth } from '../../features/auth/contexts/AuthContext';
import { Button } from './Button';
interface AuthHeaderProps {
  title: string;
  showBackButton?: boolean;
}
 const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  showBackButton = false
}) => {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleBack = () => {
    navigate(-1);
  };

  // Debug logging
  console.log('AuthHeader - Current user:', user);

  return <header className="bg-white shadow" data-id="element-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" data-id="element-21">
        <div className="flex justify-between items-center" data-id="element-22">
          <div className="flex items-center" data-id="element-23">
            {showBackButton && <Button variant="secondary" size="sm" className="mr-4" onClick={handleBack} icon={<ChevronLeftIcon size={16} data-id="element-25" />} data-id="element-24">
                Back
              </Button>}
            <img
              className="h-8 w-auto mr-3"
              src="/logo.png"
              alt="Tazama Logo"
            />
            <h1 className="text-2xl font-bold text-gray-800" data-id="element-26">{title}</h1>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user.username}</span>
                {user.claims && user.claims.length > 0 && (
                  <>
                    <span className="mx-1">-</span>
                    <span>{user.claims.includes('approver') ? 'Approver' : 
                           user.claims.includes('editor') ? 'Editor' : 
                           user.claims.includes('publisher') ? 'Publisher' : 'User'}</span>
                  </>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                icon={<LogOutIcon size={16} />}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>;
};

export { AuthHeader };