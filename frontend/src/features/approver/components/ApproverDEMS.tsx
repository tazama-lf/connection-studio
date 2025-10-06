import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ArrowLeft } from 'lucide-react';

interface ApproverDEMSProps {
  onBack: () => void;
}

const ApproverDEMS: React.FC<ApproverDEMSProps> = ({ onBack }) => {
  const [endpoints] = useState([]);

  const handleApprove = (id: number) => {
    console.log('Approve endpoint:', id);
  };

  const handleReject = (id: number) => {
    console.log('Reject endpoint:', id);
  };

  const handleView = (id: number) => {
    console.log('View endpoint:', id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="DEMS - Endpoint Approval" />
      <div className="p-8">
        <div className="mb-6 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">DEMS - Endpoint Approval</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
          {endpoints.length === 0 ? (
            <p className="text-gray-500">No endpoints pending approval</p>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint: any) => (
                <div key={endpoint.id} className="border rounded p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{endpoint.name}</h3>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleView(endpoint.id)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleApprove(endpoint.id)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(endpoint.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Reject
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

export default ApproverDEMS;
