import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import type { Config } from '../../features/config/index';
import { configApi } from '../../features/config/services/configApi';
import { useToast } from '../providers/ToastProvider';

interface CloneConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config | null;
  onSuccess?: () => void;
}

export const CloneConfigModal: React.FC<CloneConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess
}) => {
  const [newVersion, setNewVersion] = useState('');
  const [newEndpointName, setNewEndpointName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const { showSuccess, showError } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && config) {
      // Initialize with suggested values
      const currentVersion = config.version || '1';
      const versionNumber = parseInt(currentVersion);
      const nextVersion = isNaN(versionNumber) ? '2' : (versionNumber + 1).toString();
      setNewVersion(nextVersion);
      setNewEndpointName(config.endpointPath || '');
    } else {
      setNewVersion('');
      setNewEndpointName('');
    }
  }, [isOpen, config]);

  const handleClone = async () => {
    if (!config || !newVersion.trim()) {
      showError('Version is required');
      return;
    }

    setIsCloning(true);
    try {
      const cloneData = {
        sourceConfigId: config.id,
        newTransactionType: config.transactionType,
        newVersion: newVersion.trim(),
        newMsgFam: config.msgFam
      };

      console.log('🔄 Cloning config with data:', cloneData);
      const result = await configApi.cloneConfig(cloneData);
      
      if (result.success) {
        showSuccess(`Configuration cloned successfully as version ${newVersion}`);
        onSuccess?.();
        onClose();
      } else {
        showError(result.message || 'Failed to clone configuration');
      }
    } catch (error) {
      console.error('❌ Clone failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone configuration';
      showError(errorMessage);
    } finally {
      setIsCloning(false);
    }
  };

  if (!isOpen || !config) return null;

  // Determine clone type based on config type (this is a simplified approach)
  const isInboundJob = config.endpointPath?.includes('/inbound/') || config.transactionType?.toLowerCase().includes('pull');
  const cloneType = isInboundJob ? 'Pull Job' : 'Push Job';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Clone {cloneType}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Source Config Info */}
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-sm font-medium text-gray-700">Source Configuration</p>
              <p className="text-sm text-gray-600">ID: {config.id}</p>
              <p className="text-sm text-gray-600">Type: {config.transactionType}</p>
              <p className="text-sm text-gray-600">Current Version: {config.version}</p>
              <p className="text-sm text-gray-600">Endpoint: {config.endpointPath}</p>
            </div>

            {/* New Version Field - Always Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Version *
              </label>
              <input
                type="text"
                value={newVersion}
                onChange={(e) => { setNewVersion(e.target.value); }}
                placeholder="Enter new version"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCloning}
              />
            </div>

            {/* New Endpoint Name - Only for Pull Jobs */}
            {isInboundJob && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Endpoint Name
                </label>
                <input
                  type="text"
                  value={newEndpointName}
                  onChange={(e) => { setNewEndpointName(e.target.value); }}
                  placeholder="Enter new endpoint name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isCloning}
                />
              </div>
            )}

            {/* Read-only Fields Info */}
            <div className="text-sm text-gray-500">
              <p>• Transaction Type, Message Family, and other fields will be copied from the source configuration</p>
              <p>• The cloned configuration will start with IN_PROGRESS status</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onClose}
              variant="secondary"
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              variant="primary"
              disabled={isCloning || !newVersion.trim()}
            >
              {isCloning ? 'Cloning...' : 'Clone Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloneConfigModal;