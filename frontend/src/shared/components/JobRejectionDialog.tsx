import React, { useState } from 'react';
import { Button } from './Button';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from '@mui/material';

interface JobRejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  jobName: string;
  jobType: 'Data Enrichment Job' | 'Cron Job';
}

export const JobRejectionDialog: React.FC<JobRejectionDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobName,
  jobType,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    if (reason.trim().length < 10) {
      setError(
        'Please provide a more detailed reason (at least 10 characters)',
      );
      return;
    }

    onConfirm(reason.trim());
    setReason('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="rejection-confirmation-dialog-title"
      aria-describedby="rejection-confirmation-dialog-description"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: '12px',
          minWidth: 400,
        },
      }}
    >
      <Box
        sx={{
          color: '#3B3B3B',
          fontSize: '20px',
          fontWeight: 'bold',
          padding: '16px 20px',
          borderBottom: '1px solid #CECECE',
        }}
      >
        Rejection Confirmation Required!
      </Box>
      <DialogContent sx={{ padding: '20px 20px' }}>
        <DialogContentText
          id="rejection-confirmation-dialog-description"
          sx={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151',
            marginBottom: '16px',
          }}
        >
          Are you sure you want to reject{' '}
          <Box
            component="span"
            sx={{
              fontWeight: 'bold',
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
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
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            marginTop: '16px',
          }}
        >
          <DialogContentText
            sx={{
              fontSize: '16px',
              color: '#DC2626',
              margin: 0,
              fontWeight: '500',
            }}
          >
            ⚠️ Important: This will reject the {jobType.toLowerCase()} and send it back to the creator for revisions.
          </DialogContentText>
        </Box>

        {/* REASON */}
        <div style={{ marginTop: '16px' }}>
          <label
            htmlFor="reason"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Reason for Rejection <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={`Please provide a detailed reason for rejecting this ${jobType.toLowerCase()}...`}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: error ? '1px solid #fca5a5' : '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'vertical',
              outline: 'none',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            }}
            rows={4}
            required
          />
          {error && (
            <p style={{
              marginTop: '4px',
              fontSize: '14px',
              color: '#dc2626'
            }}>
              {error}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
        <Button
          variant="secondary"
          className="!pb-[6px] !pt-[5px]"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="danger"
          className="!pb-[6px] !pt-[5px]"
          disabled={!reason.trim()}
        >
          Yes, Reject {jobType}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
