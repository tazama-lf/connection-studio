import React, { useState, useEffect } from 'react';
import { EyeIcon, ChevronDownIcon, HistoryIcon } from 'lucide-react';
import { configApi } from '../services/configApi';
import { Button } from '../../../shared/components/Button';

interface Config {
  id: number;
  msgFam: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  status: string;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mapping?: any[];
  schema?: any;
}

interface ConfigListProps {
  onConfigSelect?: (config: Config) => void;
  onConfigEdit?: (config: Config) => void;
  onConfigDelete?: (configId: number) => void;
  onViewDetails?: (config: Config) => void;
  onViewHistory?: (config: Config) => void;
  onRefresh?: () => void;
  searchTerm?: string;
}

export const ConfigList: React.FC<ConfigListProps> = ({
  onConfigSelect,
  onConfigEdit,
  onConfigDelete,
  onViewDetails,
  onViewHistory,
  onRefresh,
  searchTerm: externalSearchTerm
}) => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Use external search term if provided, otherwise use empty string
  const searchTerm = externalSearchTerm || '';

  // Fetch all configs on component mount
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching all configurations...');
      
      const response = await configApi.getAllConfigs();
      setConfigs(response.configs || []);
      console.log('Fetched configs:', response.configs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
      console.error('Error fetching configs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter configs by search term
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = searchTerm === '' || 
      config.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.endpointPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.tenantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.msgFam && config.msgFam.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'ready for approval':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'in-progress':
      case 'draft':
        return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
      case 'suspended':
        return 'bg-red-50 text-red-600 border border-red-200';
      case 'cloned':
        return 'bg-purple-50 text-purple-600 border border-purple-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Ready for Approval';
      case 'draft':
      case 'in-progress':
        return 'In-Progress';
      case 'suspended':
        return 'Suspended';
      case 'cloned':
        return 'Cloned';
      default:
        return status;
    }
  };

  // Load configs when component mounts
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };
    
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const handleViewConfig = (config: Config) => {
    console.log('Viewing config:', config);
    if (onViewDetails) {
      onViewDetails(config);
    } else if (onConfigSelect) {
      onConfigSelect(config);
    }
  };

  const handleEditConfig = (config: Config) => {
    console.log('Editing config:', config);
    if (onConfigEdit) {
      onConfigEdit(config);
    }
  };

  const handleDeleteConfig = (configId: number) => {
    console.log('Deleting config:', configId);
    if (onConfigDelete) {
      onConfigDelete(configId);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ENDPOINT PATH
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TENANT ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                CREATED TIME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedConfigs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {configs.length === 0 ? 'No configurations found' : 'No configurations match your search criteria'}
                </td>
              </tr>
            ) : (
              paginatedConfigs.map((config) => (
                <tr key={config.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {config.endpointPath}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">
                    {config.tenantId}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(config.status)}`}>
                      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                      {getStatusText(config.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {formatDate(config.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewConfig(config)}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <div className="relative">
                        <Button
                          variant="primary"
                          size="sm"
                          className="px-3 py-1.5 flex items-center text-sm font-medium"
                          onClick={() => setOpenDropdown(openDropdown === config.id ? null : config.id)}
                        >
                          Actions
                          <ChevronDownIcon className="w-4 h-4 ml-1" />
                        </Button>
                        
                        {/* Dropdown Menu */}
                        {openDropdown === config.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setOpenDropdown(null);
                                  if (onViewHistory) {
                                    onViewHistory(config);
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <HistoryIcon className="w-4 h-4 mr-2" />
                                View History
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredConfigs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredConfigs.length)} of {filteredConfigs.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigList;