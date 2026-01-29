import {
  Clock as ClockIcon,
  Database,
  SearchIcon,
  Activity as ActivityIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { useToast } from '../../../shared/providers/ToastProvider';
import { isExporter, isPublisher } from '../../../utils/common/roleUtils';
import { ExportedItemDetailsModal } from '../../exporter/components/ExportedItemDetailsModal';
import { ExportedItemsList } from '../../exporter/components/ExportedItemsList';
import type {
  SftpFileContent,
  SftpFileInfo,
  SftpFormat,
} from '../../exporter/services/sftpApi';
import { sftpApi, SftpError } from '../../exporter/services/sftpApi';

type TabType = 'cron' | 'de' | 'dems';

const PublisherExportedItemsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dems');
  const [searchTerm, setSearchTerm] = useState('');

  // SFTP Exported Items state
  const [exportedItems, setExportedItems] = useState<SftpFileInfo[]>([]);
  const [exportedItemsLoading, setExportedItemsLoading] = useState(false);
  const [selectedExportedItem, setSelectedExportedItem] =
    useState<SftpFileContent | null>(null);
  const [showExportedItemDetails, setShowExportedItemDetails] = useState(false);
  const [exportedItemDetailsLoading, setExportedItemDetailsLoading] =
    useState(false);

  const { showError, showSuccess } = useToast();
  const { user } = useAuth();

  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  useEffect(() => {
    loadExportedItems();
  }, [activeTab]);

  const loadExportedItems = async () => {
    console.log(
      'PublisherExportedItemsPage: loadExportedItems called with format:',
      activeTab,
    );
    setExportedItemsLoading(true);
    try {
      const files = await sftpApi.getAllFiles(activeTab as SftpFormat);
      console.log(
        'PublisherExportedItemsPage: Exported items loaded:',
        files.length,
      );
      setExportedItems(files);
    } catch (error) {
      console.error('Failed to load exported items:', error);

      let errorMessage = 'Failed to load exported items';
      if (error instanceof SftpError) {
        switch (error.errorType) {
          case 'CORRUPTED_FILE':
            errorMessage =
              'Some files appear to be corrupted or missing integrity verification';
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
    console.log(
      'PublisherExportedItemsPage: View exported item details clicked for:',
      filename,
    );
    try {
      setExportedItemDetailsLoading(true);
      setShowExportedItemDetails(true);

      const content = await sftpApi.readFile(filename);

      // Check user role and item status permissions
      // Publishers can view exported, approved, ready, ready-for-deployment, and deployed configs
      // Exporters can view exported and approved configs
      // const statusValue = content.status || '';
      // const canView = userIsExporter
      //   ? (isStatus(statusValue, 'exported') || isStatus(statusValue, 'approved'))
      //   : (isStatus(statusValue, 'exported') || isStatus(statusValue, 'approved') ||
      //      isStatus(statusValue, 'ready') || isStatus(statusValue, 'ready-for-deployment') ||
      //      isStatus(statusValue, 'deployed'));

      // if (!canView) {
      //   showError(`You don't have permission to view items with status "${statusValue}"`);
      //   setShowExportedItemDetails(false);
      //   return;
      // }

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

  const handlePublishExportedItem = async (
    id: string,
    format: SftpFormat,
    type?: 'PULL' | 'PUSH' | string,
  ) => {
    // Check if user has permission to publish based on their role
    // if (userIsExporter && selectedExportedItem) {
    //   const status = selectedExportedItem.status || '';
    //   if (!isStatus(status, 'exported') && !isStatus(status, 'approved')) {
    //     showError('Exporters can only publish items with "exported" or "approved" status');
    //     return;
    //   }
    // }

    // if (userIsPublisher && selectedExportedItem) {
    //   const status = selectedExportedItem.status || '';
    //   if (!isStatus(status, 'exported') && !isStatus(status, 'ready') && !isStatus(status, 'ready-for-deployment')) {
    //     showError('Publishers can only publish items with "exported", "ready", or "ready-for-deployment" status');
    //     return;
    //   }
    // }

    try {
      console.log('Publishing exported item:', { id, format, type });
      await sftpApi.publishItem(id, format, type);
      showSuccess(
        `${format === 'cron' ? 'Cron job' : format === 'de' ? 'Data enrichment job' : 'DEMS Configuration'} published successfully`,
      );
      loadExportedItems();
      setShowExportedItemDetails(false);
    } catch (error) {
      console.error('Failed to publish exported item:', error);

      let errorMessage = `Failed to publish ${format === 'cron' ? 'Cron job' : format === 'de' ? 'Data enrichment job' : 'DEMS Configuration'}`;

      // Handle different types of errors
      if (error instanceof SftpError) {
        switch (error.errorType) {
          case 'CORRUPTED_FILE':
            errorMessage =
              'Cannot publish: File is corrupted or has failed integrity verification';
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
          errorMessage =
            'Cannot publish: SFTP connection validation failed. Please check SFTP credentials and connectivity.';
        } else if (errorMsg.includes('sftp connection failed')) {
          errorMessage =
            'Cannot publish: SFTP server connection failed. Please verify SFTP server settings.';
        } else if (errorMsg.includes('authentication methods failed')) {
          errorMessage =
            'Cannot publish: SFTP authentication failed. Please check username, password, and key settings.';
        } else if (
          errorMsg.includes('job type') &&
          errorMsg.includes('required')
        ) {
          errorMessage =
            'Cannot publish: Job type information is missing. Please ensure the job configuration is complete.';
        } else {
          // Generic error message for other backend errors
          errorMessage = `Publish failed: ${error.message}`;
        }
      } else {
        // Fallback for unknown error types
        errorMessage =
          'An unexpected error occurred during publishing. Please try again.';
      }

      showError(errorMessage);
    }
  };

  const handleExportedItemsRefresh = () => {
    console.log(
      'PublisherExportedItemsPage: handleExportedItemsRefresh called',
    );
    loadExportedItems();
  };

  const tabs = [
    {
      id: 'dems' as TabType,
      name: 'DEMS',
      icon: <ActivityIcon size={28} style={{ color: '#3b82f6' }} />, // Blue
    },
    {
      id: 'cron' as TabType,
      name: 'Cron Jobs',
      icon: <ClockIcon size={28} style={{ color: '#f59e0b' }} />, // Amber
    },
    {
      id: 'de' as TabType,
      name: 'Data Enrichment Jobs',
      icon: <Database size={28} style={{ color: '#10b981' }} />, // Green
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-5 py-3 rounded-t-lg font-semibold text-base transition-all duration-200 cursor-pointer
                  ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border-b-4 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-b-4 border-transparent text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }
                `}
                style={{ minWidth: 140 }}
              >
                {tab.icon}
                <span>{tab.name}</span>
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
              placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.name}...`}
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
            format={activeTab as SftpFormat}
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
        format={activeTab as SftpFormat}
      />
    </div>
  );
};

export default PublisherExportedItemsPage;
