import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ArrowLeft, SearchIcon } from 'lucide-react';
import { ConfigList } from '../../config/components/ConfigList';
import { configApi } from '../../config/services/configApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { Config } from '../../config/index';
import { ApproverConfigDetailsModal } from './ApproverConfigDetailsModal';
import { useAuth } from '../../auth/contexts/AuthContext';

interface ApproverDEMSProps {
  onBack: () => void;
}

const ApproverDEMS: React.FC<ApproverDEMSProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { showSuccess, showError } = useToast();
const { user } = useAuth();

  const handleApprove = async (configId: number) => {
    try {
      console.log('Approving config:', configId);
      const result = await configApi.approveConfig(configId);
      
      if (result.success) {
        showSuccess('Configuration approved successfully and sent for deployment');
        setRefreshKey(prev => prev + 1); // Refresh the list
      } else {
        showError(result.message || 'Failed to approve configuration');
      }
    } catch (error) {
      console.error('Approval failed:', error);
      showError('Failed to approve configuration. Please try again.');
    }
  };

  const handleReject = async (config: Config) => {
    try {
      const reason = prompt('Please provide a reason for rejection (optional):');
      // Allow empty reason, don't cancel on empty string
      
     console.log('Rejecting config:', config.id, 'with reason:', reason);
      const userId = user?.email || user?.username || 'system';
      const result = await configApi.rejectConfig(config.id, userId, reason || 'Configuration rejected by approver');
      
      if (result.success) {
        showSuccess('Configuration rejected and returned to editor for changes');
        setRefreshKey(prev => prev + 1); // Refresh the list
      } else {
        showError(result.message || 'Failed to reject configuration');
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      showError('Failed to reject configuration. Please try again.');
    }
  };

  const handleViewDetails = (config: Config) => {
    setSelectedConfig(config);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedConfig(null);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Dynamic Endpoint Monitoring Service" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dynamic Endpoint Monitoring Service</h1>
            <p className="text-gray-600 mt-2">Review and approve pending endpoint configurations</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search configurations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Pending Approvals</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Review and approve configurations submitted by editors
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  Under Review
                </div>
              </div>
            </div>
          </div>
          
          <ConfigList
            key={refreshKey}
            searchTerm={searchTerm}
            showPendingApprovals={true}
            onViewDetails={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>

      {/* View Config Modal */}
      {showViewModal && selectedConfig && (
        <ApproverConfigDetailsModal
          isOpen={showViewModal}
          onClose={handleCloseViewModal}
          config={selectedConfig}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default ApproverDEMS;
