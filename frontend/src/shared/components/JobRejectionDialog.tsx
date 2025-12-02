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
  onConfirm: (reason: string) => Promise<void> | void;
  jobName: string;
  jobType: 'Data Enrichment Job' | 'Cron Job';
}

export const JobRejectionDialog: React.FC<JobRejectionDialogProps> = (
  props,
) => {
  const { isOpen, onClose, onConfirm, jobName, jobType } = props;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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

    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      setError('');
      onClose();
    } finally {
      setLoading(false);
    }
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
            ⚠️ Important: This will reject the {jobType.toLowerCase()} and send
            it back to the creator for revisions.
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
            <p
              style={{
                marginTop: '4px',
                fontSize: '14px',
                color: '#dc2626',
              }}
            >
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
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="danger"
          style={{ background: '#ff474d' }}
          className="!pb-[6px] !pt-[5px]"
          disabled={!reason.trim() || loading}
        >
          {loading ? (
            <>
              <span className="mr-2 align-middle inline-block">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
              </span>
              Rejecting...
            </>
          ) : (
            <>Yes, Reject</>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
