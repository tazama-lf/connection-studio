import React, { useState } from 'react';
import { X, Calendar, Clock, Database, Globe, Settings, Download, Upload } from 'lucide-react';
import type { Config } from '../index';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover, isExporter, isPublisher } from '../../../utils/common/roleUtils';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface ConfigDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config | null;
  isLoading?: boolean;
  onExport?: (configId: number, notes?: string) => Promise<void>;
  onDeploy?: (configId: number, notes?: string) => Promise<void>;
  onApprove?: (configId: number) => void;
  onReject?: (config: Config) => void;
}

const ConfigDetailsModal: React.FC<ConfigDetailsModalProps> = ({
  isOpen,
  onClose,
  config,
  isLoading = false,
  onExport,
  onDeploy,
  onApprove,
  onReject,
}) => {
  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  const [exportNotes, setExportNotes] = useState('');
  const [deployNotes, setDeployNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) {
    return null;
  }

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

  const getConfigTypeColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'exported':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'deployed':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const handleExport = async () => {
    if (!onExport || !config) return;
    
    try {
      setIsExporting(true);
      await onExport(config.id, exportNotes ?? 'Exported for deployment');
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeploy = async () => {
    if (!onDeploy || !config) return;
    
    try {
      setIsDeploying(true);
      await onDeploy(config.id, deployNotes ?? 'Deployed to production');
      onClose();
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced blurred background overlay */}
      <div className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 transition-opacity" />

      {/* Modal panel */}
      <div className="bg-white rounded-lg shadow-2xl relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Configuration Details: {config?.endpointPath ?? 'Loading...'}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading configuration details...</span>
            </div>
          ) : config ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endpoint Path
                  </label>
                  <input
                    type="text"
                    value={config.endpointPath ?? 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Type
                  </label>
                  <input
                    type="text"
                    value={config.transactionType ?? 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Family
                  </label>
                  <input
                    type="text"
                    value={config.msgFam ?? 'N/A'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={config.version ?? 'v1'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                  />
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                  <Settings size={16} className="mr-2" />
                  Configuration Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Type
                    </label>
                    <input
                      type="text"
                      value={config.contentType ?? 'application/json'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tenant ID
                    </label>
                    <input
                      type="text"
                      value={config.tenantId ?? 'default'}
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
                      <Database size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Configuration ID:</span>
                        <span className="text-sm text-gray-900 block">{config.id}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Globe size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getConfigTypeColor(config.status)}`}>
                          {getStatusLabel(config.status ?? 'in-progress').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Settings size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Created By:</span>
                        <span className="text-sm text-gray-900 block">{config.createdBy ?? 'System'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Created:</span>
                        <span className="text-sm text-gray-900 block break-words">{formatDate(config.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Clock size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-700 block">Updated:</span>
                        <span className="text-sm text-gray-900 block break-words">{formatDate(config.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schema Preview */}
              {config.schema && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Database size={16} className="mr-2" />
                    Schema Configuration
                  </h4>
                  <div className="bg-white border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(config.schema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Mapping Preview */}
              {config.mapping && config.mapping.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Settings size={16} className="mr-2" />
                    Field Mappings ({config.mapping.length})
                  </h4>
                  <div className="bg-white border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(config.mapping, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Export Notes (for exporters) */}
              {userIsExporter && config.status === 'approved' && onExport && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Export Notes</h4>
                  <textarea
                    value={exportNotes}
                    onChange={(e) => { setExportNotes(e.target.value); }}
                    placeholder="Add notes about the export process (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Deploy Notes (for publishers) */}
              {userIsPublisher && config.status === 'exported' && onDeploy && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Deployment Notes</h4>
                  <textarea
                    value={deployNotes}
                    onChange={(e) => { setDeployNotes(e.target.value); }}
                    placeholder="Add notes about the deployment process (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Configuration details not found</p>
            </div>
          )}
        </div>

        {/* Action Buttons Footer - Approvers when status is under-review */}
        {config && !isLoading && userIsApprover && (onApprove || onReject) && (() => {
          const normalizedStatus = config.status.toLowerCase();
          if (normalizedStatus.startsWith('status_')) {
            const parts = normalizedStatus.split('_');
            if (parts.length >= 3) {
              const statusName = parts.slice(2).join('_');
              return statusName === 'under_review';
            }
          }
          return normalizedStatus === 'under_review' || normalizedStatus === 'under review';
        })() && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {onReject && (
              <Button
                variant="danger"
                onClick={() => {
                  onReject(config);
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
                  onApprove(config.id);
                  onClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </Button>
            )}
          </div>
        )}

        {/* Export Button Footer - Show for exporters when status is approved */}
        {config && !isLoading && onExport && userIsExporter && config.status === 'approved' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-blue-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
          </div>
        )}

        {/* Deploy Button Footer - Show for publishers when status is exported */}
        {config && !isLoading && onDeploy && userIsPublisher && config.status === 'exported' && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-purple-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Upload className="w-4 h-4" />
              <span>{isDeploying ? 'Deploying...' : 'Deploy'}</span>
            </Button>
          </div>
        )}

        {/* Default Footer - Show when no other footer is displayed */}
        {config && !isLoading && 
         !(userIsApprover && (() => {
           const normalizedStatus = config.status.toLowerCase();
           if (normalizedStatus.startsWith('status_')) {
             const parts = normalizedStatus.split('_');
             if (parts.length >= 3) {
               const statusName = parts.slice(2).join('_');
               return statusName === 'under_review';
             }
           }
           return normalizedStatus === 'under_review' || normalizedStatus === 'under review';
         })()) &&
         !(userIsExporter && config.status === 'approved') &&
         !(userIsPublisher && config.status === 'exported') && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigDetailsModal;