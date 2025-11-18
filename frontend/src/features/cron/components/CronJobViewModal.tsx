import { Backdrop, Box } from '@mui/material';
import { XIcon } from 'lucide-react';
import React from 'react';
import 'react-js-cron/dist/styles.css';
import { CronJobForm } from './CronJobForm';

interface CronJobViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewFormData:any;
  handleSendForApproval?: () => void;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

export const CronJobViewModal: React.FC<CronJobViewModalProps> = ({
  isOpen,
  onClose,
  viewFormData,
  handleSendForApproval,
  onApprove,
  onReject,
}) => {
  if (!isOpen) return null;

  const handleJobCreated = () => {
    handleSendForApproval?.();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          overflow: 'hidden',
        })}
        open={true}
      >
        <div
          className="relative z-50 p-8 shadow-2xl rounded-lg bg-white"
          style={{ width: '800px', maxWidth: '90vw' }}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <Box
              sx={{ fontSize: '20px', fontWeight: 'bold', color: '#2b7fff' }}
            >
              Create New Cron Job
            </Box>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon size={24} />
            </button>
          </div>
          {/* Modal Body */}
          <div className="mt-4">
            <CronJobForm
              viewFormData={viewFormData}
              handleSendForApproval={handleJobCreated}
              onCancel={handleCancel}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        </div>
      </Backdrop>
    </div>
  );
};

export default CronJobViewModal;
