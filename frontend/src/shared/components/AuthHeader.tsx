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
  return <header className="bg-white shadow" data-id="element-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" data-id="element-21">
        <div className="flex justify-between items-center" data-id="element-22">
          <div className="flex items-center" data-id="element-23">
            {showBackButton && <Button variant="secondary" size="sm" className="mr-4" onClick={handleBack} icon={<ChevronLeftIcon size={16} data-id="element-25" />} data-id="element-24">
                Back
              </Button>}
            <h1 className="text-2xl font-bold text-gray-800" data-id="element-26">{title}</h1>
          </div>
          {user && <div className="flex items-center space-x-4" data-id="element-27">
              <div className="text-sm text-gray-700" data-id="element-28">
                <span className="font-medium" data-id="element-29">{user.name}</span>
                <span className="mx-1" data-id="element-30">-</span>
                <span data-id="element-31">{user.role}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout} icon={<LogOutIcon size={16} data-id="element-33" />} data-id="element-32">
                Logout
              </Button>
            </div>}
        </div>
      </div>
    </header>;
};

export { AuthHeader };