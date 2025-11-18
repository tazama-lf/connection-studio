import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover } from '../../../utils/roleUtils';

interface CronJobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleResponse | null;
  isLoading?: boolean;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

const CronJobDetailsModal: React.FC<CronJobDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
  isLoading = false,
  onApprove,
  onReject,
}) => {
  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  if (!isOpen) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred background overlay */}
      <div
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Cron Job Details: {schedule?.name || 'Loading...'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading cron job details...</span>
            </div>
          ) : schedule ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={schedule.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    value={schedule.cron}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Iterations
                  </label>
                  <input
                    type="text"
                    value={schedule.iterations === -1 ? 'Infinite' : schedule.iterations.toString()}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>
              </div>

              {/* Schedule Details */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <Clock size={16} className="mr-2" />
                  Schedule Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="text"
                      value={schedule.start_date ? formatDate(schedule.start_date) : 'Not set'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="text"
                      value={schedule.end_date ? formatDate(schedule.end_date) : 'Not set'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Created:</span>
                        <span className="text-sm text-gray-900 block break-words">{formatDate(schedule.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Clock size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Schedule ID:</span>
                        <span className="text-xs text-gray-900 font-mono block break-all">{schedule.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>          
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Cron job details not found</p>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        {schedule && !isLoading && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between space-x-3 bg-gray-50">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            
            {/* Show Approve/Reject buttons for under-review schedules */}
            {schedule.status === 'STATUS_03_UNDER_REVIEW' && userIsApprover && (onApprove || onReject) && (
              <div className="flex space-x-3">
                {onReject && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      onReject(schedule.id);
                      onClose();
                    }}
                  >
                    Reject
                  </Button>
                )}
                {onApprove && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      onApprove(schedule.id);
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CronJobDetailsModal;