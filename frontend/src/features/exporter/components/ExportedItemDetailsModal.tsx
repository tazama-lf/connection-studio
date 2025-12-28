import React, { useState } from 'react';
import {
  X,
  Upload,
  Calendar,
  Clock,
  Hash,
  MessageSquare,
  User,
  Tag,
  Repeat,
  Code,
  Folder,
  Shuffle,
  Layers,
  FileText,
  Info,
  Rocket,
} from 'lucide-react';
import type { SftpFileContent, SftpFormat } from '../services/sftpApi';
import { Button } from '../../../shared/components/Button';
import {
  getStatusColor,
  getStatusLabel,
  isStatus,
} from '../../../shared/utils/statusColors';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../../data-enrichment/handlers';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { isExporter, isPublisher } from '../../../utils/common/roleUtils';
import {
  Backdrop,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
} from '@mui/material';

interface ExportedItemDetailsModalProps {
  content: SftpFileContent | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish: (
    id: string,
    format: SftpFormat,
    type?: 'PULL' | 'PUSH',
  ) => Promise<void>;
  format: SftpFormat;
  isLoading?: boolean;
}

export const ExportedItemDetailsModal: React.FC<
  ExportedItemDetailsModalProps
> = ({
  content,
  isOpen,
  onClose,
  onPublish,
  format,
  isLoading = false,
  onRefresh,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDeployConfirmDialog, setShowDeployConfirmDialog] = useState(false);
  const { user } = useAuth();

  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  console.log('ExportedItemDetailsModal render:', {
    isOpen,
    hasContent: !!content,
    format,
  });

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
          config_type: content.config_type,
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
          console.log(
            'Attempting to fetch job details from API to determine type for job ID:',
            content.id,
          );
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
                foundType,
              });
              // Use the type from the API response, or fallback to the found type
              jobType =
                (jobDetails.type?.toUpperCase() as 'PULL' | 'PUSH') ||
                foundType;
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
            name: content.name,
          });
          throw new Error(
            `Unable to determine job type (PULL/PUSH) for job ${content.id}. The exported data is missing type information and the job may no longer exist in the database.`,
          );
        }
      }

      // For DE jobs, we need to pass the type (PULL/PUSH). For DEMS and CRON, type is not required.
      await onPublish(content.id, format, jobType);
      if (onClose) onClose();
      if (typeof onRefresh === 'function') onRefresh();
    } catch (error) {
      console.error('Publish error:', error);
      // Error handling is done in parent component
    } finally {
      setIsPublishing(false);
    }
  };

  // Check if already deployed
  const isDeployed = isStatus(content.status, 'deployed');

  // Check if user can publish this item based on their role and item status
  const canPublish = userIsExporter
    ? isStatus(content.status, 'exported') ||
      isStatus(content.status, 'approved')
    : userIsPublisher
      ? isStatus(content.status, 'exported') ||
        isStatus(content.status, 'ready') ||
        isStatus(content.status, 'ready-for-deployment')
      : false;

  console.log('content', content);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <Backdrop
          sx={(theme) => ({
            zIndex: theme.zIndex.drawer + 1,
            overflow: 'hidden',
          })}
          open={true}
          // onClick={onClose}
        >
          {/* Modal */}
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <Box sx={{ color: '#2b7fff' }}>
                <h2 className="text-xl font-semibold">
                  {format === 'cron'
                    ? 'Cron Job'
                    : format === 'de'
                      ? 'Data Enrichment Job'
                      : 'DEMS Configuration'}{' '}
                  Details
                </h2>
              </Box>
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
                  <div className="w-full mb-6">
                    <div className="w-full flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border border-blue-200 rounded-xl shadow-sm">
                      <Rocket className="w-8 h-8 text-blue-500 drop-shadow-md animate-bounce-slow" />
                      <div className="flex-1">
                        <div className="text-base font-bold text-blue-700 tracking-wide mb-1">
                          Status
                        </div>
                        <div
                          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow bg-blue-100 text-blue-800`}
                          style={{ minWidth: 180 }}
                        >
                          <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                          <span className="tracking-widest uppercase text-blue-800 font-extrabold drop-shadow-sm">
                            {'Ready For Deployment'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                        <Hash className="w-4 h-4 text-blue-500" />
                        ID
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all">
                        {content.id}
                      </p>
                    </div>
                    {content?.msgFam && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Event Type
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {content?.msgFam || 'N/A'}
                        </p>
                      </div>
                    )}

                    {content?.endpoint_name && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Endpoint Name
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {content?.endpoint_name || 'N/A'}
                        </p>
                      </div>
                    )}
                    {content?.name && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Name
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {content?.name || 'N/A'}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                        <User className="w-4 h-4 text-blue-500" />
                        Tenant ID
                      </label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                        {content.tenant_id || 'N/A'}
                      </p>
                    </div>
                    {format === 'de' && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <Tag className="w-4 h-4 text-blue-500" />
                          Job Type
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {content.type ||
                            (content.path
                              ? 'PUSH'
                              : content.source_type || content.connection
                                ? 'PULL'
                                : 'Unknown')}
                        </p>
                      </div>
                    )}
                    {format === 'cron' && content.cron && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <Code className="w-4 h-4 text-blue-500" />
                          Cron Expression
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                          {content.cron}
                        </p>
                      </div>
                    )}
                    {format === 'dems' && (
                      <>
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <Folder className="w-4 h-4 text-blue-500" />
                            Endpoint Path
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                            {content.endpointPath || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <Shuffle className="w-4 h-4 text-blue-500" />
                            Transaction Type
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                            {content.transactionType || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <Layers className="w-4 h-4 text-blue-500" />
                            Version
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                            {content.version || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            Content Type
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                            {content.contentType || 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                    {format === 'cron' && content.iterations !== undefined && (
                      <div>
                        <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                          <Repeat className="w-4 h-4 text-blue-500" />
                          Retry Count
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                          {content.iterations}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date Information */}
                  {(content.end_date ||
                    (content.start_date && !content.cron)) && (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Only show start date if content.cron is not present */}
                      {content.start_date && !content.cron && (
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Start Date
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 flex items-center gap-2">
                            <span>
                              {new Date(content.start_date).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                },
                              )}
                            </span>
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>
                              {new Date(content.start_date).toLocaleTimeString(
                                'en-US',
                                {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                },
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                      {content.end_date && (
                        <div>
                          <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            End Date
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 flex items-center gap-2">
                            <span>
                              {new Date(content.end_date).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                },
                              )}
                            </span>
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>
                              {new Date(content.end_date).toLocaleTimeString(
                                'en-US',
                                {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                },
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Data */}
                  <div>
                    <label className="flex items-center gap-1 text-sm font-bold text-gray-700 mb-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      Additional Details
                    </label>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 h-96 overflow-y-auto">
                      <pre className="text-xs text-gray-900 whitespace-pre-wrap break-words">
                        {JSON.stringify(content, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                        Created At
                      </label>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        {content.created_at || content.createdAt ? (
                          <>
                            <span>
                              {new Date(
                                content.created_at || content.createdAt,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>
                              {new Date(
                                content.created_at || content.createdAt,
                              ).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                        <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                        Updated At
                      </label>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        {content?.updated_at || content?.updatedAt ? (
                          <>
                            <span>
                              {new Date(
                                content?.updated_at || content?.updatedAt,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>
                              {new Date(
                                content?.updated_at || content?.updatedAt,
                              ).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={() => {
                  console.log('Close button clicked');
                  onClose();
                }}
                variant="secondary"
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowDeployConfirmDialog(true)}
                variant="primary"
                // disabled={isPublishing || isDeployed || isLoading || !canPublish}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Deploy</span>
              </Button>
            </div>
          </div>
        </Backdrop>
      </div>

      {/* Deploy Confirmation Dialog */}
      <Dialog
        open={showDeployConfirmDialog}
        onClose={() => setShowDeployConfirmDialog(false)}
        aria-labelledby="deploy-confirmation-dialog-title"
        aria-describedby="deploy-confirmation-dialog-description"
      >
        <DialogTitle
          id="deploy-confirmation-dialog-title"
          sx={{ color: '#3b3b3b', fontSize: '20px', fontWeight: 'bold' }}
        >
          Deployment Confirmation Required!
        </DialogTitle>
        <DialogContent sx={{ padding: '20px 24px' }}>
          <DialogContentText
            id="deploy-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to deploy
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2b7fff',
                backgroundColor: '#f0f7ff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
                marginLeft: '6px',
                marginRight: '6px',
              }}
            >
              {content?.id || 'this item'}
            </Box>
            ?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#dceeff',
              border: '1px solid #dceeff',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2b7fff',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: Once deployed, this item will be published and this
              action cannot be undone.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="secondary"
            onClick={() => setShowDeployConfirmDialog(false)}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              setShowDeployConfirmDialog(false);
              setIsPublishing(true);
              await handlePublish();
              setIsPublishing(false);
            }}
            disabled={isPublishing}
          >
            Yes, Deploy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loader Backdrop for Deploy */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2 }}
        open={isPublishing}
      >
        <CircularProgress color="inherit" />
        <Box sx={{ ml: 2, fontSize: '18px', fontWeight: 500 }}>
          Deploying...
        </Box>
      </Backdrop>
    </div>
  );
};

export default ExportedItemDetailsModal;
