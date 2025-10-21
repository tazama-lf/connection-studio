import React, { useState, useEffect, useMemo } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../../../shared/components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type { DataEnrichmentJobResponse, JobStatus } from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';

const DataEnrichmentModule: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
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
      
      setJobs(jobsArray);
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
        showError('Cannot connect to backend service. Please ensure backend is running on http://localhost:3000');
      } else {
        showError(`Failed to load jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const handleViewJobDetails = async (jobId: string) => {
    console.log('handleViewJobDetails called with jobId:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      
      // Find the job in the current list to determine its type
      const job = jobs.find(j => j.id === jobId);
      // Backend expects lowercase 'push' or 'pull' matching ConfigType enum
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      console.log('Job found in list:', job);
      console.log('Job type from list:', job?.type);
      console.log('Job type uppercase for API:', jobType);
      
      // Fetch job details from the API
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
      console.log('Job details received:', jobDetails);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Failed to load job details:', error);
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
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
          <Button 
            variant="primary" 
            icon={<Plus size={16} />} 
            onClick={() => setShowJobForm(true)}
          >
            Define New Endpoint
          </Button>
        </div>

        {/* Jobs Table with Total Count */}
        <div className="flex items-center justify-end mb-4">
          
        </div>
        
        <JobList
          jobs={paginatedJobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
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
            onClose={() => setShowJobForm(false)}
            onSave={handleCreateJob}
          />
        )}

        {/* Modal for viewing job details */}
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
        />
      </div>
    </div>
  );
};

export default DataEnrichmentModule;