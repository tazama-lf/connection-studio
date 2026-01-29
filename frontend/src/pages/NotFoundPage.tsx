import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../shared/components/Button';
import { ROUTES } from '../shared/config/routes.config';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <img
            className="h-16 w-auto"
            src="/logo.png"
            alt="Tazama Logo"
          />
        </div>
        <div className="text-6xl font-bold text-gray-400 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-4">
          <Button 
            onClick={() => navigate(ROUTES.LOGIN)}
            className="w-full"
          >
            Go to Login
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
