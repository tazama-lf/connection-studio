import React, { useState } from 'react';
import { Eye, Play, Pause, MoreHorizontal } from 'lucide-react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { Button } from '../../../shared/components/Button';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';

interface JobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewLogs?: (jobId: string) => void;
  onRefresh?: () => void;
}

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const getStatusConfig = (status: JobStatus) => {
    switch (status) {
      case 'PENDING':
        return {
          className: 'bg-green-100 text-green-700 border border-green-200',
          icon: '✓',
          text: 'Ready for Approval'
        };
      case 'IN-PROGRESS':
        return {
          className: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
          icon: '⏳',
          text: 'In Progress'
        };
      case 'SUSPENDED':
        return {
          className: 'bg-red-100 text-red-700 border border-red-200',
          icon: '⚠',
          text: 'Suspended'
        };
      case 'CLONED':
        return {
          className: 'bg-purple-100 text-purple-700 border border-purple-200',
          icon: '📋',
          text: 'Cloned'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-700 border border-gray-200',
          icon: '•',
          text: status
        };
    }
  };

  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  );
};

export const JobList: React.FC<JobListProps> = ({
  jobs,
  isLoading = false,
  onViewLogs,
  onRefresh,
}) => {
  const { showSuccess, showError } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const handleStatusUpdate = async (jobId: string, newStatus: JobStatus) => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, newStatus);
      showSuccess(`Job status updated to ${newStatus}`);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update job status:', error);
      showError('Failed to update job status');
    }
  };

  const handleActivationToggle = async (jobId: string, isActive: boolean) => {
    try {
      await dataEnrichmentApi.updateJobActivation(jobId, isActive);
      showSuccess(`Job ${isActive ? 'activated' : 'deactivated'} successfully`);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update job activation:', error);
      showError('Failed to update job activation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading jobs...</span>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">No jobs found</div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="secondary">
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ENDPOINT PATH
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TENANT ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TYPE
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                RECEIVED TIME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {jobs.map((job, index) => (
              <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {`/v1/enrich/${job.endpoint_name?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'UNKNOWN'}/${job.table_name || 'data'}`}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-blue-600">
                    {job.endpoint_name?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'UNKNOWN'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center text-sm font-medium ${
                    job.config_type === 'Push' 
                      ? 'text-blue-600' 
                      : 'text-purple-600'
                  }`}>
                    <svg 
                      className={`w-4 h-4 mr-1 ${
                        job.config_type === 'Push' ? 'text-blue-600' : 'text-purple-600'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      {job.config_type === 'Push' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l-3 3m0 0l-3-3m3 3V4m0 13a9 9 0 11-0-18 9 9 0 01-0 18z" />
                      )}
                    </svg>
                    {job.config_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={job.job_status || 'PENDING'} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {job.updated_at 
                        ? new Date(job.updated_at).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric', 
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Never'
                      }
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onViewLogs?.(job.id)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} className="mr-1.5" />
                      View
                    </button>

                    {/* Actions Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === job.id ? null : job.id)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="More Actions"
                      >
                        <MoreHorizontal size={16} className="mr-1.5" />
                        Actions
                      </button>

                      {dropdownOpen === job.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            {/* Status Update Options */}
                            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                              Update Status
                            </div>
                            <button
                              onClick={() => {
                                handleStatusUpdate(job.id, 'PENDING');
                                setDropdownOpen(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              disabled={job.job_status === 'PENDING'}
                            >
                              <Play size={16} className="mr-2" />
                              Set to Pending
                            </button>
                            <button
                              onClick={() => {
                                handleStatusUpdate(job.id, 'IN-PROGRESS');
                                setDropdownOpen(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              disabled={job.job_status === 'IN-PROGRESS'}
                            >
                              <Play size={16} className="mr-2" />
                              Set to In Progress
                            </button>
                            <button
                              onClick={() => {
                                handleStatusUpdate(job.id, 'SUSPENDED');
                                setDropdownOpen(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              disabled={job.job_status === 'SUSPENDED'}
                            >
                              <Pause size={16} className="mr-2" />
                              Suspend Job
                            </button>

                            {/* Activation Toggle */}
                            <div className="border-t border-gray-200 my-1"></div>
                            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                              Activation
                            </div>
                            <button
                              onClick={() => {
                                handleActivationToggle(job.id, true);
                                setDropdownOpen(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Play size={16} className="mr-2 text-green-600" />
                              Activate Job
                            </button>
                            <button
                              onClick={() => {
                                handleActivationToggle(job.id, false);
                                setDropdownOpen(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Pause size={16} className="mr-2 text-red-600" />
                              Deactivate Job
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};export default JobList;
