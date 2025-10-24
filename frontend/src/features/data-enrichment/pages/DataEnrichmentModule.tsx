import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../../../shared/components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type { DataEnrichmentJobResponse, JobStatus, UpdatePullJobDto } from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isEditor, isApprover } from '../../../utils/roleUtils';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { getUserFriendlyErrorMessage } from '../../../shared/utils/errorUtils';

const DataEnrichmentModule: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  
  // User role detection
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;
  
  // Job management state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [recordStatusFilter, setRecordStatusFilter] = useState<'active' | 'in-active' | 'not-set' | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'push' | 'pull' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [jobDetailsEditMode, setJobDetailsEditMode] = useState(false);

  // Edit job state - keep for backwards compatibility but use JobDetailsModal instead
  const [editJob, setEditJob] = useState<DataEnrichmentJobResponse | null>(null);

  // Load jobs on component mount only (no pagination dependency since we fetch all)
  useEffect(() => {
    loadJobs();
  }, []); // Remove pagination dependencies since we fetch all jobs

  // Reset to first page when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  const loadJobs = async () => {
    console.log('=== LOAD JOBS DEBUG START ===');
    console.log('Time:', new Date().toISOString());
    console.log('loadJobs called - fetching ALL jobs for frontend filtering');
    console.log('  - API Base URL:', import.meta.env.VITE_API_BASE_URL || 'Not set');
    
    setJobsLoading(true);
    console.log('Loading state set to TRUE');
    
    try {
      let response;
      console.log('Starting API call...');

      // Fetch ALL jobs without pagination for frontend filtering
      console.log('Fetching ALL jobs from API...');
      console.log('API endpoint: /job/all');
      response = await dataEnrichmentApi.getAllJobs(); // Remove pagination parameters

      console.log('=== API RESPONSE RECEIVED ===');
      console.log('Response type:', typeof response);
      console.log('Response is null?:', response === null);
      console.log('Response is undefined?:', response === undefined);
      console.log('Full response object:', JSON.stringify(response, null, 2));
      
      if (response) {
        console.log('Response properties:');
        console.log('  - response.jobs:', response.jobs);
        console.log('  - response.jobs type:', typeof response.jobs);
        console.log('  - response.jobs is Array?:', Array.isArray(response.jobs));
        console.log('  - response.jobs length:', response.jobs?.length || 'N/A');
        console.log('  - response.total:', response.total);
        console.log('  - response.page:', response.page);
        console.log('  - response.limit:', response.limit);
        console.log('  - response.totalPages:', response.totalPages);
        
        if (response.jobs && response.jobs.length > 0) {
          console.log('First job sample:', JSON.stringify(response.jobs[0], null, 2));
        }
      }

      console.log('=== SETTING STATE ===');
      const jobsArray = response?.jobs || [];
      
      console.log('Setting jobs to state:', jobsArray.length, 'jobs (ALL jobs for frontend filtering)');
      
      // TEMPORARY: Add mock data if API returns empty
      if (jobsArray.length === 0) {
        console.warn('⚠️ API returned empty array. Check if backend has any jobs in database.');
        console.warn('💡 TIP: Create a job using "Define New Endpoint" button');
        console.warn('💡 TIP: Or check backend logs to see if the API endpoint is working');
      }
      
      // Sort jobs by created_at descending (newest first)
      const sortedJobs = jobsArray.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      setJobs(sortedJobs);
      // Note: totalItems will be calculated from filtered results in pagination logic

      console.log('=== STATE SET COMPLETE ===');
      console.log('Jobs array now contains:', jobsArray.length, 'items (all jobs)');

      console.log('✅ Jobs loaded successfully for frontend filtering and pagination');
    } catch (error) {
      console.error('=== ERROR LOADING JOBS ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full error object:', error);
      
      // Set empty state on error
      console.log('Setting empty state due to error');
      setJobs([]);

      // Show user-friendly error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('❌ Cannot connect to backend service. Check if backend is running.');
        showError('Cannot connect to the data enrichment service. Please ensure the backend is running.');
      } else {
        const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'load');
        showError(userFriendlyMessage);
      }
    } finally {
      setJobsLoading(false);
      console.log('Loading state set to FALSE');
      console.log('=== LOAD JOBS COMPLETE ===\n');
    }
  };

  const handleCreateJob = async (jobResponse: any) => {
    try {
      console.log('Job created successfully:', jobResponse);
      // The DataEnrichmentFormModal already shows its own success message
      // We just need to refresh the jobs list
      await loadJobs();
      
      // Show success message
      const jobName = jobResponse?.endpoint_name || 'New endpoint';
      showSuccess(`${jobName} has been successfully deployed and is now available!`);
    } catch (error) {
      console.error('Failed to handle job creation:', error);
      showError('Failed to handle job creation');
    }
  };

  const handleViewJobDetails = useCallback(async (jobId: string) => {
    console.log('=== VIEW JOB DETAILS DEBUG ===');
    console.log('handleViewJobDetails called with jobId:', jobId);
    console.log('User is approver:', userIsApprover);
    console.log('User is editor:', userIsEditor);
    
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      console.log('Modal state set - showJobDetails:', true, 'loading:', true);
      
      // Find the job in the current list to determine its type
      const job = jobs.find(j => j.id === jobId);
      // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      console.log('Job found in list:', job);
      console.log('Job type from list:', job?.type);
      console.log('Job type uppercase for API:', jobType);
      
      // Fetch job details from the API
      console.log('Calling dataEnrichmentApi.getJob...');
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
      console.log('Job details received:', jobDetails);
      setSelectedJob(jobDetails);
      console.log('Selected job set in state');
    } catch (error) {
      console.error('Failed to load job details:', error);
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
      console.log('Loading state set to false');
      console.log('=== VIEW JOB DETAILS DEBUG END ===');
    }
  }, [jobs, showError]); // Removed userIsApprover and userIsEditor from deps - they're just for logging

  const handleSaveJobChanges = async (updatedJob: Partial<DataEnrichmentJobResponse>) => {
    if (!selectedJob) return;
    
    try {
      console.log('=== SAVE JOB CHANGES DEBUG ===');
      console.log('Original job:', selectedJob);
      console.log('Updated job data:', updatedJob);
      
      // Determine job type for API call (use updated type if changed, otherwise original)
      const jobType = (updatedJob.type || selectedJob.type)?.toLowerCase() as 'pull' | 'push';
      console.log('Final job type for API:', jobType);
      
      // Check if job type changed
      const typeChanged = updatedJob.type && updatedJob.type !== selectedJob.type;
      console.log('Job type changed?', typeChanged, 'from', selectedJob.type, 'to', updatedJob.type);
      
      if (typeChanged) {
        console.warn('⚠️ Job type change detected. This may require creating a new job instead of updating.');
        // For now, we'll prevent type changes since backend might not support it
        showError('Changing job type is not supported. Please create a new job instead.');
        return;
      }
      
      // Use the proper update API methods instead of create with id
      let response;
      if (jobType === 'push') {
        const pushData: any = {
          endpoint_name: updatedJob.endpoint_name || selectedJob.endpoint_name || '',
          description: updatedJob.description || selectedJob.description,
          version: updatedJob.version || selectedJob.version || 'v1',
          path: updatedJob.path || selectedJob.path || '',
          table_name: updatedJob.table_name || selectedJob.table_name || '',
          mode: (updatedJob.mode || selectedJob.mode || 'append') as 'append' | 'replace',
        };
        
        // Include schedule_id if it exists (backend may require it for push jobs)
        if (selectedJob.schedule_id) {
          pushData.schedule_id = selectedJob.schedule_id;
        }
        
        console.log('Push data to send:', pushData);
        response = await dataEnrichmentApi.updatePushJob(selectedJob.id, pushData);
      } else {
        const pullData = {
          endpoint_name: updatedJob.endpoint_name || selectedJob.endpoint_name || '',
          description: updatedJob.description || selectedJob.description || '',
          version: updatedJob.version || selectedJob.version || 'v1',
          source_type: (updatedJob.source_type || selectedJob.source_type || 'HTTP') as 'HTTP' | 'SFTP',
          table_name: updatedJob.table_name || selectedJob.table_name || '',
          mode: (updatedJob.mode || selectedJob.mode || 'append') as 'append' | 'replace',
          connection: updatedJob.connection || selectedJob.connection || { url: '', headers: {} },
          file: updatedJob.file || selectedJob.file,
          schedule_id: updatedJob.schedule_id || selectedJob.schedule_id || '',
        } as UpdatePullJobDto;
        
        console.log('Pull data to send:', pullData);
        response = await dataEnrichmentApi.updatePullJob(selectedJob.id, pullData);
      }
      
      console.log('Job update response:', response);
      showSuccess('Job updated successfully!');
      
      // Refresh the jobs list
      await loadJobs();
      
    } catch (error) {
      console.error('=== SAVE JOB ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Full error object:', error);

      // Show user-friendly error message
      const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'save');
      showError(userFriendlyMessage);

      throw error; // Re-throw to let modal handle the error state
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
    setJobDetailsEditMode(false);
  };

  const handleEditJob = useCallback(async (job: DataEnrichmentJobResponse) => {
    console.log('handleEditJob called with:', job);
    console.log('Job type:', job.type);
    console.log('Job ID:', job.id);
    
    try {
      setJobDetailsLoading(true);
      setJobDetailsEditMode(true);
      setShowJobDetails(true);
      
      // Find the job in the current list to determine its type
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      console.log('Job type uppercase for API:', jobType);
      
      // Fetch job details from the API (same as view, but in edit mode)
      console.log('Calling dataEnrichmentApi.getJob for edit...');
      const jobDetails = await dataEnrichmentApi.getJob(job.id, jobType);
      console.log('Job details received for edit:', jobDetails);
      setSelectedJob(jobDetails);
      console.log('Modal should now open in edit mode');
    } catch (error) {
      console.error('Failed to load job details for edit:', error);
      const userFriendlyMessage = getUserFriendlyErrorMessage(error, 'load');
      showError(userFriendlyMessage);
    } finally {
      setJobDetailsLoading(false);
    }
  }, [showError]);

  const handleCloseEditJob = () => {
    setEditJob(null);
    setShowJobForm(false);
  };

  // Calculate filtered jobs based on all applied filters
  const filteredJobs = useMemo(() => {
    console.log('=== FRONTEND FILTERING DEBUG ===');
    console.log('Total jobs:', jobs.length);
    console.log('Applied filters:', {
      statusFilter,
      recordStatusFilter,
      dateFilter,
      typeFilter,
      searchQuery: searchQuery.trim()
    });
    
    let filtered = jobs;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(job => 
        job.endpoint_name?.toLowerCase().includes(query) ||
        job.table_name?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.type?.toLowerCase().includes(query)
      );
      console.log('After search filter:', filtered.length);
    }

    // Status filter (AND operation)
    if (statusFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(job => {
        const jobStatus = job.status || 'pending'; // Default to pending if no status
        const matches = jobStatus === statusFilter;
        console.log(`Job ${job.id}: status="${jobStatus}", filter="${statusFilter}", matches=${matches}`);
        return matches;
      });
      console.log(`After status filter (${statusFilter}): ${beforeCount} → ${filtered.length}`);
    }

    // Record status filter (AND operation)
    if (recordStatusFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(job => {
        if (recordStatusFilter === 'not-set') {
          return !job.record_status;
        }
        return job.record_status === recordStatusFilter;
      });
      console.log(`After record status filter (${recordStatusFilter}): ${beforeCount} → ${filtered.length}`);
    }

    // Date filter (AND operation)
    if (dateFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(job => {
        if (!job.created_at) return false;
        const jobDate = new Date(job.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return jobDate >= today;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return jobDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return jobDate >= monthAgo;
          default:
            return true;
        }
      });
      console.log(`After date filter (${dateFilter}): ${beforeCount} → ${filtered.length}`);
    }

    // Type filter (AND operation)
    if (typeFilter !== 'ALL') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(job => {
        const rawJobType = job.type?.toLowerCase();
        const matches = rawJobType === typeFilter;
        console.log(`Job ${job.id}: type="${rawJobType}", filter="${typeFilter}", matches=${matches}`);
        return matches;
      });
      console.log(`After type filter (${typeFilter}): ${beforeCount} → ${filtered.length}`);
    }

    console.log('Final filtered count:', filtered.length);
    console.log('=== END FRONTEND FILTERING DEBUG ===');
    return filtered;
  }, [jobs, searchQuery, statusFilter, recordStatusFilter, dateFilter, typeFilter]);

  // Calculate pagination based on filtered results
  const totalItems = filteredJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get paginated subset of filtered jobs
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  console.log('=== PAGINATION DEBUG ===');
  console.log('Filtered jobs:', filteredJobs.length);
  console.log('Total pages:', totalPages);
  console.log('Current page:', currentPage);
  console.log('Showing jobs:', startIndex, 'to', endIndex);
  console.log('Paginated jobs count:', paginatedJobs.length);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Debug modal props
  console.log('Modal render check:', { 
    showJobForm, 
    editJob, 
    editMode: !!editJob, 
    jobId: editJob?.id, 
    jobType: editJob?.type?.toLowerCase() 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment Module" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Create Button */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {userIsEditor && (
            <Button 
              variant="primary" 
              icon={<Plus size={16} />} 
              onClick={() => setShowJobForm(true)}
            >
              New Data Enrichment Job
            </Button>
          )}
        </div>

        {/* Approver Section - Only for Approvers */}
        {userIsApprover && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Approver Dashboard</h3>
                  <p className="text-sm text-blue-700">Review and approve pending data enrichment jobs</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  {filteredJobs.filter(job => job.status === 'pending').length} pending approvals
                </span>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('pending');
                    setCurrentPage(1);
                  }}
                >
                  View Pending Jobs
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Table with Total Count */}
        <div className="flex items-center justify-end mb-4">
          
        </div>
        
        {/* DEBUG: Log handlers before passing to JobList */}
        {(() => {
          console.log('=== DataEnrichmentModule RENDER DEBUG ===');
          console.log('About to render JobList component');
          console.log('User role - Editor:', userIsEditor, 'Approver:', userIsApprover);
          console.log('Handler values:');
          console.log('  - handleViewJobDetails:', typeof handleViewJobDetails, handleViewJobDetails);
          console.log('  - handleEditJob:', typeof handleEditJob, handleEditJob);
          console.log('  - loadJobs:', typeof loadJobs, loadJobs);
          console.log('Props being passed to JobList:');
          console.log('  - onViewLogs:', typeof handleViewJobDetails);
          console.log('  - onEdit:', typeof handleEditJob);
          console.log('  - onRefresh:', typeof loadJobs);
          console.log('=== END RENDER DEBUG ===');
          return null;
        })()}
        
        <JobList
          jobs={paginatedJobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
          onEdit={handleEditJob}
          onRefresh={loadJobs}
          statusFilter={statusFilter}
          onStatusFilterChange={(newStatus) => {
            setStatusFilter(newStatus);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
          searchQuery={searchQuery}
          recordStatusFilter={recordStatusFilter}
          onRecordStatusFilterChange={(newStatus) => {
            setRecordStatusFilter(newStatus);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
          dateFilter={dateFilter}
          onDateFilterChange={(newPeriod) => {
            setDateFilter(newPeriod);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
          typeFilter={typeFilter}
          onTypeFilterChange={(newType) => {
            setTypeFilter(newType);
            setCurrentPage(1); // Reset to first page when filter changes
          }}
        />
        
        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white rounded-b-md">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
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

        {/* Modal for creating new jobs */}
        {showJobForm && (
          <DataEnrichmentFormModal
            isOpen={showJobForm}
            onClose={editJob ? handleCloseEditJob : () => setShowJobForm(false)}
            onSave={handleCreateJob}
            editMode={!!editJob}
            jobId={editJob?.id}
            jobType={editJob?.type?.toLowerCase() as 'pull' | 'push' | undefined}
          />
        )}

        {/* Modal for viewing job details */}
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={jobDetailsEditMode}
          onSave={handleSaveJobChanges}
        />
      </div>
    </div>
  );
};

export default DataEnrichmentModule;