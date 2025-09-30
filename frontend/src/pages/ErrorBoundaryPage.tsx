import React from 'react';
import { Button } from '../shared/components/Button';

interface ErrorBoundaryPageProps {
  error?: Error;
  resetError?: () => void;
}

const ErrorBoundaryPage: React.FC<ErrorBoundaryPageProps> = ({ 
  error, 
  resetError 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl font-bold text-red-400 mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-4">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
            <p className="text-sm text-red-800 font-medium mb-2">Error Details:</p>
            <p className="text-xs text-red-700 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {resetError && (
            <Button 
              onClick={resetError}
              className="w-full"
            >
              Try Again
            </Button>
          )}
          <Button 
            variant="secondary"
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundaryPage;
