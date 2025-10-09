import React from 'react';
import { Button } from './Button';
import { AlertTriangleIcon } from 'lucide-react';

interface TokenExpirationModalProps {
  isOpen: boolean;
  onLoginRedirect: () => void;
}

export const TokenExpirationModal: React.FC<TokenExpirationModalProps> = ({
  isOpen,
  onLoginRedirect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangleIcon className="h-6 w-6 text-amber-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Session Expired
            </h3>
          </div>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Your session has expired for security reasons. Please log in again to continue using the application.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={onLoginRedirect}
            className="w-full"
          >
            Return to Login
          </Button>
        </div>
      </div>
    </div>
  );
};