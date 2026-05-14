import React, { useState } from 'react';
import { ActivityIcon, ArrowLeft } from 'lucide-react';
import { ConfigList } from '../../config/components/ConfigList';
import { configApi } from '../../config/services/configApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { Config } from '../../config/index';
import { ApproverConfigDetailsModal } from './ApproverConfigDetailsModal';
import { useAuth } from '../../auth/contexts/AuthContext';

interface ApproverDEMSProps {
  onBack: () => void;
}

const INITIAL_REFRESH_KEY = 0;
const INCREMENT = 1;

const ApproverDEMS: React.FC<ApproverDEMSProps> = ({ onBack }) => {
  const [refreshKey, setRefreshKey] = useState(INITIAL_REFRESH_KEY);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const handleApprove = async (configId: number): Promise<void> => {
    try {
      const result = await configApi.approveConfig(configId);

      if (result.success) {
        showSuccess(
          'Configuration approved successfully and sent for deployment',
        );
        setRefreshKey((prev): number => prev + INCREMENT);
      } else if (result.message) {
        showError(result.message);
      } else {
        showError('Failed to approve configuration');
      }
    } catch (error) {
      showError('Failed to approve configuration. Please try again.');
    }
  };

  const handleReject = async (config: Config): Promise<void> => {
    try {
      const reason = prompt(
        'Please provide a reason for rejection (optional):',
      );

      const userId = user?.email ?? user?.username ?? 'system';
      const result = await configApi.rejectConfig(
        config.id,
        userId,
        reason ?? 'Configuration rejected by approver',
      );

      if (result.success) {
        showSuccess(
          'Configuration rejected and returned to editor for changes',
        );
        setRefreshKey((prev): number => prev + INCREMENT);
      } else if (result.message) {
        showError(result.message);
      } else {
        showError('Failed to reject configuration');
      }
    } catch (error) {
      showError('Failed to reject configuration. Please try again.');
    }
  };

  const handleViewDetails = (config: Config): void => {
    setSelectedConfig(config);
    setShowViewModal(true);
  };

  const handleCloseViewModal = (): void => {
    setShowViewModal(false);
    setSelectedConfig(null);
  };

  return (
    <div className="min-h-screen bg-white">
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
            <h1 className="text-3xl font-bold text-gray-900">
              Dynamic Event Monitoring Service
            </h1>
            <p className="text-gray-600 mt-2">
              Review and approve pending endpoint configurations
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ActivityIcon size={28} style={{ color: '#3b82f6' }} />
              Dynamic Event Monitoring Service
            </h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Pending Approvals
                </h2>
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
            showPendingApprovals={true}
            onViewDetails={(config: Config): void => {
              handleViewDetails(config);
            }}
            onApprove={async (configId: number): Promise<void> => {
              await handleApprove(configId);
            }}
            onReject={async (config: Config): Promise<void> => {
              await handleReject(config);
            }}
          />
        </div>
      </div>

      {/* View Config Modal */}
      {showViewModal && selectedConfig && (
        <ApproverConfigDetailsModal
          isOpen={showViewModal}
          onClose={handleCloseViewModal}
          config={selectedConfig}
          onApprove={async (configId): Promise<void> => {
            await handleApprove(configId);
          }}
          onReject={async (config): Promise<void> => {
            await handleReject(config);
          }}
        />
      )}
    </div>
  );
};

export default ApproverDEMS;
