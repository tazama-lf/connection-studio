import React, { useState } from 'react';
import { Eye, MoreVertical, Clock, Database } from 'lucide-react';
import type { SftpFileInfo, SftpFormat } from '../services/sftpApi';
import { Button } from '../../../shared/components/Button';
import { DropdownMenuWithAutoDirection } from '../../data-enrichment/components/DropdownMenuWithAutoDirection';

interface ExportedItemsListProps {
  files: SftpFileInfo[];
  isLoading?: boolean;
  onViewDetails?: (filename: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
  format: SftpFormat;
}

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

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      hour12: true
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
    const formatLabel = format === 'cron' ? 'Cron Jobs' : 'Data Enrichment Jobs';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            {format === 'cron' ? (
              <Clock className="w-12 h-12 text-gray-400" />
            ) : (
              <Database className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasSearchQuery ? 'No files match your search' : `No exported ${formatLabel.toLowerCase()} yet`}
          </h3>
          <p className="text-gray-500 mb-6">
            {hasSearchQuery
              ? 'Try adjusting your search terms'
              : `Exported ${formatLabel.toLowerCase()} will appear here when they are ready for deployment`
            }
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                FILENAME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                SIZE
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                MODIFIED
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredFiles.map((file, index) => {
              const isFirstRow = index === 0;
              const isLastRow = index === filteredFiles.length - 1;
              const forceDirection = isFirstRow ? 'top' : isLastRow ? 'top' : 'auto';
              
              return (
                <tr key={file.name} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {file.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {formatFileSize(file.size)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {formatDate(file.modifyTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 relative overflow-visible">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="relative actions-dropdown">
                        <button
                          onClick={() => {
                            setDropdownOpen(dropdownOpen === file.name ? null : file.name);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === file.name ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownOpen === file.name && (
                          <DropdownMenuWithAutoDirection forceDirection={forceDirection}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  onViewDetails?.(file.name);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </button>
                            </div>
                          </DropdownMenuWithAutoDirection>
                        )}
                      </div>
                    </div>
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
