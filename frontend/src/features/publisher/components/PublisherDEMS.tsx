import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ArrowLeft } from 'lucide-react';

interface PublisherDEMSProps {
  onBack?: () => void;
}

const PublisherDEMS: React.FC<PublisherDEMSProps> = ({ onBack }) => {
  const [endpoints] = useState([]);

  const handleDeploy = (endpoint: any) => {
    console.log('Deploy endpoint:', endpoint);
    // TODO: Implement with new backend API
  };

  const handleViewHistory = (endpoint: any) => {
    console.log('View history:', endpoint);
    // TODO: Implement with new backend API
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="DEMS - Endpoint Deployment" />
      <div className="p-8">
        {onBack && (
          <div className="mb-6 flex items-center">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-8">DEMS - Endpoint Deployment</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Ready for Deployment</h2>
          {endpoints.length === 0 ? (
            <p className="text-gray-500">No endpoints ready for deployment</p>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint: any) => (
                <div key={endpoint.id} className="border rounded p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{endpoint.name}</h3>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded mt-2">
                        Approved
                      </span>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleViewHistory(endpoint)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        View History
                      </button>
                      <button
                        onClick={() => handleDeploy(endpoint)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        Deploy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherDEMS;
