import React, { useState } from 'react';
import { Button } from './Button';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from '@mui/material';
import { Check } from 'lucide-react';

interface JobApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void> | void;
  jobName: string;
  jobType: string;
}

export const JobApprovalDialog: React.FC<JobApprovalDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobName,
  jobType,
}) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm(comment.trim());
      setComment('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
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
        Approval Confirmation
      </Box>

      <DialogContent sx={{ padding: '20px 20px' }}>
        <DialogContentText
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
              color: '#16a34a',
              backgroundColor: '#f0fdf4',
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
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginTop: '16px',
          }}
        >
          <DialogContentText
            sx={{
              fontSize: '14px',
              color: '#15803d',
              margin: 0,
              fontWeight: '500',
            }}
          >
            ✅ This will approve the {jobType.toLowerCase()} and move it to the next stage.
          </DialogContentText>
        </Box>

        {/* Optional Approver Comment */}
        <div style={{ marginTop: '16px' }}>
          <label
            htmlFor="approval-comment"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}
          >
            Approver Comment{' '}
            <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="approval-comment"
            value={comment}
            onChange={(e) => { setComment(e.target.value); }}
            placeholder={`Add an optional comment for this ${jobType.toLowerCase()} approval...`}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'vertical',
              outline: 'none',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              boxSizing: 'border-box',
            }}
            rows={3}
          />
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
          className="!pb-[6px] !pt-[5px]"
          style={{ background: '#33ad74', color: 'white' }}
          disabled={loading}
          icon={<Check size={16} />}
        >
          {loading ? 'Approving...' : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobApprovalDialog;
