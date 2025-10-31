import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { SearchIcon, Clock, Database } from 'lucide-react';
import { sftpApi, SftpError } from '../../exporter/services/sftpApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { SftpFileInfo, SftpFileContent, SftpFormat } from '../../exporter/services/sftpApi';
import { ExportedItemsList } from '../../exporter/components/ExportedItemsList';
import { ExportedItemDetailsModal } from '../../exporter/components/ExportedItemDetailsModal';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { isExporter, isPublisher } from '../../../utils/roleUtils';

type TabType = 'cron' | 'de';

const PublisherExportedItemsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cron');
  const [searchTerm, setSearchTerm] = useState('');
  
  // SFTP Exported Items state
  const [exportedItems, setExportedItems] = useState<SftpFileInfo[]>([]);
  const [exportedItemsLoading, setExportedItemsLoading] = useState(false);
  const [selectedExportedItem, setSelectedExportedItem] = useState<SftpFileContent | null>(null);
  const [showExportedItemDetails, setShowExportedItemDetails] = useState(false);
  const [exportedItemDetailsLoading, setExportedItemDetailsLoading] = useState(false);
  
  const { showError, showSuccess } = useToast();
  const { user } = useAuth();

  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  useEffect(() => {
    loadExportedItems();
  }, [activeTab]);

  const loadExportedItems = async () => {
    console.log('PublisherExportedItemsPage: loadExportedItems called with format:', activeTab);
    setExportedItemsLoading(true);
    try {
      const files = await sftpApi.getAllFiles(activeTab);
      console.log('PublisherExportedItemsPage: Exported items loaded:', files.length);
      setExportedItems(files);
    } catch (error) {
      console.error('Failed to load exported items:', error);
      
      let errorMessage = 'Failed to load exported items';
      if (error instanceof SftpError) {
        switch (error.errorType) {
          case 'CORRUPTED_FILE':
            errorMessage = 'Some files appear to be corrupted or missing integrity verification';
            break;
          case 'NOT_FOUND':
            errorMessage = 'SFTP directory not found or inaccessible';
            break;
          case 'UNAUTHORIZED':
            errorMessage = 'Unauthorized access to SFTP server';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      showError(errorMessage);
      setExportedItems([]);
    } finally {
      setExportedItemsLoading(false);
    }
  };

  const handleViewExportedItemDetails = async (filename: string) => {
    console.log('PublisherExportedItemsPage: View exported item details clicked for:', filename);
    try {
      setExportedItemDetailsLoading(true);
      setShowExportedItemDetails(true);
      
      const content = await sftpApi.readFile(filename);
      
      // Check user role and item status permissions
      const allowedStatuses = userIsExporter ? ['exported', 'approved'] : ['exported', 'approved', 'ready-for-deployment', 'deployed'];
      if (!allowedStatuses.includes(content.status || '')) {
        showError(`You don't have permission to view items with status "${content.status || 'unknown'}"`);
        setShowExportedItemDetails(false);
        return;
      }
      
      setSelectedExportedItem(content);
    } catch (error) {
      console.error('Failed to load exported item details:', error);
      
      let errorMessage = 'Failed to load exported item details';
      if (error instanceof SftpError) {
        switch (error.errorType) {
          case 'CORRUPTED_FILE':
            errorMessage = `File "${filename}" is corrupted or has failed integrity verification. The file may be incomplete or damaged.`;
            break;
          case 'NOT_FOUND':
            errorMessage = `File "${filename}" not found on the SFTP server`;
            break;
          case 'UNAUTHORIZED':
            errorMessage = 'Unauthorized access to read the file';
            break;
          default:
            errorMessage = `Failed to read file "${filename}": ${error.message}`;
        }
      }
      
      showError(errorMessage);
      setShowExportedItemDetails(false);
    } finally {
      setExportedItemDetailsLoading(false);
    }
  };

  const handlePublishExportedItem = async (id: string, format: SftpFormat, type?: 'PULL' | 'PUSH' | string) => {
    // Check if user has permission to publish based on their role
    if (userIsExporter && selectedExportedItem && !['exported', 'approved'].includes(selectedExportedItem.status || '')) {
      showError('Exporters can only publish items with "exported" or "approved" status');
      return;
    }
    
    if (userIsPublisher && selectedExportedItem && !['exported', 'ready-for-deployment'].includes(selectedExportedItem.status || '')) {
      showError('Publishers can only publish items with "exported" or "ready-for-deployment" status');
      return;
    }

    try {
      console.log('Publishing exported item:', { id, format, type });
      await sftpApi.publishItem(id, format, type);
      showSuccess(`${format === 'cron' ? 'Cron job' : 'Data enrichment job'} published successfully`);
      loadExportedItems();
      setShowExportedItemDetails(false);
    } catch (error) {
      console.error('Failed to publish exported item:', error);
      
      let errorMessage = `Failed to publish ${format === 'cron' ? 'cron job' : 'data enrichment job'}`;
      
      // Handle different types of errors
      if (error instanceof SftpError) {
        switch (error.errorType) {
          case 'CORRUPTED_FILE':
            errorMessage = 'Cannot publish: File is corrupted or has failed integrity verification';
            break;
          case 'NOT_FOUND':
            errorMessage = 'Cannot publish: Item not found or has been removed';
            break;
          case 'UNAUTHORIZED':
            errorMessage = 'Unauthorized to publish this item';
            break;
          default:
            errorMessage = `Failed to publish: ${error.message}`;
        }
      } else if (error instanceof Error) {
        // Handle backend validation errors
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('dry run failed') && errorMsg.includes('sftp')) {
          errorMessage = 'Cannot publish: SFTP connection validation failed. Please check SFTP credentials and connectivity.';
        } else if (errorMsg.includes('sftp connection failed')) {
          errorMessage = 'Cannot publish: SFTP server connection failed. Please verify SFTP server settings.';
        } else if (errorMsg.includes('authentication methods failed')) {
          errorMessage = 'Cannot publish: SFTP authentication failed. Please check username, password, and key settings.';
        } else if (errorMsg.includes('job type') && errorMsg.includes('required')) {
          errorMessage = 'Cannot publish: Job type information is missing. Please ensure the job configuration is complete.';
        } else {
          // Generic error message for other backend errors
          errorMessage = `Publish failed: ${error.message}`;
        }
      } else {
        // Fallback for unknown error types
        errorMessage = 'An unexpected error occurred during publishing. Please try again.';
      }
      
      showError(errorMessage);
    }
  };

  const handleExportedItemsRefresh = () => {
    console.log('PublisherExportedItemsPage: handleExportedItemsRefresh called');
    loadExportedItems();
  };

  const tabs = [
    {
      id: 'cron' as TabType,
      name: 'Cron Jobs',
      icon: <Clock size={18} />,
      count: exportedItems.filter(item => item.name.includes('_cron_')).length,
    },
    {
      id: 'de' as TabType,
      name: 'DE Jobs',
      icon: <Database size={18} />,
      count: exportedItems.filter(item => item.name.includes('_de_')).length,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Exported Items" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Exported Items</h1>
          <p className="text-gray-600 mt-1">
            Review and publish exported items that are ready for deployment
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.name}
                <span className={`
                  ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full md:w-96">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.name.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          <ExportedItemsList
            files={exportedItems}
            isLoading={exportedItemsLoading}
            onViewDetails={handleViewExportedItemDetails}
            onRefresh={handleExportedItemsRefresh}
            searchQuery={searchTerm}
            format={activeTab}
          />
        </div>
      </div>

      {/* Exported Item Details Modal */}
      <ExportedItemDetailsModal
        isOpen={showExportedItemDetails}
        onClose={() => setShowExportedItemDetails(false)}
        content={selectedExportedItem}
        isLoading={exportedItemDetailsLoading}
        onPublish={handlePublishExportedItem}
        format={activeTab}
      />
    </div>
  );
};

export default PublisherExportedItemsPage;
