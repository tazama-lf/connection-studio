import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { Plus } from 'lucide-react';

// New job management components
import JobList from '../components/JobList';
import Pagination from '../components/Pagination';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../../../shared/components/DataEnrichmentFormModal';
import { dataEnrichmentApi } from '../services/enrichmentApi';
import type { DataEnrichmentJobResponse, CreateDataEnrichmentJobRequest, JobListResponse } from '../types';

const DataEnrichmentModule: React.FC = () => {
  // Job management state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    console.log('loadJobs called, currentPage:', currentPage, 'itemsPerPage:', itemsPerPage);
    setJobsLoading(true);
    try {
      const response: JobListResponse = await dataEnrichmentApi.getAllJobs(currentPage, itemsPerPage);
      console.log('API response received:', response);
      setJobs(response.jobs || []);
      setTotalItems(response.total || 0);
      console.log('Jobs set to state:', response.jobs?.length || 0, 'total items:', response.total);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setJobs([]); // Ensure jobs is always an array even on error
      setTotalItems(0);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleCreateJob = async (jobData: CreateDataEnrichmentJobRequest) => {
    try {
      setJobsLoading(true);
      await dataEnrichmentApi.createJob(jobData);
      setShowJobForm(false);
      await loadJobs(); // Reload the jobs list
      // Show success message
    } catch (error) {
      console.error('Failed to create job:', error);
      // Show error message
    } finally {
      setJobsLoading(false);
    }
  };

  const handleViewJobDetails = async (jobId: number) => {
    console.log('handleViewJobDetails called with jobId:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      console.log('Calling API to get job details...');
      const jobDetails = await dataEnrichmentApi.getJobById(jobId);
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