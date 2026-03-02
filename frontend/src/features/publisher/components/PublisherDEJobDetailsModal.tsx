import { AlertCircle, Calendar, CheckCircle, Database, Globe, X } from 'lucide-react';
import React, { useState } from 'react';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../data-enrichment/handlers';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';

interface PublisherDEJobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  onPublishSuccess?: () => void;
}

// Helper function to determine job type
const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (job.type?.toLowerCase() === 'push' || job.type?.toLowerCase() === 'pull') {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  return (job.path && !job.source_type) ? 'push' : 'pull';
};

export const PublisherDEJobDetailsModal: React.FC<PublisherDEJobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  onPublishSuccess,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  if (!isOpen || !job) return null;

  const handlePublish = async () => {
    if (!job?.id) return;

    try {
      setIsPublishing(true);
      setPublishError(null);
      setPublishSuccess(false);

      const jobType = getJobType(job) === 'push' ? 'PUSH' : 'PULL';
      
      // Update status to 'deployed'
      await dataEnrichmentApi.updateJobStatus(job.id, 'deployed', jobType);

      setPublishSuccess(true);

      // Wait a moment to show success message
      setTimeout(() => {
        onPublishSuccess?.();
        onClose();
        setPublishSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to publish DE job:', error);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish DE job');
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

  const jobType = getJobType(job);
  const endpointPath = jobType === 'push'
    ? (job.path || `/tenant-${job.endpoint_name?.substring(0, 6)}/${job.table_name || 'data'}`)
    : `/tenant-${job.endpoint_name?.substring(0, 6) || '001'}/${job.table_name || job.endpoint_name}`;

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
            <h2 className="text-xl font-semibold text-gray-900">Data Enrichment Job Details</h2>
            <p className="text-sm text-gray-500 mt-1">View published DE job details</p>
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
                  The DE job has been published and marked as deployed.
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
              <span className={getStatusColor(job.status || 'exported')}>
                {getStatusLabel(job.status || 'exported')}
              </span>
            </div>

            {/* Endpoint Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint Name
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{job.endpoint_name}</p>
              </div>
            </div>

            {/* Endpoint Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Endpoint Path
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <code className="text-blue-600 font-mono text-sm">{endpointPath}</code>
              </div>
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration Type
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded ${
                  jobType === 'push' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {jobType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Table Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Table Name
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-gray-900">{job.table_name || 'N/A'}</p>
              </div>
            </div>

            {/* Created At */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Created At
              </label>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-gray-900">
                  {job.created_at
                    ? new Date(job.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

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

export default PublisherDEJobDetailsModal;
