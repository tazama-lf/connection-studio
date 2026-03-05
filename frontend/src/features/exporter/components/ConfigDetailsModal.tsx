import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import type { Config } from '../../config';
import { Button } from '../../../shared/components/Button';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface ConfigDetailsModalProps {
  config: Config | null;
  isOpen: boolean;
  onClose: () => void;
  onExport: (configId: number) => Promise<void>;
}

export const ConfigDetailsModal: React.FC<ConfigDetailsModalProps> = ({
  config,
  isOpen,
  onClose,
  onExport,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !config) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(config.id);
      onClose();
    } catch (error) {
      setIsExporting(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Configuration Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(config.status ?? 'approved')}`}>
                {getStatusLabel(config.status ?? 'approved')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Config ID
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200 font-mono break-all">
                  {config.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                  {config.transactionType ?? 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Configuration
              </label>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-medium text-gray-600">Message Family:</span>
                      <p className="text-sm text-gray-900">{config.msgFam ?? 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Version:</span>
                      <p className="text-sm text-gray-900">{config.version ?? 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Endpoint Path:</span>
                      <p className="text-sm text-gray-900 font-mono">{config.endpointPath ?? 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-600">Content Type:</span>
                      <p className="text-sm text-gray-900">{config.contentType ?? 'N/A'}</p>
                    </div>
                  </div>
                  {config.mapping && config.mapping.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs font-medium text-gray-600">Field Mappings:</span>
                      <pre className="text-xs text-gray-900 mt-1 whitespace-pre-wrap break-words">
                        {JSON.stringify(config.mapping, null, 2)}
                      </pre>
                    </div>
                  )}
                  {config.schema && (
                    <div className="mt-4">
                      <span className="text-xs font-medium text-gray-600">Schema:</span>
                      <pre className="text-xs text-gray-900 mt-1 whitespace-pre-wrap break-words">
                        {JSON.stringify(config.schema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created At
                </label>
                <p className="text-sm text-gray-900">
                  {config.createdAt
                    ? new Date(config.createdAt).toLocaleString('en-US', {
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
                  {config.updatedAt
                    ? new Date(config.updatedAt).toLocaleString('en-US', {
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
          </div>

         <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isExporting}
            >
              Close
            </Button>
            <Button
              onClick={handleExport}
              variant="primary"
              disabled={isExporting}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigDetailsModal;
