import React, { useState, useEffect } from 'react';
import { EditIcon, EyeIcon, XIcon, MoreVerticalIcon, ChevronDownIcon, ChevronUpIcon, ChevronDownIcon as ChevronDownIconAlias, PlayIcon, PauseIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../features/data-enrichment/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isEditor, isExporter, isApprover, isPublisher } from '../../../utils/roleUtils';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { JobRejectionDialog } from '../../../shared/components/JobRejectionDialog';

interface CronJobListProps {
  searchTerm?: string;
}

type SortField = 'name' | 'cron' | 'iterations' | 'start_date' | 'end_date' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const CronJobList: React.FC<CronJobListProps> = ({ searchTerm = '' }) => {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    cron: '',
    iterations: 1,
    start_date: '',
    end_date: '',
  });
  const [isEditJobSaved, setIsEditJobSaved] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Status filter state - now a single string for simple selection
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);

  // Action state for debouncing
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Helper function for pluralization
  const getIterationText = (count: number) => {
    return count === 1 ? '1 iteration' : `${count} iterations`;
  };

  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  const userIsPublisher = user?.claims ? isPublisher(user.claims) : false;

  // Load schedules on component mount
  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const schedulesData = await dataEnrichmentApi.getAllSchedules(1, 1000);
      setSchedules(schedulesData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load schedules. Please try again.');
      showError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  // Status update handlers
  const handleSuspendSchedule = async (schedule: ScheduleResponse) => {
    try {
      setUpdatingStatus(schedule.id);
      // Use 'suspended' status
      await dataEnrichmentApi.updateScheduleStatus(schedule.id, 'suspended');
      showSuccess(`Schedule ${schedule.name} suspended successfully`);
      loadSchedules();
    } catch (error) {
      console.error('Failed to suspend schedule:', error);
      showError('Failed to suspend schedule');
    } finally {
      setUpdatingStatus(null);
      setOpenDropdown(null);
    }
  };

  const handleResumeSchedule = async (schedule: ScheduleResponse) => {
    try {
      setUpdatingStatus(schedule.id);
      await dataEnrichmentApi.updateScheduleStatus(schedule.id, 'in-progress');
      showSuccess(`Schedule ${schedule.name} resumed successfully`);
      loadSchedules();
    } catch (error) {
      console.error('Failed to resume schedule:', error);
      showError('Failed to resume schedule');
    } finally {
      setUpdatingStatus(null);
      setOpenDropdown(null);
    }
  };

  // Handle rejection with reason
  const handleRejectionConfirm = async (reason: string) => {
    if (selectedSchedule) {
      try {
        setIsActionInProgress(true);
        // TODO: When backend supports rejection reasons, pass the reason parameter
        await dataEnrichmentApi.updateScheduleStatus(selectedSchedule.id, 'rejected');
        console.log('Cron job rejected with reason:', reason); // For now, just log the reason
        showSuccess('Cron job rejected successfully');
        setViewModalOpen(false);
        await loadSchedules();
      } catch (error) {
        console.error('Failed to reject cron job:', error);
        showError('Failed to reject cron job');
      } finally {
        setIsActionInProgress(false);
      }
    }
  };

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle status filter selection - simplified to single selection
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    setStatusFilterOpen(false); // Close dropdown after selection
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Filter schedules based on search term, status filter, and user role
  const filteredSchedules = schedules.filter(schedule => {
    // Search term filter
    const matchesSearch = schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.cron.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter - check if 'all' is selected or if schedule status matches selected status (case-insensitive)
    const matchesStatus = selectedStatus === 'all' || schedule.status?.toLowerCase() === selectedStatus;
    
    // Role-based filtering: exporters can only see approved, exported and deployed schedules (case-insensitive)
    let matchesRole = true;
    if (userIsExporter) {
      const allowedStatuses = ['approved', 'exported', 'deployed'];
      matchesRole = allowedStatuses.includes(schedule.status?.toLowerCase() || '');
    }
    
    // Role-based filtering: publishers can only see exported and deployed schedules (case-insensitive)
    if (userIsPublisher) {
      const allowedStatuses = ['exported', 'deployed'];
      matchesRole = allowedStatuses.includes(schedule.status?.toLowerCase() || '');
    }
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Transform exported status to deployed for publishers
  const statusTransformedSchedules = userIsPublisher 
    ? filteredSchedules.map(schedule => ({
        ...schedule,
        status: schedule.status === 'exported' ? 'deployed' : schedule.status
      }))
    : filteredSchedules;

  // Sort filtered schedules
  const sortedSchedules = statusTransformedSchedules.sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special cases for sorting
    if (sortField === 'created_at') {
      aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
      bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else if (sortField === 'start_date') {
      aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
      bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
    } else if (sortField === 'end_date') {
      aValue = a.end_date ? new Date(a.end_date).getTime() : 0;
      bValue = b.end_date ? new Date(b.end_date).getTime() : 0;
    } else if (sortField === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
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

  // Calculate pagination for filtered results
  const totalFilteredItems = sortedSchedules.length;
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchedules = sortedSchedules.slice(startIndex, endIndex);

  // Reset to first page if current page is beyond available pages
  useEffect(() => {
    if (currentPage > Math.ceil(totalFilteredItems / itemsPerPage) && totalFilteredItems > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredItems, currentPage, itemsPerPage]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on dropdown buttons or dropdown content
      if (target.closest('.actions-dropdown') || target.closest('.status-filter-dropdown')) {
        return;
      }
      
      setOpenDropdown(null);
      setStatusFilterOpen(false);
    };

    if (openDropdown || statusFilterOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown, statusFilterOpen]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Handle view schedule
  const handleView = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setViewModalOpen(true);
  };

  // Handle edit schedule
  const handleEdit = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name,
      cron: schedule.cron,
      iterations: schedule.iterations,
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
    });
    setIsEditJobSaved(false); // Reset the saved state when opening edit modal
    setEditModalOpen(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedSchedule) return;

    try {
      setIsActionInProgress(true);
      
      // Clean up the form data: remove empty strings for optional date fields
      const cleanedForm = {
        ...editForm,
        end_date: editForm.end_date && editForm.end_date.trim() !== '' 
          ? editForm.end_date 
          : undefined
      };
      
      await dataEnrichmentApi.updateSchedule(selectedSchedule.id, cleanedForm);
      
      showSuccess('Schedule updated successfully');
      setIsEditJobSaved(true);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      showError('Failed to update schedule');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle send for approval
  const handleSendForApproval = async () => {
    if (!selectedSchedule) return;

    try {
      setIsActionInProgress(true);
      await dataEnrichmentApi.updateScheduleStatus(selectedSchedule.id, 'under-review');
      showSuccess('Cron job submitted for approval');
      setEditModalOpen(false);
      loadSchedules();
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showError('Failed to submit cron job for approval');
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Format date for display (date only, no time)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return <div data-id="element-116">
      <div className="shadow overflow-hidden rounded-lg border border-gray-200 min-h-[400px]" data-id="element-120">
        <table className="min-w-full" data-id="element-121">
          <thead className="bg-gray-50" data-id="element-122">
            <tr data-id="element-123">
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
                data-id="element-124"
              >
                <div className="flex items-center space-x-1">
                  <span>Schedule Name</span>
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cron')}
                data-id="element-125"
              >
                <div className="flex items-center space-x-1">
                  <span>CRON Expression</span>
                  {sortField === 'cron' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('iterations')}
                data-id="element-128"
              >
                <div className="flex items-center space-x-1">
                  <span>Iterations</span>
                  {sortField === 'iterations' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Start Date</span>
                  {sortField === 'start_date' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                onClick={() => handleSort('end_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>End Date</span>
                  {sortField === 'end_date' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>Created At</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
            
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider relative"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent sorting when clicking the filter button
                      setStatusFilterOpen(!statusFilterOpen);
                    }}
                    className="ml-1 p-1 hover:bg-gray-200 rounded"
                  >
                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {/* Status Filter Dropdown */}
                {statusFilterOpen && (
                  <div className="status-filter-dropdown absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleStatusFilterChange('all')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        All Statuses
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('in-progress')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'in-progress' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('under-review')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'under-review' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Under Review
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('approved')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'approved' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Approved
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('exported')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'exported' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Exported
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('deployed')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'deployed' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Deployed
                      </button>
                      <button
                        onClick={() => handleStatusFilterChange('suspended')}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          selectedStatus === 'suspended' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Suspended
                      </button>
                    </div>
                  </div>
                )}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" data-id="element-129">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading schedules...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : sortedSchedules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No schedules found
                </td>
              </tr>
            ) : (
              paginatedSchedules.map((schedule, index) => {
                  // Determine dropdown direction: first row opens down, last row opens up
                  const isFirstRow = index === 0;
                  const isLastRow = index === paginatedSchedules.length - 1;
                  const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
                  
                  return (
                  <tr key={schedule.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {schedule.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.cron}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getIterationText(schedule.iterations)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(schedule.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(schedule.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(schedule.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                        <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                        {getStatusLabel(schedule.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center items-center">
                        {/* Actions dropdown with three-dot menu */}
                        <div className="relative actions-dropdown">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === schedule.id ? null : schedule.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </button>
                          {openDropdown === schedule.id && (
                            <DropdownMenuWithAutoDirection 
                              forceDirection={forceDirection}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    handleView(schedule);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <EyeIcon className="w-4 h-4 mr-2" />
                                  View
                                </button>
                                {/* Edit - Only for Editors/Approvers and only for in-progress jobs (not suspended) */}
                                {(userIsEditor || userIsApprover) && schedule.status?.toLowerCase() !== 'suspended' && (
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      handleEdit(schedule);
                                    }}
                                    disabled={schedule.status?.toLowerCase() !== 'in-progress' || isActionInProgress}
                                    className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                      schedule.status !== 'in-progress'
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : isActionInProgress
                                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                                        : 'text-gray-700'
                                    }`}
                                    title={
                                      schedule.status !== 'in-progress'
                                        ? 'Can only edit jobs with in-progress status' 
                                        : isActionInProgress
                                        ? 'Action in progress...'
                                        : ''
                                    }
                                  >
                                    <EditIcon className="w-4 h-4 mr-2" />
                                    Edit
                                  </button>
                                )}
                                {/* Export - Only for approved and non-suspended items */}
                                {userIsExporter && schedule.status?.toLowerCase() === 'approved' && schedule.status?.toLowerCase() !== 'suspended' && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        setIsActionInProgress(true);
                                        setOpenDropdown(null);
                                        await dataEnrichmentApi.updateScheduleStatus(schedule.id, 'exported');
                                        showSuccess('Cron job exported successfully');
                                        await loadSchedules();
                                      } catch (error) {
                                        console.error('Failed to export cron job:', error);
                                        showError('Failed to export cron job');
                                      } finally {
                                        setIsActionInProgress(false);
                                      }
                                    }}
                                    disabled={isActionInProgress}
                                    className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                      isActionInProgress ? 'text-gray-400 cursor-not-allowed opacity-50' : 'text-gray-700'
                                    }`}
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export
                                  </button>
                                )}

                                {/* Suspend/Resume - Available to Editors and Approvers */}
                                {(userIsEditor || userIsApprover) && (
                                  <>
                                    {schedule.status?.toLowerCase() === 'suspended' ? (
                                      <button
                                        onClick={() => handleResumeSchedule(schedule)}
                                        disabled={updatingStatus === schedule.id}
                                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                          updatingStatus === schedule.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                        }`}
                                      >
                                        <PlayIcon className="w-4 h-4 mr-2" />
                                        {updatingStatus === schedule.id ? 'Resuming...' : 'Resume Schedule'}
                                      </button>
                                    ) : (
                                      schedule.status?.toLowerCase() === 'in-progress' && (
                                        <button
                                          onClick={() => handleSuspendSchedule(schedule)}
                                          disabled={updatingStatus === schedule.id}
                                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                            updatingStatus === schedule.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                          }`}
                                        >
                                          <PauseIcon className="w-4 h-4 mr-2" />
                                          {updatingStatus === schedule.id ? 'Suspending...' : 'Suspend Schedule'}
                                        </button>
                                      )
                                    )}
                                  </>
                                )}

                                {userIsPublisher && (
                                  <>
                                    {/* Publisher actions removed - activation functionality moved to publisher end */}
                                  </>
                                )}
                              </div>
                            </DropdownMenuWithAutoDirection>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFilteredItems > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredItems)} of {totalFilteredItems} results
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

    {/* View Modal */}
    {viewModalOpen && selectedSchedule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Enhanced blurred backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
          onClick={() => setViewModalOpen(false)}
        />
        
        {/* Modal Content */}
        <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">View Cron Job</h3>
            <button 
              onClick={() => setViewModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {selectedSchedule.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CRON Expression
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 font-mono">
                  {selectedSchedule.cron}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. of Iterations
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {selectedSchedule.iterations}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {formatDate(selectedSchedule.start_date)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {formatDate(selectedSchedule.end_date)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSchedule.status)}`}>
                    <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                    {getStatusLabel(selectedSchedule.status)}
                  </span>
                </div>
              </div>
              {selectedSchedule.next_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Run
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                    {formatDate(selectedSchedule.next_time)}
                  </div>
                </div>
              )}
            </div>
            
            {selectedSchedule.created_at && (
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created At
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                    {formatDate(selectedSchedule.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-between space-x-3">
            <button
              onClick={() => setViewModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <div className="flex space-x-3">
              {userIsExporter && selectedSchedule.status?.toLowerCase() === 'approved' && (
                <button
                  onClick={async () => {
                    try {
                      setIsActionInProgress(true);
                      await dataEnrichmentApi.updateScheduleStatus(selectedSchedule.id, 'exported');
                      showSuccess('Cron job exported successfully');
                      setViewModalOpen(false);
                      await loadSchedules();
                    } catch (error) {
                      console.error('Failed to export cron job:', error);
                      showError('Failed to export cron job');
                    } finally {
                      setIsActionInProgress(false);
                    }
                  }}
                  disabled={isActionInProgress}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionInProgress ? 'Exporting...' : 'Export'}
                </button>
              )}
              {(userIsEditor || userIsApprover) && selectedSchedule.status?.toLowerCase() === 'in-progress' && (
                <button
                  onClick={async () => {
                    try {
                      setIsActionInProgress(true);
                      await dataEnrichmentApi.updateScheduleStatus(selectedSchedule.id, 'under-review');
                      showSuccess('Cron job submitted for approval');
                      setViewModalOpen(false);
                      await loadSchedules();
                    } catch (error) {
                      console.error('Failed to submit for approval:', error);
                      showError('Failed to submit cron job for approval');
                    } finally {
                      setIsActionInProgress(false);
                    }
                  }}
                  disabled={isActionInProgress}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActionInProgress ? 'Submitting...' : 'Send for Approval'}
                </button>
              )}
              
              {/* Approve/Reject buttons for under-review status - Only for Approvers */}
              {userIsApprover && selectedSchedule.status?.toLowerCase() === 'under-review' && (
                <>
                  <button
                    onClick={() => setShowRejectionDialog(true)}
                    disabled={isActionInProgress}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionInProgress ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setIsActionInProgress(true);
                        await dataEnrichmentApi.updateScheduleStatus(selectedSchedule.id, 'approved');
                        showSuccess('Cron job approved successfully');
                        setViewModalOpen(false);
                        await loadSchedules();
                      } catch (error) {
                        console.error('Failed to approve cron job:', error);
                        showError('Failed to approve cron job');
                      } finally {
                        setIsActionInProgress(false);
                      }
                    }}
                    disabled={isActionInProgress}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActionInProgress ? 'Approving...' : 'Approve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    {editModalOpen && selectedSchedule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Enhanced blurred backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
          onClick={() => setEditModalOpen(false)}
        />
        
        {/* Modal Content */}
        <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Edit Cron Job</h3>
            <button 
              onClick={() => setEditModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter job name" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CRON Expression <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={editForm.cron}
                    onChange={(e) => setEditForm({ ...editForm, cron: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 45 * * * * *" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. of Iterations <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    value={editForm.iterations}
                    onChange={(e) => setEditForm({ ...editForm, iterations: parseInt(e.target.value) || 1 })}
                    min="1" 
                    step="1" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter number of iterations" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={editForm.start_date ? new Date(editForm.start_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input 
                    type="date" 
                    value={editForm.end_date ? new Date(editForm.end_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between space-x-3">
              <button 
                type="button" 
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isActionInProgress}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isActionInProgress 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isActionInProgress ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleSendForApproval}
                  disabled={!isEditJobSaved || isActionInProgress}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    !isEditJobSaved || isActionInProgress
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                  title={!isEditJobSaved ? 'Please save the changes first' : ''}
                >
                  {isActionInProgress ? 'Submitting...' : 'Send for Approval'}
                </button>
              </div>
            </div>
        </div>
      </div>
    )}

    {/* Rejection Dialog */}
    <JobRejectionDialog
      isOpen={showRejectionDialog}
      onClose={() => setShowRejectionDialog(false)}
      onConfirm={handleRejectionConfirm}
      jobName={selectedSchedule?.name || 'Unknown Schedule'}
      jobType="Cron Job"
    />
    </div>;
};


export default CronJobList;
