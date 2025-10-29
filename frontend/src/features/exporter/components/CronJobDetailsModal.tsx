import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface CronJobDetailsModalProps {
  schedule: ScheduleResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onExport: (scheduleId: string) => Promise<void>;
}

export const CronJobDetailsModal: React.FC<CronJobDetailsModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onExport,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !schedule) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(schedule.id);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Cron Job Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Status Badge */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status || 'approved')}`}>
                {getStatusLabel(schedule.status || 'approved')}
              </span>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule ID
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all">
                  {schedule.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {schedule.name || 'N/A'}
                </p>
              </div>
            </div>

            {/* Cron Configuration */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                  {schedule.cron}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Iterations
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {schedule.iterations || 'Unlimited'}
                </p>
              </div>
            </div>

            {/* Schedule Dates */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {schedule.start_date
                    ? new Date(schedule.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {schedule.end_date
                    ? new Date(schedule.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No end date'}
                </p>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-2 gap-6">
              {schedule.next_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Execution
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {new Date(schedule.next_time).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
              )}

              {schedule.source_type && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Type
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                    {schedule.source_type}
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created At
                </label>
                <p className="text-sm text-gray-900">
                  {schedule.created_at
                    ? new Date(schedule.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Status
                </label>
                <p className="text-sm text-gray-900">
                  {schedule.schedule_status || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isExporting}
            >
              Close
            </Button>
            {schedule.status !== 'exported' && (
              <Button
                onClick={handleExport}
                variant="primary"
                disabled={isExporting}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CronJobDetailsModal;
