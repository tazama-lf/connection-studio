import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface TokenExpirationWarningProps {
  isOpen: boolean;
  timeRemaining: string;
  onExtendSession: () => void;
  onLogout: () => void;
}

export const TokenExpirationWarning: React.FC<TokenExpirationWarningProps> = ({
  isOpen,
  timeRemaining,
  onExtendSession,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          {/* Warning Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Your session will expire in <strong className="text-yellow-600">{timeRemaining}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Would you like to extend your session?
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onExtendSession}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Stay Logged In
              </button>
              <button
                onClick={onLogout}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 Your session will be extended for another 30 minutes if you choose to stay logged in.
          </p>
        </div>
      </div>
    </div>
  );
};
