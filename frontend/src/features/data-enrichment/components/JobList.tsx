import React, { useState } from 'react';
import { Eye, MoreVertical, ChevronDown, FilterIcon, Edit, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { Button } from '../../../shared/components/Button';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isEditor, isApprover, isExporter } from '../../../utils/roleUtils';
import { DropdownMenuWithAutoDirection } from './DropdownMenuWithAutoDirection';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface JobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewLogs?: (jobId: string) => void;
  onEdit?: (job: DataEnrichmentJobResponse) => void;
  onRefresh?: () => void;
  statusFilter?: JobStatus | 'ALL';
  onStatusFilterChange?: (status: JobStatus | 'ALL') => void;
  searchQuery?: string;
  typeFilter?: 'push' | 'pull' | 'ALL';
  onTypeFilterChange?: (type: 'push' | 'pull' | 'ALL') => void;
}

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
      {statusLabel}
    </span>
  );
};

type SortField = 'endpoint_path' | 'type' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const JobList: React.FC<JobListProps> = (props) => {
  // IMMEDIATE LOGGING - Log props as soon as component receives them
  console.log('=== JobList COMPONENT PROPS RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('All props:', Object.keys(props));
  console.log('Handler props received:');
  console.log('  - onViewLogs type:', typeof props.onViewLogs);
  console.log('  - onViewLogs value:', props.onViewLogs);
  console.log('  - onEdit type:', typeof props.onEdit);
  console.log('  - onEdit value:', props.onEdit);
  console.log('  - onRefresh type:', typeof props.onRefresh);
  console.log('  - onRefresh value:', props.onRefresh);
  console.log('Jobs count:', props.jobs?.length || 0);
  console.log('=== END PROPS RECEIVED ===');
  
  // Destructure after logging
  const {
    jobs,
    isLoading = false,
    onViewLogs,
    onEdit,
    onRefresh,
    statusFilter = 'ALL',
    onStatusFilterChange,
    searchQuery = '',
    typeFilter = 'ALL',
    onTypeFilterChange,
  } = props;
  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on dropdown buttons or dropdown content
      if (target.closest('.filter-dropdown') || target.closest('.dropdown-menu') || target.closest('.actions-dropdown')) {
        return;
      }
      
      setStatusDropdownOpen(false);
      setTypeDropdownOpen(false);
      setDropdownOpen(null);
    };

    if (statusDropdownOpen || dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdownOpen, dateDropdownOpen, dropdownOpen]);

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Jobs are already filtered and paginated by parent component
  console.log('Jobs received (already filtered & paginated):', jobs.length);

  // Sort jobs
  const sortedJobs = [...jobs].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Handle special cases for sorting
    if (sortField === 'created_at') {
      aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
      bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else if (sortField === 'endpoint_path') {
      // For endpoint path, use the computed path
      const getEndpointPathA = () => {
        if (a.type?.toLowerCase() === 'push') {
          return a.path || `/tenant-${a.endpoint_name?.substring(0, 6)}/${a.table_name || 'data'}`;
        } else {
          return `/tenant-${a.endpoint_name?.substring(0, 6) || '001'}/${a.table_name || a.endpoint_name}`;
        }
      };
      const getEndpointPathB = () => {
        if (b.type?.toLowerCase() === 'push') {
          return b.path || `/tenant-${b.endpoint_name?.substring(0, 6)}/${b.table_name || 'data'}`;
        } else {
          return `/tenant-${b.endpoint_name?.substring(0, 6) || '001'}/${b.table_name || b.endpoint_name}`;
        }
      };
      aValue = getEndpointPathA();
      bValue = getEndpointPathB();
    } else if (sortField === 'type') {
      aValue = a.type || a.config_type?.toLowerCase() || 'pull';
      bValue = b.type || b.config_type?.toLowerCase() || 'pull';
    } else if (sortField === 'status') {
      aValue = a.status || 'in-progress';
      bValue = b.status || 'in-progress';
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    console.log('🔄 Rendering LOADING state');
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading jobs...</span>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️ Rendering NO JOBS FOUND state');
    console.log('Reason: jobs =', jobs, '| jobs.length =', jobs?.length);
    
    // Check if any filters are active
    const hasActiveFilters = 
      (statusFilter && statusFilter !== 'ALL') ||
      (typeFilter && typeFilter !== 'ALL') ||
      (searchQuery && searchQuery.trim() !== '');
    
    if (hasActiveFilters) {
      // Show "no results match filters" message with button to clear filters
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            {/* <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div> */}
           
            {/* <Button 
              onClick={() => {
                // Clear all filters
                onStatusFilterChange?.('ALL');
                onTypeFilterChange?.('ALL');
                onRefresh?.();
              }} 
              variant="primary"
            >
              Refresh
            </Button> */}
          </div>
        </div>
      );
    }
    
    // Show "no jobs yet" message for empty system
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Enrichment Jobs Yet</h3>
         
          {onRefresh && (
            <Button onClick={onRefresh} variant="secondary">
              Refresh
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (jobs.length === 0 && searchQuery.trim()) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-2">No endpoints match your search</h3>
            <p className="text-sm text-gray-500 mb-6">
              Try adjusting your search terms or browse all endpoints.
            </p>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering JOBS TABLE with', jobs.length, 'jobs');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full relative">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('endpoint_path')}
              >
                <div className="flex items-center space-x-1">
                  <span>ENDPOINT PATH</span>
                  {sortField === 'endpoint_path' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center space-x-2">
                  <span>TYPE</span>
                  {sortField === 'type' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                  <div className="relative filter-dropdown">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTypeDropdownOpen(!typeDropdownOpen);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Filter by type"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {typeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-[999] border border-gray-200 dropdown-menu">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTypeFilterChange?.('ALL');
                              setTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${typeFilter === 'ALL' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            All Types
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTypeFilterChange?.('push');
                              setTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${typeFilter === 'push' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Push
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTypeFilterChange?.('pull');
                              setTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${typeFilter === 'pull' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Pull
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-2">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                  <span>STATUS</span>
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                  <div className="relative filter-dropdown">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('=== STATUS DROPDOWN TOGGLE CLICKED ===');
                        console.log('Current statusDropdownOpen:', statusDropdownOpen);
                        console.log('Will toggle to:', !statusDropdownOpen);
                        console.log('User roles:', { userIsEditor, userIsApprover, userIsExporter });
                        setStatusDropdownOpen(!statusDropdownOpen);
                        console.log('Dropdown toggle complete - new state:', !statusDropdownOpen);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Filter by status"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-[999] border border-gray-200 dropdown-menu">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('=== STATUS FILTER CLICKED ===');
                              console.log('Changing status filter to: ALL');
                              console.log('onStatusFilterChange function:', typeof onStatusFilterChange);
                              console.log('User roles:', { userIsEditor, userIsApprover, userIsExporter });
                              
                              if (onStatusFilterChange) {
                                onStatusFilterChange('ALL');
                                console.log('✅ Status filter changed to ALL');
                              } else {
                                console.error('❌ onStatusFilterChange not available');
                              }
                              
                              setStatusDropdownOpen(false);
                              console.log('Status filter change complete');
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'ALL' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            All Statuses
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('=== STATUS FILTER CLICKED ===');
                              console.log('Changing status filter to: pending');
                              console.log('onStatusFilterChange function:', typeof onStatusFilterChange);
                              console.log('User roles:', { userIsEditor, userIsApprover, userIsExporter });
                              
                              if (onStatusFilterChange) {
                                onStatusFilterChange('in-progress');
                                console.log('✅ Status filter changed to in-progress');
                              } else {
                                console.error('❌ onStatusFilterChange not available');
                              }
                              
                              setStatusDropdownOpen(false);
                              console.log('Status filter change complete');
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'in-progress' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusFilterChange?.('approved');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'approved' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Approved
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusFilterChange?.('in-progress');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'in-progress' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusFilterChange?.('rejected');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'rejected' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Rejected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-2">
                  <span>CREATED TIME</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedJobs.map((job, index) => {
              // Determine dropdown direction: first row opens down, last row opens up
              const isFirstRow = index === 0;
              const isLastRow = index === sortedJobs.length - 1;
              const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
              
              // Get job type - normalize to uppercase for API calls
              const rawJobType = job.type || job.config_type?.toLowerCase() || 'pull';
              const jobType: 'PULL' | 'PUSH' = rawJobType?.toLowerCase() === 'push' ? 'PUSH' : 'PULL';
              
              console.log(`Job ${job.id} type determination:`, {
                'job.type': job.type,
                'job.config_type': job.config_type,
                rawJobType,
                finalJobType: jobType,
                'rawJobType === push': rawJobType === 'push',
                'rawJobType?.toLowerCase() === push': rawJobType?.toLowerCase() === 'push'
              });
              
              // Build the endpoint path based on job type
              const getEndpointPath = () => {
                if (rawJobType === 'push') {
                  // For push jobs, use the path field if available
                  return job.path || `/tenant-${job.endpoint_name?.substring(0, 6)}/${job.table_name || 'data'}`;
                } else {
                  // For pull jobs, show a descriptive path
                  return `/tenant-${job.endpoint_name?.substring(0, 6) || '001'}/${job.table_name || job.endpoint_name}`;
                }
              };
              
              // Status updates should be available for all jobs (both PUSH and PULL)
              // Show status update buttons for all jobs, regardless of current status value
              const hasStatus = true; // Allow status updates for all jobs
              
              // For display: show 'in-progress' for jobs without explicit status
              const displayStatus: JobStatus = job.status || 'in-progress';
              
              // Debug logging for status update issues
              console.log(`Job ${job.id} status debug:`, {
                jobType: rawJobType,
                rawStatus: job.status,
                displayStatus,
                hasStatus,
                willShowStatusButtons: hasStatus
              });

              
              return (
                <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {getEndpointPath()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded ${
                      jobType === 'PUSH' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        jobType === 'PUSH' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}></span>
                      {jobType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={displayStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">
                        {job.created_at 
                          ? new Date(job.created_at).toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric', 
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                    {/* Actions Dropdown */}
                    <div className="relative actions-dropdown">
                      <button
                        onClick={() => {
                          console.log('=== THREE-DOT MENU CLICKED ===');
                          console.log('Job ID:', job.id);
                          console.log('Current dropdownOpen:', dropdownOpen);
                          console.log('Will set to:', dropdownOpen === job.id ? null : job.id);
                          console.log('User roles:', { userIsEditor, userIsApprover, userIsExporter });
                          setDropdownOpen(dropdownOpen === job.id ? null : job.id);
                        }}
                        className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === job.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title={`Roles: Editor=${userIsEditor}, Approver=${userIsApprover}, Exporter=${userIsExporter}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {dropdownOpen === job.id && (
                        <DropdownMenuWithAutoDirection forceDirection={forceDirection}>
                          <div className="py-1">
                            {/* View Details - Available to all roles that have view permissions */}
                            {((userIsEditor && onViewLogs) ||
                              (userIsApprover) ||
                              (userIsExporter && (displayStatus === 'approved' || displayStatus === 'exported'))) && (
                              <button
                                onClick={() => {
                                  if (onViewLogs) {
                                    onViewLogs(job.id);
                                  } else {
                                    // Fallback for approvers/exporters without handler
                                    console.log('Opening job details for user with roles:', { userIsEditor, userIsApprover, userIsExporter });
                                    alert('Opening job details...');
                                  }
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </button>
                            )}

                            {/* Edit - Only for Editors and only for in-progress jobs */}
                            {userIsEditor && onEdit && displayStatus === 'in-progress' && (
                              <button
                                onClick={() => {
                                  onEdit(job);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </button>
                            )}
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
};export default JobList;
