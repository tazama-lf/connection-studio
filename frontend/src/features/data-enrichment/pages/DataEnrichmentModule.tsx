import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import Pagination from '../components/Pagination';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../../../shared/components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import type { DataEnrichmentJobResponse } from '../types';

const DataEnrichmentModule: React.FC = () => {
  // Job management state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  
  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load jobs on component mount and when pagination changes
  useEffect(() => {
    loadJobs();
  }, [currentPage, itemsPerPage]);

  const loadJobs = async () => {
    console.log('loadJobs called, currentPage:', currentPage, 'itemsPerPage:', itemsPerPage);
    setJobsLoading(true);
    try {
      // Fetch jobs from the data enrichment service
      const response = await dataEnrichmentApi.getAllJobs(currentPage, itemsPerPage);
      console.log('API response received:', response);
      setJobs(response.jobs || []);
      setTotalItems(response.total || 0);
      console.log('Jobs set to state:', response.jobs?.length || 0, 'total items:', response.total);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setJobs([]); // Ensure jobs is always an array even on error
      setTotalItems(0);
      
      // Show user-friendly error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Cannot connect to data enrichment service. Using empty job list.');
      }
    } finally {
      setJobsLoading(false);
    }
  };

  const handleCreateJob = async (jobResponse: any) => {
    try {
      console.log('Job created successfully:', jobResponse);
      // The DataEnrichmentFormModal already shows its own success message
      // We just need to refresh the jobs list
      await loadJobs();
      
      // Show additional success message in the main module
      const jobName = jobResponse?.endpoint_name || 'New endpoint';
      setSuccessMessage(`${jobName} has been successfully deployed and is now available!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Failed to handle job creation:', error);
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
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {successMessage}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                    onClick={() => setSuccessMessage(null)}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onViewLogs={handleViewJobDetails}
          onRefresh={loadJobs}
        />
        
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1); // Reset to first page when changing items per page
            }}
          />
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