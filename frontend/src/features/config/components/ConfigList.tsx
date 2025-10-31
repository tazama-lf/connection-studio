import React, { useState, useEffect } from 'react';
import { EyeIcon, MoreVerticalIcon, EditIcon, CopyIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon, FilterIcon } from 'lucide-react';
import { configApi } from '../services/configApi';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { isExporter } from '../../../utils/roleUtils';

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
  onConfigClone?: (config: Config) => void;
  onViewDetails?: (config: Config) => void;
  onViewHistory?: (config: Config) => void;
  onRefresh?: () => void;
  searchTerm?: string;
  showPendingApprovals?: boolean;
  onApprove?: (configId: number) => void;
  onReject?: (config: Config) => void;
  onSendForDeployment?: (configId: number) => void;
}

export const ConfigList: React.FC<ConfigListProps> = ({
  onConfigSelect,
  onConfigEdit,
  onConfigClone,
  onViewDetails,
  onViewHistory,
  searchTerm: externalSearchTerm,
  showPendingApprovals = false,
  onApprove,
  onReject,
  onSendForDeployment
}) => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Status filtering state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Use external search term if provided, otherwise use empty string
  const searchTerm = externalSearchTerm || '';

  // Auth context for role-based filtering
  const { user } = useAuth();
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // Fetch configs based on showPendingApprovals flag
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (showPendingApprovals) {
        console.log('🔍 ConfigList - Fetching pending approvals...');
        response = await configApi.getPendingApprovals();
        console.log('🔍 ConfigList - Pending approvals response:', response);
        console.log('🔍 ConfigList - Pending approvals configs array:', response.configs);
        console.log('🔍 ConfigList - Pending approvals count:', response.configs?.length || 0);
      } else {
        console.log('🔍 ConfigList - Fetching all configurations...');
        response = await configApi.getAllConfigs();
      }
      
      const configsArray = response.configs || [];
      setConfigs(configsArray);
      console.log('✅ ConfigList - Final configs set to state:', configsArray);
      console.log('✅ ConfigList - Final configs count:', configsArray.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configurations';
      setError(errorMessage);
      console.error('❌ ConfigList - Error fetching configs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter configs by search term and status
  const filteredConfigs = configs.filter(config => {
    const matchesSearch = searchTerm === '' || 
      config.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.endpointPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.msgFam && config.msgFam.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || config.status.toLowerCase() === statusFilter.toLowerCase();
    
    // Role-based filtering: exporters can only see approved and deployed configs
    let matchesRole = true;
    if (userIsExporter) {
      const allowedStatuses = ['approved', 'deployed'];
      matchesRole = allowedStatuses.includes(config.status.toLowerCase());
    }
      
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Sort filtered configs
  const sortedConfigs = [...filteredConfigs].sort((a, b) => {
    let aValue: any = a[sortField as keyof Config];
    let bValue: any = b[sortField as keyof Config];

    // Handle date sorting
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else {
      // String sorting for other fields
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigs = sortedConfigs.slice(startIndex, endIndex);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setShowStatusFilter(false);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Get unique statuses for filter dropdown
  const uniqueStatuses = Array.from(new Set(configs.map(config => config.status))).sort();

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
      case 'approved':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'in-progress':
      case 'draft':
        return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
      case 'suspended':
      case 'rejected':
        return 'bg-red-50 text-red-600 border border-red-200';
      case 'cloned':
        return 'bg-purple-50 text-purple-600 border border-purple-200';
      case 'under_review':
      case 'under review':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'deployed':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
      case 'changes_requested':
      case 'changes requested':
        return 'bg-orange-50 text-orange-600 border border-orange-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'READY FOR APPROVAL';
      case 'draft':
      case 'in-progress':
        return 'IN-PROGRESS';
      case 'suspended':
        return 'SUSPENDED';
      case 'cloned':
        return 'CLONED';
      case 'approved':
        return 'APPROVED';
      case 'under review':
        return 'UNDER REVIEW';
      case 'deployed':
        return 'DEPLOYED';
      case 'rejected':
        return 'REJECTED';
      case 'changes_requested':
      case 'changes requested':
        return 'CHANGES REQUESTED';
      default:
        return status.toUpperCase().replace(/_/g, ' ');
    }
  };

  // Load configs when component mounts
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Close status filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusFilter && !(event.target as Element).closest('.status-filter-container')) {
        setShowStatusFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatusFilter]);

  const handleViewConfig = (config: Config) => {
    console.log('Viewing config:', config);
    if (onViewDetails) {
      onViewDetails(config);
    } else if (onConfigSelect) {
      onConfigSelect(config);
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
        <table className="min-w-full relative">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('endpointPath')}
              >
                <div className="flex items-center">
                  ENDPOINT PATH
                  {sortField === 'endpointPath' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="status-filter-container relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => setShowStatusFilter(!showStatusFilter)}
              >
                <div className="flex items-center">
                  STATUS
                  <FilterIcon className="w-4 h-4 ml-1" />
                  {statusFilter !== 'all' && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                      {statusFilter}
                    </span>
                  )}
                </div>
                {showStatusFilter && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[999]">
                    <div className="py-1">
                      <button
                        onClick={() => handleStatusFilter('all')}
                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                          statusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        All Statuses
                      </button>
                      {uniqueStatuses.map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusFilter(status)}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                            statusFilter === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {getStatusText(status)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  CREATED TIME
                  {sortField === 'createdAt' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedConfigs.length === 0 && !showPendingApprovals ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  {configs.length === 0 ? 'No configurations found' : 'No configurations match your search criteria'}
                </td>
              </tr>
            ) : (
              paginatedConfigs.map((config) => (
                <tr key={config.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {config.endpointPath}
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
                    <div className="flex items-center">
                      {/* Actions dropdown */}
                      <div className="relative dropdown-container">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === config.id ? null : config.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <MoreVerticalIcon className="w-4 h-4" />
                        </button>
                        {openDropdown === config.id && (
                          <DropdownMenuWithAutoDirection onClose={() => setOpenDropdown(null)}>
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleViewConfig(config);
                                  setOpenDropdown(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <EyeIcon className="w-4 h-4 mr-2" />
                                View
                              </button>
                              {onConfigEdit && (
                                <button
                                  onClick={() => {
                                    onConfigEdit(config);
                                    setOpenDropdown(null);
                                  }}
                                  disabled={config.status === 'under_review' || config.status === 'under review' || config.status === 'approved'}
                                  className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                    config.status === 'under_review' || config.status === 'under review' || config.status === 'approved'
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  <EditIcon className="w-4 h-4 mr-2" />
                                  Edit
                                </button>
                              )}
                              {onConfigClone && !showPendingApprovals && (
                                <button
                                  onClick={() => {
                                    onConfigClone(config);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <CopyIcon className="w-4 h-4 mr-2" />
                                  Clone
                                </button>
                              )}
                             
                            </div>
                          </DropdownMenuWithAutoDirection>
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
      {sortedConfigs.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedConfigs.length)} of {sortedConfigs.length} results
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigList;