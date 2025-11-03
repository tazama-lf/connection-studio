import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { ConfigList } from '../../config/components/ConfigList';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import { configApi } from '../../config/services/configApi';
import { isExporter } from '../../../utils/roleUtils';
import type { Config } from '../../config/index';

export const ExporterConfigsPage: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(null);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access this page');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);



  // Handlers
  const handleViewConfig = async (config: Config) => {
    // Open EditEndpointModal for viewing - same workflow as approver
    setEditingEndpointId(config.id);
    setEditingConfig(config);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setEditingConfig(null);
    // Refresh the config list when modal closes
    setRefreshKey(prev => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey(prev => prev + 1);
  };

  const handleExportConfig = async (configId: number) => {
    try {
      console.log(`🔄 ExporterConfigsPage - Starting export to SFTP for config ID: ${configId}`);
      console.log(`👤 ExporterConfigsPage - User info:`, { userId: user?.id, email: user?.email });
      const result = await configApi.exportConfig(configId, 'Exported for deployment');
      console.log(`✅ ExporterConfigsPage - Export completed:`, result);
      showSuccess('Configuration exported to SFTP and status updated to EXPORTED successfully');
      console.log('🔄 ExporterConfigsPage - Refreshing config list...');
      setRefreshKey(prev => prev + 1); // Refresh the list
    } catch (error) {
      console.error('❌ ExporterConfigsPage - Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export configuration';
      showError(errorMessage);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthHeader title="Dynamic Endpoint Monitoring Service" showBackButton={true} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Dynamic Endpoint Monitoring Service" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
        

          {/* Search Bar and Export Actions */}
          <div className="flex items-center justify-between">
            <div className="relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search approved configurations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
           
          </div>
        </div>

        {/* Configurations Table */}
        <ConfigList
          searchTerm={searchTerm}
          onViewDetails={handleViewConfig}
          onRefresh={handleRefresh}
          showApprovedConfigs={true}
        />
      </div>

      {/* Config Details Modal - Same as Approver/Editor */}
      {editingEndpointId !== null && (
        <EditEndpointModal
          isOpen={editingEndpointId !== null}
          onClose={handleCloseModal}
          endpointId={editingEndpointId}
          onSuccess={handleConfigSuccess}
          readOnly={true}
          onSendForDeployment={() => handleExportConfig(editingEndpointId)}
        />
      )}
    </div>
  );
};

export default ExporterConfigsPage;