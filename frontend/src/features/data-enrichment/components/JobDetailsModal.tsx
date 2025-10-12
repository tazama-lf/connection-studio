import React from 'react';
import { X, Calendar, Clock, Database, Globe, Settings } from 'lucide-react';
import type { DataEnrichmentJobResponse } from '../types';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  isLoading?: boolean;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  job,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN-PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CLONED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfigTypeColor = (type: string) => {
    return type === 'Push'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred background overlay without black background */}
      <div
        className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Edit Data Enrichment Endpoint: {job?.endpoint_name || 'Loading...'}
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
              <span className="ml-2 text-gray-600">Loading job details...</span>
            </div>
          ) : job ? (
            <div className="space-y-6">
              {/* Configuration Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Type</h4>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="configType"
                      checked={job.config_type === 'Pull'}
                      readOnly
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↓ Pull (SFTP/HTTP)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="configType"
                      checked={job.config_type === 'Push'}
                      readOnly
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      ↑ Push (REST API)
                    </span>
                  </label>
                </div>
                {job.config_type === 'Push' && (
                  <p className="mt-2 text-sm text-gray-500">
                    Push configuration creates a REST API endpoint where external systems can send data to your system.
                  </p>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={job.endpoint_name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Path Pattern
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                      /v1/enrich/
                    </span>
                    <input
                      type="text"
                      value={`${job.endpoint_name?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'UNKNOWN'}/${job.table_name || 'data'}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={job.description || 'No description provided'}
                  readOnly
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 resize-none"
                />
              </div>

              {/* Ingest Settings */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <Settings size={16} className="mr-2" />
                  Ingest Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ingest Mode
                    </label>
                    <select
                      value="append"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    >
                      <option value="append">Append - Add new records to existing data</option>
                      <option value="replace">Replace - Replace all existing data</option>
                      <option value="update">Update - Update existing records</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Append mode adds new records to the existing dataset.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Collection
                    </label>
                    <input
                      type="text"
                      value={job.table_name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Database size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Source Type:</span>
                    <span className="text-sm text-gray-900">{job.source_type}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Globe size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Configuration:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getConfigTypeColor(job.config_type)}`}>
                      {job.config_type === 'Push' ? '↑' : '↓'} {job.config_type}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Settings size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.job_status)}`}>
                      {job.job_status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Created:</span>
                    <span className="text-sm text-gray-900">{formatDate(job.created_at)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Updated:</span>
                    <span className="text-sm text-gray-900">{formatDate(job.updated_at)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Database size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Job ID:</span>
                    <span className="text-sm text-gray-900">{job.id}</span>
                  </div>
                </div>
              </div>

              {/* Connection Details */}
              {job.source_type === 'HTTP' && job.connection && 'url' in job.connection && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Connection Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTTP URL
                    </label>
                    <input
                      type="text"
                      value={job.connection.url}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    />
                  </div>
                  {job.connection.headers && Object.keys(job.connection.headers).length > 0 && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Headers
                      </label>
                      <div className="bg-white border border-gray-300 rounded-md p-3">
                        <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                          {JSON.stringify(job.connection.headers, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Job details not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
