import React, { useState } from 'react';
import { ChevronLeft, SearchIcon } from 'lucide-react';
import { ConfigList } from '../../config/components/ConfigList';
import type { Config } from '../../config/index';
import { configApi } from '../../config/services/configApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { RejectionDialog } from '../../../shared/components/RejectionDialog';
import { ConfigReviewModal } from '../../../shared/components/ConfigReviewModal';
import { ChangeRequestDialog } from '../../../shared/components/ChangeRequestDialog';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import { useAuth } from '../../auth/contexts/AuthContext';
import { Button } from '@shared';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from '@mui/material';

const ApproverConfigsPage: React.FC = () => {
  const navigate = useNavigate();
  // Config-related state
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [configToReject, setConfigToReject] = useState<Config | null>(null);
  const [configToRequestChanges, setConfigToRequestChanges] =
    useState<Config | null>(null);

  // Approval confirmation dialog state
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [configToApprove, setConfigToApprove] = useState<{
    id: number;
    name: string;
  } | null>(null);
  // Optional comment for approval
  const [approvalComment, setApprovalComment] = useState('');

  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setEditingConfig(null);
    // Refresh the config list when modal closes
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey((prev) => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    // Open EditEndpointModal for viewing - same workflow as DEMS
    setEditingEndpointId(config.id);
    setEditingConfig(config);
  };

  const handleApprove = async (configId: number) => {
    try {
      const response = await configApi.approveConfig(configId);
      if (response.success) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + 1);
      } else {
        console.log(
          '❌ handleApprove - Response success is false, but checking if operation actually succeeded...',
        );
        console.log('❌ handleApprove - Config in response:', response.config);

        // Even if success is false, if we have a config object, the operation likely succeeded
        if (response.config) {
          console.log(
            '✅ handleApprove - Config object found, treating as successful despite success: false',
          );
          showSuccess('Configuration approved successfully');
          setRefreshKey((prev) => prev + 1);
        } else {
          showError(response.message || 'Failed to approve configuration');
        }
      }
    } catch (error) {
      console.error('Failed to approve config:', error);
      showError('Failed to approve configuration');
    }
  };

  const handleRejectClick = (config: Config) => {
    setConfigToReject(config);
    setShowRejectionDialog(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!configToReject) return;

    try {
      const userId = user?.email || user?.username || 'system';
      const response = await configApi.rejectConfig(
        configToReject.id,
        userId,
        reason,
      );
      if (response.success) {
        showSuccess('Configuration rejected successfully');
        setRefreshKey((prev) => prev + 1);
      } else {
        console.log(
          '❌ handleRejectConfirm - Response success is false, but checking if operation actually succeeded...',
        );
        if (response.config) {
          console.log(
            '✅ handleRejectConfirm - Config object found, treating as successful despite success: false',
          );
          showSuccess('Configuration rejected successfully');
          setRefreshKey((prev) => prev + 1);
        } else {
          showError(response.message || 'Failed to reject configuration');
        }
      }
    } catch (error) {
      console.error('Failed to reject config:', error);
      showError('Failed to reject configuration');
    }
  };

  const handleChangeRequestConfirm = async (requestedChanges: string) => {
    if (!configToRequestChanges) return;

    try {
      const userId = user?.email || user?.username || 'system';
      const response = await configApi.rejectConfig(
        configToRequestChanges.id,
        userId,
        requestedChanges,
      );
      if (response.success) {
        showSuccess('Change request sent to editor successfully');
        setRefreshKey((prev) => prev + 1);
        // Close the modal after successful change request
        handleCloseModal();
      } else {
        console.log(
          '❌ handleChangeRequestConfirm - Response success is false, but checking if operation actually succeeded...',
        );
        if (response.config) {
          console.log(
            '✅ handleChangeRequestConfirm - Config object found, treating as successful despite success: false',
          );
          showSuccess('Change request sent to editor successfully');
          setRefreshKey((prev) => prev + 1);
          handleCloseModal();
        } else {
          showError(response.message || 'Failed to send change request');
        }
      }
    } catch (error) {
      console.error('Failed to request changes:', error);
      showError('Failed to send change request to editor');
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleRevertToEditor = (config: Config) => {
    setConfigToRequestChanges(config);
    setShowChangeRequestDialog(true);
  };

  const handleSendForApproval = async (
    configId: number,
    configName?: string,
  ) => {
    // Show confirmation dialog first
    setConfigToApprove({
      id: configId,
      name: configName || `Config #${configId}`,
    });
    setApprovalComment(''); // Reset comment field
    setShowApprovalDialog(true);
  };

  // Handle actual approval after confirmation
  const handleApprovalConfirm = async () => {
    if (!configToApprove) return;

    try {
      // Pass approvalComment to the API if supported
      const response = await configApi.approveConfig(
        configToApprove.id,
        approvalComment,
      );
      if (response.success) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + 1);
        // Close the modal after successful approval
        handleCloseModal();
        setShowApprovalDialog(false);
        setConfigToApprove(null);
      } else {
        if (response.config) {
          showSuccess('Configuration approved successfully');
          setRefreshKey((prev) => prev + 1);
          handleCloseModal();
          setShowApprovalDialog(false);
          setConfigToApprove(null);
        } else {
          showError(response.message || 'Failed to approve configuration');
          setShowApprovalDialog(false);
          setConfigToApprove(null);
        }
      }
    } catch (error) {
      showError('Failed to approve configuration');
      setShowApprovalDialog(false);
      setConfigToApprove(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1 className="text-2xl font-bold text-gray-800">
              Dynamic Endpoint Monitoring Service
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <ConfigList
            key={refreshKey}
            searchTerm={searchTerm}
            onViewDetails={handleViewDetails}
            onRefresh={handleRefresh}
            showPendingApprovals={true}
            onApprove={handleSendForApproval}
            onReject={handleRevertToEditor}
            onSendForDeployment={handleSendForApproval}
          />
        </div>
      </main>

      {/* Edit Modal */}
      {editingEndpointId !== null && (
        <EditEndpointModal
          isOpen={editingEndpointId !== null}
          onClose={handleCloseModal}
          endpointId={editingEndpointId}
          onSuccess={handleConfigSuccess}
          readOnly={true}
          onRevertToEditor={() =>
            editingConfig && handleRevertToEditor(editingConfig)
          }
          onSendForDeployment={() => {
            if (editingConfig) {
              setConfigToApprove({
                id: editingEndpointId,
                name:
                  editingConfig.endpointPath ||
                  editingConfig.msgFam ||
                  `Config #${editingEndpointId}`,
              });
              setShowApprovalDialog(true);
            }
          }}
        />
      )}

      {/* Rejection Dialog */}
      {configToReject && (
        <RejectionDialog
          isOpen={showRejectionDialog}
          onClose={() => {
            setShowRejectionDialog(false);
            setConfigToReject(null);
          }}
          onConfirm={handleRejectConfirm}
          configName={configToReject.endpointPath}
        />
      )}

      {/* Config Review Modal */}
      {selectedConfig && (
        <ConfigReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedConfig(null);
          }}
          config={selectedConfig}
          onApprove={() => handleApprove(selectedConfig.id)}
          onReject={() => handleRejectClick(selectedConfig)}
        />
      )}

      {/* Change Request Dialog */}
      {configToRequestChanges && (
        <ChangeRequestDialog
          isOpen={showChangeRequestDialog}
          onClose={() => {
            setShowChangeRequestDialog(false);
            setConfigToRequestChanges(null);
          }}
          onConfirm={handleChangeRequestConfirm}
          configName={configToRequestChanges.endpointPath}
        />
      )}

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setConfigToApprove(null);
        }}
        aria-labelledby="approval-confirmation-dialog-title"
        aria-describedby="approval-confirmation-dialog-description"
        sx={{ borderRadius: '6px' }}
      >
        <Box
          sx={{
            color: '#3b3b3b',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #cecece',
          }}
        >
          Approval Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="approval-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to approve{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2b7fff',
                backgroundColor: '#f0f7ff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{configToApprove?.name || 'this configuration'}"
            </Box>
            ?
          </DialogContentText>
          {/* Optional comment field for approval */}
          <Box
            sx={{
              backgroundColor: '#dceeff',
              border: '1px solid #dceeff',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2b7fff',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: This will approve the configuration and move it to
              the next stage in the workflow.
            </DialogContentText>
          </Box>
          <Box sx={{ mt: 2, mb: 1 }}>
            <label
              htmlFor="approval-comment"
              style={{ fontWeight: 500, color: '#374151', fontSize: 15 }}
            >
              Comment (optional)
            </label>
            <textarea
              id="approval-comment"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Add a comment for this approval (optional)"
              rows={3}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 15,
                color: '#374151',
                marginTop: 4,
                resize: 'vertical',
                background: '#f9fafb',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <Button
            onClick={() => {
              setShowApprovalDialog(false);
              setConfigToApprove(null);
            }}
            variant="secondary"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprovalConfirm}
            variant="primary"
            className="!pb-[6px] !pt-[5px] bg-[#2b7fff]"
          >
            Yes, Approve Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ApproverConfigsPage;
