import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../../../shared/components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type { DataEnrichmentJobResponse } from '../types';
import { useToast } from '../../../shared/providers/ToastProvider';

const DataEnrichmentModule: React.FC = () => {
  const { showSuccess, showError } = useToast();
  
  // Job management state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  
  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // Load jobs on component mount and when pagination changes
  useEffect(() => {
    loadJobs();
  }, [currentPage, itemsPerPage]);

  const loadJobs = async () => {
    console.log('=== LOAD JOBS DEBUG ===');
    console.log('loadJobs called, currentPage:', currentPage, 'itemsPerPage:', itemsPerPage);
    setJobsLoading(true);
    try {
      // Fetch jobs from the data enrichment service
      const response = await dataEnrichmentApi.getAllJobs(currentPage, itemsPerPage);
      console.log('=== API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Jobs array length:', response.jobs?.length || 0);
      console.log('Total items from API:', response.total);
      console.log('Current page from API:', response.page);
      console.log('Limit from API:', response.limit);
      console.log('Total pages from API:', response.totalPages);
      
      setJobs(response.jobs || []);
      setTotalItems(response.total || 0);
      
      console.log('=== STATE UPDATE ===');
      console.log('Jobs set to state:', response.jobs?.length || 0);
      console.log('Total items set to state:', response.total || 0);
      
      // Calculate pagination values
      const calculatedTotalPages = Math.ceil((response.total || 0) / itemsPerPage);
      console.log('Calculated total pages:', calculatedTotalPages);
      console.log('Current pagination state - currentPage:', currentPage, 'itemsPerPage:', itemsPerPage);
    } catch (error) {
      console.error('=== ERROR LOADING JOBS ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      setJobs([]); // Ensure jobs is always an array even on error
      setTotalItems(0);
      
      // Show user-friendly error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Cannot connect to data enrichment service. Using empty job list.');
      }
    } finally {
      setJobsLoading(false);
      console.log('=== LOAD JOBS COMPLETE ===');
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
      
      // Fetch job details from the API
      const jobDetails = await dataEnrichmentApi.getJob(jobId);
      console.log('Job details received:', jobDetails);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Failed to load job details:', error);
      // Show error message
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

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
              {/* <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg> */}
            </div>
            {/* <input
              type="text"
              placeholder="Search endpoints..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            /> */}
          </div>
          <Button 
            variant="primary" 
            icon={<Plus size={16} />} 
            onClick={() => setShowJobForm(true)}
          >
            Define New Endpoint
          </Button>
        </div>
        
        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
          onRefresh={loadJobs}
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