import React from 'react';

const LoadingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img
            className="h-16 w-auto"
            src="/logo.png"
            alt="Tazama Logo"
          />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we prepare your workspace</p>
      </div>
    </div>
  );
};

export default LoadingPage;
