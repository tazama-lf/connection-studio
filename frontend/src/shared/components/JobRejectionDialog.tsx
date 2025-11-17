import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from './Button';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative z-50 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Reject {jobType}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              You are about to reject the {jobType.toLowerCase()}:{' '}
              <strong>{jobName}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              This will change the status to "Rejected" and send feedback to the
              creator for necessary changes.
            </p>
          </div>

          {/* REASON */}
          <div className="mb-4">
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={`Please provide a detailed reason for rejecting this ${jobType.toLowerCase()}...`}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={4}
              required
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!reason.trim()}>
              Reject {jobType}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
