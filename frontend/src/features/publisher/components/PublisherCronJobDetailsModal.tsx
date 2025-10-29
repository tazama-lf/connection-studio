import React, { useState } from 'react';
import { X, Upload, Clock, Calendar, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface PublisherCronJobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleResponse | null;
  onPublishSuccess?: () => void;
}

export const PublisherCronJobDetailsModal: React.FC<PublisherCronJobDetailsModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onPublishSuccess,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  if (!isOpen || !schedule) return null;

  const handlePublish = async () => {
    if (!schedule?.id) return;

    try {
      setIsPublishing(true);
      setPublishError(null);
      setPublishSuccess(false);

      // Update status to 'deployed'
      await dataEnrichmentApi.updateScheduleStatus(schedule.id, 'deployed');

      setPublishSuccess(true);

      // Wait a moment to show success message
      setTimeout(() => {
        onPublishSuccess?.();
        onClose();
        setPublishSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to publish cron job:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish cron job');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      setPublishError(null);
      setPublishSuccess(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cron Job Details</h2>
            <p className="text-sm text-gray-500 mt-1">View published cron job details</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isPublishing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success Message */}
          {publishSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Published Successfully</h4>
                <p className="text-sm text-green-700 mt-1">
                  The cron job has been published and marked as deployed.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {publishError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Publish Failed</h4>
                <p className="text-sm text-red-700 mt-1">{publishError}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(schedule.status || 'exported')}`}>
                {getStatusLabel(schedule.status || 'exported')}
              </span>
            </div>

            {/* Schedule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Name
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{schedule.name}</p>
              </div>
            </div>

            {/* Cron Expression */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Cron Expression
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <code className="text-blue-600 font-mono text-sm">{schedule.cron}</code>
              </div>
            </div>

            {/* Iterations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Iterations
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-gray-900">
                  {schedule.iterations === -1 ? 'Infinite (runs continuously)' : `${schedule.iterations} iterations`}
                </p>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Date
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-900">
                    {schedule.start_date
                      ? new Date(schedule.start_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  End Date
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-900">
                    {schedule.end_date
                      ? new Date(schedule.end_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Associated Job */}
            {(schedule as any).job_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Associated Job
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-900">{(schedule as any).job_name || 'Not specified'}</p>
                  {(schedule as any).job_id && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">ID: {(schedule as any).job_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {(schedule as any).description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{(schedule as any).description}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Metadata
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Schedule ID</p>
                  <p className="text-gray-900 font-mono text-xs mt-1">{schedule.id}</p>
                </div>
                {schedule.created_at && (
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-900 mt-1">
                      {new Date(schedule.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* Footer - No Publish button since these are already deployed */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isPublishing}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublisherCronJobDetailsModal;
