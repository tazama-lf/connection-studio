import React, { useState, useEffect } from 'react';
import { EyeIcon, MoreVerticalIcon, EditIcon, CopyIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon, FilterIcon, Upload, Rocket, Power, PowerOff } from 'lucide-react';
import { configApi } from '../services/configApi';
import { sftpApi } from '../../../features/exporter/services/sftpApi';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../../features/auth/contexts/AuthContext';
import { isExporter, isPublisher } from '../../../utils/roleUtils';
import { useToast } from '../../../shared/providers/ToastProvider';

interface Config {
  id: number;
  msgFam: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  status: string;
  publishing_status?: 'active' | 'inactive';
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
  showApprovedConfigs?: boolean;
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
  onRefresh,
  searchTerm: externalSearchTerm,
  showPendingApprovals = false,
  showApprovedConfigs = false,
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
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;
  const { showSuccess, showError } = useToast();

  // Fetch configs based on flags
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
        
        // Debug: Log each config's status
        if (response.configs && Array.isArray(response.configs)) {
          response.configs.forEach((config: any, index: number) => {
            console.log(`🔍 ConfigList - Config ${index + 1} status:`, config.status, 'ID:', config.id);
          });
        }
      } else if (showApprovedConfigs) {
        console.log('🔍 ConfigList - Fetching approved and exported configurations...');
        // Fetch both approved and exported configs
        const [approvedResponse, exportedResponse] = await Promise.all([
          configApi.getConfigsByStatus('approved'),
          configApi.getConfigsByStatus('exported')
        ]);
        console.log('🔍 ConfigList - Approved configs response:', approvedResponse);
        console.log('🔍 ConfigList - Exported configs response:', exportedResponse);
        
        // Combine both arrays
        const combinedConfigs = [
          ...(Array.isArray(approvedResponse.configs) ? approvedResponse.configs : []),
          ...(Array.isArray(exportedResponse.configs) ? exportedResponse.configs : [])
        ];
        
        response = { configs: combinedConfigs };
        console.log('🔍 ConfigList - Combined configs count:', combinedConfigs.length);
      } else {
        console.log('🔍 ConfigList - Fetching all configurations...');
        response = await configApi.getAllConfigs();
      }
      
      const configsArray = Array.isArray(response.configs) ? response.configs : [];
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
const getStatusText = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    // Handle STATUS_XX_NAME format from database
    if (normalizedStatus.startsWith('status_')) {
      // Extract the name part after the number (e.g., STATUS_03_UNDER_REVIEW -> UNDER_REVIEW)
      const parts = normalizedStatus.split('_');
      if (parts.length >= 3) {
        const statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
        switch (statusName) {
          case 'in_progress':
            return 'IN-PROGRESS';
          case 'under_review':
            return 'UNDER REVIEW';
          case 'approved':
            return 'APPROVED';
          case 'rejected':
            return 'REJECTED';
          case 'changes_requested':
            return 'CHANGES REQUESTED';
          case 'exported':
            return 'EXPORTED';
          case 'ready_for_deployment':
            return 'READY FOR DEPLOYMENT';
          case 'deployed':
            return 'DEPLOYED';
          case 'suspended':
            return 'SUSPENDED';
          default:
            return statusName.toUpperCase().replace(/_/g, ' ');
        }
      }
    }
    
    // Handle legacy status formats
    switch (normalizedStatus) {
      case 'active':
        return 'READY FOR APPROVAL';
      case 'draft':
      case 'in-progress':
      case 'in_progress':
        return 'IN-PROGRESS';
      case 'suspended':
        return 'SUSPENDED';
      case 'status_01_in_progress':
        return 'IN-PROGRESS';
      case 'cloned':
        return 'CLONED';
      case 'approved':
        return 'APPROVED';
      case 'under review':
      case 'under_review':
        return 'UNDER REVIEW';
      case 'deployed':
        return 'DEPLOYED';
      case 'rejected':
        return 'REJECTED';
      case 'changes_requested':
      case 'changes requested':
        return 'CHANGES REQUESTED';
      case 'exported':
        return 'EXPORTED';
      case 'ready_for_deployment':
      case 'ready for deployment':
        return 'READY FOR DEPLOYMENT';
      default:
        return status.toUpperCase().replace(/_/g, ' ');
    }
  };
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
    const normalizedStatus = status.toLowerCase();
    
    // Handle STATUS_XX_NAME format from database
    if (normalizedStatus.startsWith('status_')) {
      const parts = normalizedStatus.split('_');
      if (parts.length >= 3) {
        const statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
        switch (statusName) {
          case 'in_progress':
            return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
          case 'under_review':
            return 'bg-blue-50 text-blue-600 border border-blue-200';
          case 'approved':
            return 'bg-green-50 text-green-600 border border-green-200';
          case 'rejected':
            return 'bg-red-50 text-red-600 border border-red-200';
          case 'changes_requested':
            return 'bg-orange-50 text-orange-600 border border-orange-200';
          case 'exported':
            return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
          case 'ready_for_deployment':
            return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
          case 'deployed':
            return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
          case 'suspended':
            return 'bg-red-50 text-red-600 border border-red-200';
          default:
            return 'bg-gray-50 text-gray-600 border border-gray-200';
        }
      }
    }
    
    // Handle legacy status formats
    switch (normalizedStatus) {
      case 'active':
      case 'ready for approval':
      case 'approved':
        return 'bg-green-50 text-green-600 border border-green-200';
      case 'in-progress':
      case 'in_progress':
      case 'draft':
      case 'status_01_in_progress':
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
      case 'exported':
        return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
      case 'ready_for_deployment':
      case 'ready for deployment':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  // Helper function to normalize status for comparisons
  const normalizeStatus = (status: string): string => {
    const normalizedStatus = status.toLowerCase();
    
    // Handle STATUS_XX_NAME format from database
    if (normalizedStatus.startsWith('status_')) {
      const parts = normalizedStatus.split('_');
      if (parts.length >= 3) {
        return parts.slice(2).join('_'); // Get everything after STATUS_XX_
      }
    }
    
    return normalizedStatus;
  };

  // Filter configs by search term and status
  const filteredConfigs = (Array.isArray(configs) ? configs : []).filter(config => {
    const matchesSearch = searchTerm === '' || 
      config.transactionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.endpointPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (config.msgFam && config.msgFam.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || getStatusText(config.status) === statusFilter;
    
    // Role-based filtering: exporters can only see approved and deployed configs
    let matchesRole = true;
    if (userIsExporter) {
      const allowedStatuses = ['approved', 'deployed'];
      const normalizedConfigStatus = normalizeStatus(config.status);
      matchesRole = allowedStatuses.includes(normalizedConfigStatus);
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

  // Handle status filter (now works with display text)
  const handleStatusFilter = (displayText: string) => {
    setStatusFilter(displayText);
    setShowStatusFilter(false);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Get unique statuses for filter dropdown (normalized to avoid duplicates)
  const uniqueStatuses = Array.from(new Set(configs.map(config => getStatusText(config.status)))).sort();

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

  const handleExportConfig = async (config: Config) => {
    try {
      await configApi.exportConfig(config.id, 'Exported for deployment');
      showSuccess("Success", `Config "${config.msgFam}" has been exported to SFTP and status updated to EXPORTED.`);
      
      // Refetch configs to update the UI
      await fetchConfigs();
      
      // Trigger parent refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error exporting config:', error);
      showError("Error", "Failed to export config. Please try again.");
    }
  };

  const handlePublishConfig = async (config: Config) => {
    try {
      await sftpApi.publishItem(config.msgFam, 'dems');
      await configApi.updateConfigStatus(config.id, 'deployed');
      showSuccess("Success", `Config "${config.msgFam}" has been published successfully.`);
      // Trigger refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error publishing config:', error);
      showError("Error", "Failed to publish config. Please try again.");
    }
  };

  const handleActivateConfig = async (config: Config) => {
    try {
      await configApi.updatePublishingStatus(config.id, 'active');
      showSuccess("Success", `Config "${config.msgFam}" has been activated.`);
      // Refetch configs to update the UI
      await fetchConfigs();
      // Trigger parent refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error activating config:', error);
      showError("Error", "Failed to activate config. Please try again.");
    }
  };

  const handleDeactivateConfig = async (config: Config) => {
    try {
      await configApi.updatePublishingStatus(config.id, 'inactive');
      showSuccess("Success", `Config "${config.msgFam}" has been deactivated.`);
      // Refetch configs to update the UI
      await fetchConfigs();
      // Trigger parent refresh if available
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deactivating config:', error);
      showError("Error", "Failed to deactivate config. Please try again.");
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
        <table className="min-w-full relative w-full">
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
                          {status}
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
              {userIsPublisher && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  PUBLISHING STATUS
                </th>
              )}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedConfigs.length === 0 ? (
              <tr>
                <td colSpan={userIsPublisher ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                  {showPendingApprovals 
                    ? (configs.length === 0 ? 'No configurations found for review' : 'No configurations match your search criteria')
                    : showApprovedConfigs
                    ? (configs.length === 0 ? 'No approved configurations found' : 'No configurations match your search criteria')
                    : (configs.length === 0 ? 'No configurations found' : 'No configurations match your search criteria')
                  }
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
                  {userIsPublisher && (
                    <td className="px-6 py-4">
                      {config.publishing_status === 'active' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          <span className="w-2 h-2 rounded-full bg-green-600 mr-2"></span>
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                          INACTIVE
                        </span>
                      )}
                    </td>
                  )}
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
                                  disabled={(() => {
                                    const normalizedStatus = normalizeStatus(config.status);
                                    return normalizedStatus === 'under_review' || normalizedStatus === 'approved';
                                  })()}
                                  className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                    (() => {
                                      const normalizedStatus = normalizeStatus(config.status);
                                      return normalizedStatus === 'under_review' || normalizedStatus === 'approved';
                                    })()
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
                              {userIsExporter && normalizeStatus(config.status) === 'approved' && (
                                <button
                                  onClick={() => {
                                    handleExportConfig(config);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Export
                                </button>
                              )}
                              {userIsPublisher && normalizeStatus(config.status) === 'exported' && (
                                <button
                                  onClick={() => {
                                    handlePublishConfig(config);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Rocket className="w-4 h-4 mr-2" />
                                  Publish
                                </button>
                              )}
                              {userIsPublisher && (
                                <>
                                  {config.publishing_status !== 'active' && (
                                    <button
                                      onClick={() => {
                                        handleActivateConfig(config);
                                        setOpenDropdown(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <Power className="w-4 h-4 mr-2" />
                                      Activate
                                    </button>
                                  )}
                                  {config.publishing_status === 'active' && (
                                    <button
                                      onClick={() => {
                                        handleDeactivateConfig(config);
                                        setOpenDropdown(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <PowerOff className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </button>
                                  )}
                                </>
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