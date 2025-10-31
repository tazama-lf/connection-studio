import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import type { SftpFileContent, SftpFormat } from '../services/sftpApi';
import { Button } from '../../../shared/components/Button';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { isExporter, isPublisher } from '../../../utils/roleUtils';

interface ExportedItemDetailsModalProps {
  content: SftpFileContent | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (id: string, format: SftpFormat, type?: 'PULL' | 'PUSH') => Promise<void>;
  format: SftpFormat;
  isLoading?: boolean;
}

export const ExportedItemDetailsModal: React.FC<ExportedItemDetailsModalProps> = ({
  content,
  isOpen,
  onClose,
  onPublish,
  format,
  isLoading = false,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const { user } = useAuth();

  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  console.log('ExportedItemDetailsModal render:', { isOpen, hasContent: !!content, format });

  if (!isOpen || !content) return null;

  const handlePublish = async () => {
    console.log('Publish clicked for item:', content.id);
    console.log('Content data:', JSON.stringify(content, null, 2));
    setIsPublishing(true);
    try {
      let jobType: 'PULL' | 'PUSH' | undefined;

      if (format === 'de') {
        // Try to determine job type from content
        jobType = content.type;

        // If type is not directly available, try to infer from other fields
        if (!jobType) {
          // Check if it has path (PUSH jobs) or source_type/connection (PULL jobs)
          if (content.path) {
            jobType = 'PUSH';
          } else if (content.source_type || content.connection) {
            jobType = 'PULL';
          } else if (content.config_type) {
            // Sometimes it's stored as config_type
            const configType = content.config_type?.toString().toUpperCase();
            if (configType === 'PUSH' || configType === 'PULL') {
              jobType = configType as 'PULL' | 'PUSH';
            }
          } else if (content.type) {
            // Sometimes type might be lowercase
            const typeStr = content.type?.toString().toUpperCase();
            if (typeStr === 'PUSH' || typeStr === 'PULL') {
              jobType = typeStr as 'PULL' | 'PUSH';
            }
          }
        }

        console.log('Determined job type:', jobType, 'from content:', {
          type: content.type,
          path: content.path,
          source_type: content.source_type,
          connection: !!content.connection,
          config_type: content.config_type
        });

        // If we still don't have a type, try to infer from the filename or other metadata
        if (!jobType && content.name) {
          const name = content.name.toLowerCase();
          if (name.includes('push')) {
            jobType = 'PUSH';
          } else if (name.includes('pull')) {
            jobType = 'PULL';
          }
        }

        // Last resort: try to fetch job details from API to get the type
        if (!jobType) {
          console.log('Attempting to fetch job details from API to determine type for job ID:', content.id);
          try {
            // Try to get job details - we'll try both PULL and PUSH types
            let jobDetails = null;
            let foundType = null;
            
            console.log('Trying PULL type first...');
            try {
              jobDetails = await dataEnrichmentApi.getJob(content.id, 'PULL');
              foundType = 'PULL';
              console.log('Found job as PULL type');
            } catch (pullError) {
              console.log('Job not found as PULL, trying PUSH...', pullError);
              try {
                jobDetails = await dataEnrichmentApi.getJob(content.id, 'PUSH');
                foundType = 'PUSH';
                console.log('Found job as PUSH type');
              } catch (pushError) {
                console.log('Job not found as PUSH either', pushError);
              }
            }
            
            if (jobDetails && foundType) {
              console.log('Successfully fetched job details from API:', {
                id: jobDetails.id,
                type: jobDetails.type,
                foundType
              });
              // Use the type from the API response, or fallback to the found type
              jobType = (jobDetails.type?.toUpperCase() as 'PULL' | 'PUSH') || foundType;
              console.log('Final determined job type:', jobType);
            } else {
              console.log('No job details found in API');
            }
          } catch (apiError) {
            console.error('Failed to fetch job details from API:', apiError);
          }
        }

        console.log('Final job type determination result:', jobType);

        // If we still don't have a type, show a more helpful error
        if (!jobType) {
          console.error('Unable to determine job type. Content analysis:', {
            hasType: !!content.type,
            hasPath: !!content.path,
            hasSourceType: !!content.source_type,
            hasConnection: !!content.connection,
            hasConfigType: !!content.config_type,
            name: content.name
          });
          throw new Error(`Unable to determine job type (PULL/PUSH) for job ${content.id}. The exported data is missing type information and the job may no longer exist in the database.`);
        }
      }

      // For DE jobs, we need to pass the type (PULL/PUSH)
      await onPublish(content.id, format, jobType);
      onClose();
    } catch (error) {
      console.error('Publish error:', error);
      // Error handling is done in parent component
    } finally {
      setIsPublishing(false);
    }
  };

  // Check if already deployed
  const isDeployed = content.status === 'deployed';
  
  // Check if user can publish this item based on their role and item status
  const canPublish = userIsExporter 
    ? ['exported', 'approved'].includes(content.status || '')
    : userIsPublisher 
    ? ['exported', 'ready-for-deployment'].includes(content.status || '')
    : false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {format === 'cron' ? 'Cron Job' : 'Data Enrichment Job'} Details
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
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading details...</span>
              </div>
            ) : (
              <>
                {/* Status Badge */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(content.status || 'ready-for-deployment')}`}>
                    {getStatusLabel(content.status || 'ready-for-deployment')}
                  </span>
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all">
                      {content.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                      {content.name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tenant ID
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                      {content.tenant_id || 'N/A'}
                    </p>
                  </div>

                  {format === 'de' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Type
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                        {content.type || (content.path ? 'PUSH' : content.source_type || content.connection ? 'PULL' : 'Unknown')}
                      </p>
                    </div>
                  )}

                  {format === 'cron' && content.cron && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cron Expression
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                        {content.cron}
                      </p>
                    </div>
                  )}

                  {format === 'cron' && content.iterations !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Iterations
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                        {content.iterations}
                      </p>
                    </div>
                  )}
                </div>

                {/* Date Information */}
                {(content.start_date || content.end_date) && (
                  <div className="grid grid-cols-2 gap-6">
                    {content.start_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {new Date(content.start_date).toLocaleString('en-US', {
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

                    {content.end_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {new Date(content.end_date).toLocaleString('en-US', {
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
                  </div>
                )}

                {/* Additional Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Details
                  </label>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap break-words">
                      {JSON.stringify(content, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Created At
                    </label>
                    <p className="text-sm text-gray-900">
                      {content.created_at
                        ? new Date(content.created_at).toLocaleString('en-US', {
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
                      Updated At
                    </label>
                    <p className="text-sm text-gray-900">
                      {content.updated_at
                        ? new Date(content.updated_at).toLocaleString('en-US', {
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
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={() => {
                console.log('Close button clicked');
                onClose();
              }}
              variant="secondary"
              disabled={isPublishing}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                console.log('Publish button clicked');
                handlePublish();
              }}
              variant="primary"
              disabled={isPublishing || isDeployed || isLoading || !canPublish}
              className="flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isPublishing 
                  ? 'Publishing...' 
                  : isDeployed 
                  ? 'Already Deployed' 
                  : !canPublish
                  ? 'Cannot Publish'
                  : 'Publish'
                }
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportedItemDetailsModal;
