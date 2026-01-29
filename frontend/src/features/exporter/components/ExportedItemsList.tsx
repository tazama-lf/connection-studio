import React, { useState, useEffect } from 'react';
import { Eye, Clock, Database, EyeIcon } from 'lucide-react';
import {
  sftpApi,
  type SftpFileInfo,
  type SftpFormat,
} from '../services/sftpApi';
import { Button } from '../../../shared/components/Button';
import { Tooltip } from '@mui/material';

interface ExportedItemsListProps {
  files: SftpFileInfo[];
  isLoading?: boolean;
  onViewDetails?: (filename: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
  format: SftpFormat;
}

interface DemsFileData {
  endpointPath?: string;
  status?: string;
  createdAt?: string;
  transactionType?: string;
}

// Helper function for descending order sort
const descOrder = (a: string, b: string) => {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
};

export const ExportedItemsList: React.FC<ExportedItemsListProps> = (props) => {
  const {
    files,
    isLoading = false,
    onViewDetails,
    onRefresh,
    searchQuery = '',
    format,
  } = props;

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [demsFileData, setDemsFileData] = useState<
    Record<string, DemsFileData>
  >({});

  console.log('format, files', format, files);

  // Load DEMS file content when format is 'dems'
  useEffect(() => {
    if (format === 'dems' && files.length > 0) {
      const loadDemsData = async () => {
        const newDemsData: Record<string, DemsFileData> = {};

        for (const file of files) {
          try {
            const content = await sftpApi.readFile(file.name);
            newDemsData[file.name] = {
              endpointPath: content.endpointPath,
              status: content.status,
              createdAt: content.createdAt || content.created_at,
              transactionType: content.transactionType,
            };
          } catch (error) {
            console.error(`Failed to load DEMS data for ${file.name}:`, error);
            // Use fallback data based on filename
            newDemsData[file.name] = {
              endpointPath: file.name.replace('.json', ''),
              status: 'ready',
              createdAt: new Date(file.modifyTime).toISOString(),
              transactionType: 'Unknown',
            };
          }
        }

        setDemsFileData(newDemsData);
      };

      loadDemsData();
    }
  }, [format, files]);

  // Filter files based on search query
  const filteredFiles = files
    .filter((file) => {
      const query = searchQuery.toLowerCase();
      if (format === 'dems') {
        const fileData = demsFileData[file.name];
        return (
          file.name.toLowerCase().includes(query) ||
          fileData?.endpointPath?.toLowerCase().includes(query) ||
          fileData?.transactionType?.toLowerCase().includes(query) ||
          fileData?.status?.toLowerCase().includes(query)
        );
      }
      return file.name.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      // Sort by created_at in descending order
      if (format === 'dems') {
        const aCreatedAt = demsFileData[a.name]?.createdAt;
        const bCreatedAt = demsFileData[b.name]?.createdAt;
        if (aCreatedAt && bCreatedAt) {
          return descOrder(aCreatedAt, bCreatedAt);
        }
      }
      // For non-DEMS or when createdAt is not available, sort by modifyTime
      return descOrder(a.modifyTime.toString(), b.modifyTime.toString());
    });

  // Load DEMS file content to get endpoint paths and statuses
  useEffect(() => {
    if (format === 'dems' && files.length > 0) {
      const loadDemsData = async () => {
        const dataMap: Record<string, DemsFileData> = {};

        // Load file content for each DEMS file
        await Promise.all(
          files.map(async (file) => {
            try {
              const content = await sftpApi.readFile(file.name);
              dataMap[file.name] = {
                endpointPath: content.endpointPath,
                status: content.status,
                createdAt: content.createdAt,
                transactionType: content.transactionType,
              };
            } catch (error) {
              console.error(`Failed to load content for ${file.name}:`, error);
              // Keep default values
              dataMap[file.name] = {
                endpointPath: file.name,
                status: 'unknown',
                createdAt: new Date(file.modifyTime).toISOString(),
              };
            }
          }),
        );

        setDemsFileData(dataMap);
      };

      loadDemsData();
    }
  }, [format, files]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest('.actions-dropdown')) {
        return;
      }

      setDropdownOpen(null);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date from timestamp
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading exported files...</span>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    const hasSearchQuery = searchQuery && searchQuery.trim() !== '';
    const formatLabel =
      format === 'cron'
        ? 'Cron Jobs'
        : format === 'de'
          ? 'Data Enrichment Jobs'
          : 'DEMS Configurations';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            {format === 'cron' ? (
              <Clock className="w-12 h-12 text-gray-400" />
            ) : format === 'de' ? (
              <Database className="w-12 h-12 text-gray-400" />
            ) : (
              <Eye className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasSearchQuery
              ? 'No files match your search'
              : `No exported ${formatLabel.toLowerCase()} yet`}
          </h3>
          <p className="text-gray-500 mb-6">
            {hasSearchQuery
              ? 'Try adjusting your search terms'
              : `Exported ${formatLabel.toLowerCase()} will appear here when they are ready for deployment`}
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="secondary">
              Refresh
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase tracking-wider">
                {format === 'dems' ? 'ENDPOINT PATH' : 'FILENAME'}
              </th>
              {format !== 'dems' && (
                <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase tracking-wider">
                  SIZE
                </th>
              )}
              <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase tracking-wider">
                CREATED AT
              </th>
              <th className="px-6 py-4 text-center text-base font-bold text-gray-700 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredFiles.map((file, index) => {
              const fileData =
                format === 'dems' ? demsFileData[file.name] : null;

              return (
                <tr
                  key={file.name}
                  className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                >
                  <td className="px-6 py-4">
                    {format === 'dems' ? (
                      <div className="text-sm font-medium text-gray-900">
                        {fileData?.endpointPath || file.name}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {file.name}
                      </div>
                    )}
                  </td>
                  {format !== 'dems' && (
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {formatFileSize(file.size)}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {format === 'dems' && fileData?.createdAt
                        ? formatDate(new Date(fileData.createdAt).getTime())
                        : formatDate(file.modifyTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onViewDetails?.(file.name)}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 focus:outline-none"
                    >
                      <Tooltip title="View Details" arrow placement="top">
                        <EyeIcon
                          size={20}
                          style={{ color: '#2b7fff', cursor: 'pointer' }}
                        />
                      </Tooltip>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExportedItemsList;
