import React, { useState } from 'react';
import {
  Backdrop,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from '@mui/material';
import { ActivityIcon, ChevronLeft } from 'lucide-react';
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

const INITIAL_OFFSET = 0;
const INCREMENT = 1;
const SORT_DESCENDING = -1;
const MAX_COMMENT_LENGTH = 100;

const ApproverConfigsPage: React.FC = () => {
  const navigate = useNavigate();
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(INITIAL_OFFSET);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [configToReject, setConfigToReject] = useState<Config | null>(null);
  const [configToRequestChanges, setConfigToRequestChanges] =
    useState<Config | null>(null);

  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [configToApprove, setConfigToApprove] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [rejectionLoading, setRejectionLoading] = useState(false);

  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const handleCloseModal = (): void => {
    setEditingEndpointId(null);
    setEditingConfig(null);
    setRefreshKey((prev) => prev + INCREMENT);
  };

  const handleConfigSuccess = (): void => {
    setRefreshKey((prev) => prev + INCREMENT);
  };

  const handleViewDetails = (config: Config): void => {
    setEditingEndpointId(config.id);
    setEditingConfig(config);
  };

  const handleApprove = async (configId: number): Promise<void> => {
    try {
      const response = await configApi.approveConfig(configId);
      if (response.success) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + INCREMENT);
      } else if (response.config) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + INCREMENT);
      } else if (response.message) {
        showError(response.message);
      } else {
        showError('Failed to approve configuration');
      }
    } catch (error) {
      showError('Failed to approve configuration');
    }
  };

  const handleRejectClick = (config: Config): void => {
    setConfigToReject(config);
    setShowRejectionDialog(true);
  };

  const handleRejectConfirm = async (reason: string): Promise<void> => {
    if (!configToReject) return;
    setRejectionLoading(true);
    try {
      const userId = user?.email ?? user?.username ?? 'system';
      const response = await configApi.rejectConfig(
        configToReject.id,
        userId,
        reason,
      );
      if (response.success) {
        showSuccess('Configuration rejected successfully');
        setRefreshKey((prev) => prev + INCREMENT);
      } else if (response.config) {
        showSuccess('Configuration rejected successfully');
        setRefreshKey((prev) => prev + INCREMENT);
      } else if (response.message) {
        showError(response.message);
      } else {
        showError('Failed to reject configuration');
      }
    } catch (error) {
      showError('Failed to reject configuration');
    } finally {
      setRejectionLoading(false);
    }
  };

  const handleChangeRequestConfirm = async (
    requestedChanges: string,
  ): Promise<void> => {
    if (!configToRequestChanges) return;

    try {
      const userId = user?.email ?? user?.username ?? 'system';
      const response = await configApi.rejectConfig(
        configToRequestChanges.id,
        userId,
        requestedChanges,
      );
      if (response.success) {
        showSuccess('Change request sent to editor successfully');
        setRefreshKey((prev) => prev + INCREMENT);
        handleCloseModal();
      } else if (response.config) {
        showSuccess('Change request sent to editor successfully');
        setRefreshKey((prev) => prev + INCREMENT);
        handleCloseModal();
      } else if (response.message) {
        showError(response.message);
      } else {
        showError('Failed to send change request to editor');
      }
    } catch (error) {
      showError('Failed to send change request to editor');
    }
  };

  const handleRefresh = (): void => {
    setRefreshKey((prev) => prev + INCREMENT);
  };

  const handleRevertToEditor = (config: Config): void => {
    setConfigToRequestChanges(config);
    setShowChangeRequestDialog(true);
  };

  const handleSendForApproval = (
    configId: number,
    configName?: string,
  ): void => {
    setConfigToApprove({
      id: configId,
      name: configName ?? `Config #${configId}`,
    });
    setApprovalComment('');
    setShowApprovalDialog(true);
  };

  const handleApprovalConfirm = async (): Promise<void> => {
    if (!configToApprove) return;
    setApprovalLoading(true);
    try {
      const response = await configApi.approveConfig(
        configToApprove.id,
        approvalComment,
      );
      if (response.success) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + INCREMENT);
        handleCloseModal();
        setShowApprovalDialog(false);
        setConfigToApprove(null);
      } else if (response.config) {
        showSuccess('Configuration approved successfully');
        setRefreshKey((prev) => prev + INCREMENT);
        handleCloseModal();
        setShowApprovalDialog(false);
        setConfigToApprove(null);
      } else {
        if (response.message) {
          showError(response.message);
        } else {
          showError('Failed to approve configuration');
        }
        setShowApprovalDialog(false);
        setConfigToApprove(null);
      }
    } catch (error) {
      showError('Failed to approve configuration');
      setShowApprovalDialog(false);
      setConfigToApprove(null);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={(): void => {
            navigate(SORT_DESCENDING);
          }}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
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

        <div className="bg-white rounded-lg shadow">
          <ConfigList
            key={refreshKey}
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
          onRevertToEditor={(): void => {
            if (editingConfig) {
              handleRevertToEditor(editingConfig);
            }
          }}
          onSendForDeployment={(): void => {
            if (editingConfig) {
              setConfigToApprove({
                id: editingEndpointId,
                name:
                  editingConfig.endpointPath ??
                  editingConfig.msgFam ??
                  `Config #${editingEndpointId}`,
              });
              setShowApprovalDialog(true);
            }
          }}
        />
      )}

      {/* Rejection Dialog */}
      {configToReject && (
        <>
          <RejectionDialog
            isOpen={showRejectionDialog}
            onClose={(): void => {
              setShowRejectionDialog(false);
              setConfigToReject(null);
            }}
            onConfirm={(reason: string): void => {
              void handleRejectConfirm(reason);
            }}
            configName={configToReject.endpointPath}
          />
          <Backdrop
            sx={(theme) => ({
              color: '#fff',
              zIndex: theme.zIndex.drawer + 100,
            })}
            open={rejectionLoading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </>
      )}

      {/* Config Review Modal */}
      {selectedConfig && (
        <ConfigReviewModal
          isOpen={showReviewModal}
          onClose={(): void => {
            setShowReviewModal(false);
            setSelectedConfig(null);
          }}
          config={selectedConfig}
          onApprove={(): void => {
            void handleApprove(selectedConfig.id);
          }}
          onReject={(): void => {
            handleRejectClick(selectedConfig);
          }}
        />
      )}

      {/* Change Request Dialog */}
      {configToRequestChanges && (
        <ChangeRequestDialog
          isOpen={showChangeRequestDialog}
          onClose={(): void => {
            setShowChangeRequestDialog(false);
            setConfigToRequestChanges(null);
          }}
          onConfirm={(requestedChanges: string): void => {
            void handleChangeRequestConfirm(requestedChanges);
          }}
          configName={configToRequestChanges.endpointPath}
        />
      )}

      {/* Approval Confirmation Dialog */}
      <Dialog
        open={showApprovalDialog}
        onClose={(): void => {
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
              "{configToApprove?.name ?? 'this configuration'}"
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
              onChange={(e): void => {
                setApprovalComment(e.target.value);
              }}
              placeholder="Add a comment for this approval (optional)"
              maxLength={MAX_COMMENT_LENGTH}
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
            onClick={(): void => {
              setShowApprovalDialog(false);
              setConfigToApprove(null);
            }}
            variant="secondary"
            className="!pb-[6px] !pt-[5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={(): void => {
              void handleApprovalConfirm();
            }}
            variant="primary"
            className="!pb-[6px] !pt-[5px] bg-[#2b7fff]"
            disabled={approvalLoading}
          >
            {approvalLoading ? (
              <>
                <CircularProgress
                  size={18}
                  color="inherit"
                  style={{ marginRight: 8 }}
                />
                Approving...
              </>
            ) : (
              'Yes, Approve Configuration'
            )}
          </Button>
          <Backdrop
            sx={(theme) => ({
              color: '#fff',
              zIndex: theme.zIndex.drawer + 100,
            })}
            open={approvalLoading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ApproverConfigsPage;
