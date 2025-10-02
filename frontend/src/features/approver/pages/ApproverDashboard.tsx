import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { CheckCircleIcon, ClockIcon, XCircleIcon, TrendingUpIcon } from 'lucide-react';
import ApprovalList, { type ApprovalEndpoint } from '../components/ApprovalList';
import { APP_CONFIG } from '../../../shared/config/app.config';

// Sample data for approver dashboard
const sampleEndpoints: ApprovalEndpoint[] = [
  {
    id: 1,
    path: '/v1/evaluate/ACM102/iso20022/pacs.008.001.011-transfers',
    tenantId: 'ACM102',
    createdOn: '2023-10-15',
    lastUpdated: '2023-11-02',
    status: 'Ready for Approval',
    createdBy: 'john.editor'
  },
  {
    id: 2,
    path: '/v1/evaluate/FIN345/iso8583/0200-payments',
    tenantId: 'FIN345',
    createdOn: '2023-11-05',
    lastUpdated: '2023-11-05',
    status: 'In-Progress',
    createdBy: 'jane.editor'
  },
  {
    id: 3,
    path: '/v1/evaluate/BNK123/iso20022/pacs.002.001.011-transfers',
    tenantId: 'BNK123',
    createdOn: '2023-08-30',
    lastUpdated: '2023-10-28',
    status: 'Ready for Approval',
    createdBy: 'bob.editor'
  },
  {
    id: 4,
    path: '/v1/evaluate/GLB789/iso20022/pain.013.001.010-payments',
    tenantId: 'GLB789',
    createdOn: '2023-07-12',
    lastUpdated: '2023-09-18',
    status: 'Ready for Approval',
    createdBy: 'alice.editor'
  },
  {
    id: 5,
    path: '/v1/evaluate/PAY456/iso20022/pacs.008.001.011-payments',
    tenantId: 'PAY456',
    createdOn: '2023-11-01',
    lastUpdated: '2023-11-01',
    status: 'Suspended',
    createdBy: 'charlie.editor'
  }
];

const ApproverDashboard: React.FC = () => {
  const [endpoints, setEndpoints] = useState<ApprovalEndpoint[]>(sampleEndpoints);

  const stats = {
    pendingApproval: endpoints.filter(e => e.status === 'Ready for Approval').length,
    inProgress: endpoints.filter(e => e.status === 'In-Progress').length,
    suspended: endpoints.filter(e => e.status === 'Suspended').length,
    totalEndpoints: endpoints.length
  };

  const handleApprove = (id: number) => {
    setEndpoints(prev => 
      prev.map(endpoint => 
        endpoint.id === id 
          ? { ...endpoint, status: 'In-Progress' as const, lastUpdated: new Date().toISOString().split('T')[0] }
          : endpoint
      )
    );
    // Here you would typically make an API call to approve the endpoint
    console.log(`Approved endpoint ${id}`);
  };

  const handleReject = (id: number) => {
    setEndpoints(prev => 
      prev.map(endpoint => 
        endpoint.id === id 
          ? { ...endpoint, status: 'Suspended' as const, lastUpdated: new Date().toISOString().split('T')[0] }
          : endpoint
      )
    );
    // Here you would typically make an API call to reject the endpoint
    console.log(`Rejected endpoint ${id}`);
  };

  const handleView = (id: number) => {
    // Navigate to endpoint details or open modal
    console.log(`Viewing endpoint ${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title={APP_CONFIG.name} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Approver Dashboard
          </h1>
          <p className="text-gray-600">
            Review and approve endpoint configurations submitted by editors
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <ClockIcon size={24} className="text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.pendingApproval}
                </h3>
                <p className="text-sm text-gray-600">Pending Approval</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <TrendingUpIcon size={24} className="text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.inProgress}
                </h3>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <XCircleIcon size={24} className="text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.suspended}
                </h3>
                <p className="text-sm text-gray-600">Suspended</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircleIcon size={24} className="text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.totalEndpoints}
                </h3>
                <p className="text-sm text-gray-600">Total Endpoints</p>
              </div>
            </div>
          </div>
        </div>

        {/* Approval List */}
        <ApprovalList
          endpoints={endpoints}
          onApprove={handleApprove}
          onReject={handleReject}
          onView={handleView}
        />
      </main>
    </div>
  );
};

export default ApproverDashboard;