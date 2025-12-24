import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Button } from '../../../../shared/components/Button';

interface CronJobConfirmationDialogProps {
  open: boolean;
  type: 'export' | 'approval' | '';
  jobName: string;
  actionLoading: '' | 'export' | 'approval';
  onClose: () => void;
  onConfirm: (type: 'export' | 'approval') => void;
}

export const CronJobConfirmationDialog: React.FC<CronJobConfirmationDialogProps> = ({
  open,
  type,
  jobName,
  actionLoading,
  onClose,
  onConfirm,
}) => {
  if (!type) return null;

  const getTitle = () => {
    if (type === 'export') return 'Export Confirmation Required!';
    if (type === 'approval') return 'Approval Confirmation Required!';
    return '';
  };

  const getAction = () => {
    if (type === 'export') return 'export';
    if (type === 'approval') return 'submit for approval';
    return '';
  };

  const getWarning = () => {
    if (type === 'export')
      return '⚠️ Important: This will update the cron job status to EXPORTED.';
    if (type === 'approval')
      return '⚠️ Important: This will submit the cron job for approval and update its status to UNDER REVIEW.';
    return '';
  };

  const getButtonText = () => {
    if (actionLoading === type) {
      return type === 'export' ? 'Exporting...' : 'Submitting...';
    }
    return type === 'export' ? 'Yes, Export Cron Job' : 'Yes, Submit for Approval';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
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
        {getTitle()}
      </Box>
      <DialogContent sx={{ padding: '20px 20px' }}>
        <DialogContentText
          id="confirmation-dialog-description"
          sx={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151',
            marginBottom: '16px',
          }}
        >
          Are you sure you want to {getAction()}{' '}
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
            "{jobName}"
          </Box>
          ?
        </DialogContentText>
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
            {getWarning()}
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
        <Button
          onClick={onClose}
          variant="secondary"
          className="!pb-[6px] !pt-[5px]"
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (type === 'export' || type === 'approval') {
              onConfirm(type);
            }
          }}
          variant="primary"
          className="!pb-[6px] !pt-[5px] bg-[#2b7fff]"
          disabled={actionLoading === type}
        >
          {actionLoading === type && (
            <span className="w-4 h-4 flex items-center justify-center mr-2">
              <svg
                className="animate-spin"
                width="16"
                height="16"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#fff"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.2"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="#fff"
                  strokeWidth="4"
                  fill="none"
                />
              </svg>
            </span>
          )}
          {getButtonText()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CronJobConfirmationDialog;
