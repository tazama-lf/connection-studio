import React, { useState, useEffect } from 'react';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { ConfigList } from '../../config/components/ConfigList';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import { configApi } from '../../config/services/configApi';
import { isExporter } from '../../../utils/roleUtils';
import type { Config } from '../../config/index';
import { Button } from '@shared';
import { ActivityIcon, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export const ExporterConfigsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
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
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey((prev) => prev + 1);
  };

  const handleExportConfig = async (configId: number) => {
    try {
      console.log(
        `🔄 ExporterConfigsPage - Starting export to SFTP for config ID: ${configId}`,
      );
      console.log(`👤 ExporterConfigsPage - User info:`, {
        userId: user?.id,
        email: user?.email,
      });
      const result = await configApi.exportConfig(
        configId,
        'Exported for deployment',
      );
      console.log(`✅ ExporterConfigsPage - Export completed:`, result);
      showSuccess(
        'Configuration exported to SFTP and status updated to EXPORTED successfully',
      );
      console.log('🔄 ExporterConfigsPage - Refreshing config list...');
      setRefreshKey((prev) => prev + 1); // Refresh the list
    } catch (error) {
      console.error('❌ ExporterConfigsPage - Export failed:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to export configuration';
      showError(errorMessage);
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              You do not have permission to access this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>

        {/* Search Bar and Export Actions */}

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ActivityIcon size={28} style={{ color: '#3b82f6' }} />
              Dynamic Event Monitoring Service
            </h1>
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
