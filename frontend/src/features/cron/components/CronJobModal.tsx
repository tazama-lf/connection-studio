import React from 'react';
import { XIcon } from 'lucide-react';
import { CronJobForm } from './CronJobForm';

interface CronJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

export const CronJobModal: React.FC<CronJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
}) => {
  if (!isOpen) return null;

  const handleJobCreated = () => {
    onJobCreated?.();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred backdrop */}
      <div 
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
      />
      
      {/* Modal Content - Higher z-index to appear above backdrop */}
      <div className="relative z-50 p-8 border max-w-4xl shadow-2xl rounded-lg bg-white">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">
            Create New Cron Job
          </h2>
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
            onJobCreated={handleJobCreated}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default CronJobModal;
