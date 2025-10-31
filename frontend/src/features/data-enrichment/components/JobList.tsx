import React, { useState } from 'react';
import { Eye, MoreVertical, ChevronDown, FilterIcon, Edit } from 'lucide-react';
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
  recordStatusFilter?: 'active' | 'in-active' | 'not-set' | 'ALL';
  onRecordStatusFilterChange?: (status: 'active' | 'in-active' | 'not-set' | 'ALL') => void;
  dateFilter?: 'today' | 'week' | 'month' | 'ALL';
  onDateFilterChange?: (period: 'today' | 'week' | 'month' | 'ALL') => void;
  typeFilter?: 'push' | 'pull' | 'ALL';
  onTypeFilterChange?: (type: 'push' | 'pull' | 'ALL') => void;
}

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <span className={statusColor}>
      {statusLabel}
    </span>
  );
};

const ActivationBadge: React.FC<{ recordStatus: 'active' | 'in-active' | null | undefined }> = ({ recordStatus }) => {
  const isActive = recordStatus === 'active';
  
  if (!recordStatus) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
        <span className="w-2 h-2 rounded-full mr-2 bg-gray-400"></span>
        NOT SET
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full ${
      isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
    }`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${
        isActive ? 'bg-green-500' : 'bg-gray-500'
      }`}></span>
      {isActive ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
};

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
    recordStatusFilter = 'ALL',
    onRecordStatusFilterChange,
    dateFilter = 'ALL',
    onDateFilterChange,
    typeFilter = 'ALL',
    onTypeFilterChange,
  } = props;
  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [recordStatusDropdownOpen, setRecordStatusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on dropdown buttons or dropdown content
      if (target.closest('.filter-dropdown') || target.closest('.dropdown-menu') || target.closest('.actions-dropdown')) {
        return;
      }
      
      setStatusDropdownOpen(false);
      setRecordStatusDropdownOpen(false);
      setDateDropdownOpen(false);
      setTypeDropdownOpen(false);
      setDropdownOpen(null);
    };

    if (statusDropdownOpen || recordStatusDropdownOpen || dateDropdownOpen || dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdownOpen, recordStatusDropdownOpen, dateDropdownOpen, dropdownOpen]);

  // Jobs are already filtered and paginated by parent component
  console.log('Jobs received (already filtered & paginated):', jobs.length);

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
      (recordStatusFilter && recordStatusFilter !== 'ALL') ||
      (dateFilter && dateFilter !== 'ALL') ||
      (typeFilter && typeFilter !== 'ALL') ||
      (searchQuery && searchQuery.trim() !== '');
    
    if (hasActiveFilters) {
      // Show "no results match filters" message with button to clear filters
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Match Your Filters</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or clear all filters to see all jobs
            </p>
            <Button 
              onClick={() => {
                // Clear all filters
                onStatusFilterChange?.('ALL');
                onRecordStatusFilterChange?.('ALL');
                onDateFilterChange?.('ALL');
                onTypeFilterChange?.('ALL');
                onRefresh?.();
              }} 
              variant="primary"
            >
              Refresh
            </Button>
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
          <p className="text-gray-500 mb-2">
            Get started by creating your first data enrichment endpoint
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Click the "Define New Endpoint" button above to create a Pull or Push job
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

  if (jobs.length === 0 && searchQuery.trim()) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No endpoints match your search</h3>
          <p className="text-gray-500 mb-6">
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
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ENDPOINT PATH
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>TYPE</span>
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                  <span>STATUS</span>
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>ACTIVATION</span>
                  <div className="relative filter-dropdown">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecordStatusDropdownOpen(!recordStatusDropdownOpen);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Filter by activation status"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${recordStatusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {recordStatusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-[999] border border-gray-200 dropdown-menu">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordStatusFilterChange?.('ALL');
                              setRecordStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${recordStatusFilter === 'ALL' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            All Activation Status
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordStatusFilterChange?.('active');
                              setRecordStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${recordStatusFilter === 'active' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Active
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordStatusFilterChange?.('in-active');
                              setRecordStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${recordStatusFilter === 'in-active' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Inactive
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRecordStatusFilterChange?.('not-set');
                              setRecordStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${recordStatusFilter === 'not-set' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Not Set
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>CREATED TIME</span>
                  <div className="relative filter-dropdown">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateDropdownOpen(!dateDropdownOpen);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Filter by date"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dateDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-[999] border border-gray-200 dropdown-menu">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateFilterChange?.('ALL');
                              setDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${dateFilter === 'ALL' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            All Time
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateFilterChange?.('today');
                              setDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${dateFilter === 'today' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Today
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateFilterChange?.('week');
                              setDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${dateFilter === 'week' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            This Week
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateFilterChange?.('month');
                              setDateDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${dateFilter === 'month' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            This Month
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {jobs.map((job, index) => {
              // Determine dropdown direction: first row opens down, last row opens up
              const isFirstRow = index === 0;
              const isLastRow = index === jobs.length - 1;
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
                      {jobType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={displayStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <ActivationBadge recordStatus={job.record_status} />
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
                  <td className="px-6 py-4">
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
                            {/* View Details - Separate logic for Editors vs Approvers vs Exporters */}
                            {userIsEditor ? (
                              // Editors use the onViewLogs handler
                              onViewLogs && (
                                <button
                                  onClick={() => {
                                    onViewLogs(job.id);
                                    setDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </button>
                              )
                            ) : userIsApprover ? (
                              // Approvers have their own direct view handler
                              <button
                                onClick={async () => {
                                  try {
                                    console.log('Approver viewing job:', job.id);
                                    // Call the handler if it exists, otherwise use fallback
                                    if (onViewLogs) {
                                      onViewLogs(job.id);
                                    } else {
                                      // Fallback: Call API directly for approvers
                                      console.log('Using fallback view for approver');
                                      alert('Opening job details...');
                                      // You can add direct API call here if needed
                                    }
                                    setDropdownOpen(null);
                                  } catch (error) {
                                    console.error('Error viewing job:', error);
                                  }
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </button>
                            ) : userIsExporter ? (
                              // Exporters can view approved/exported jobs
                              (displayStatus === 'approved' || displayStatus === 'exported') && (
                                <button
                                  onClick={async () => {
                                    try {
                                      console.log('Exporter viewing job:', job.id);
                                      // Call the handler if it exists, otherwise use fallback
                                      if (onViewLogs) {
                                        onViewLogs(job.id);
                                      } else {
                                        // Fallback: This should not happen now that exporters have proper handler
                                        console.error('No onViewLogs handler available for exporter');
                                        alert('Unable to view job details. Please refresh the page and try again.');
                                      }
                                      setDropdownOpen(null);
                                    } catch (error) {
                                      console.error('Error viewing job:', error);
                                    }
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </button>
                              )
                            ) : null}

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
