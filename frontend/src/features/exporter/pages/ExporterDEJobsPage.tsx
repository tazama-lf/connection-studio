import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import { JobList } from '../../data-enrichment/components/JobList';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import { isExporter } from '../../../utils/roleUtils';

export const ExporterDEJobsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // State
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access this page');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

  // Load data on component mount
  useEffect(() => {
    if (userIsExporter) {
      loadDEJobs();
    }
  }, [userIsExporter]);

  const loadDEJobs = async () => {
    console.log('ExporterDEJobsPage: loadDEJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('ExporterDEJobsPage: Jobs loaded:', response?.jobs?.length || 0);
      
      // Filter for approved and exported jobs only
      const filteredJobs = response?.jobs?.filter((job: DataEnrichmentJobResponse) => 
        job.status === 'approved' || job.status === 'exported'
      ) || [];
      
      // Sort by created_at descending (newest first)
      const sortedJobs = filteredJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      console.log('ExporterDEJobsPage: Filtered jobs:', sortedJobs.length);
      setJobs(sortedJobs);
    } catch (error) {
      console.error('Failed to load DE jobs:', error);
      showError('Failed to load data enrichment jobs');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    console.log('Exporter viewing job details:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      
      // Find the job in the current list to determine its type
      const job = jobs.find(j => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      // Fetch job details from the API
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
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

  const handleExportJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    console.log('Exporter exporting job:', jobId, jobType);
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'exported', jobType);
      showSuccess('Job exported successfully!');
      
      // Refresh the jobs list
      await loadDEJobs();
      
      // Close the modal
      handleCloseJobDetails();
    } catch (error) {
      console.error('Failed to export job:', error);
      showError('Failed to export job. Please try again.');
    }
  };

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthHeader title="Data Enrichment" showBackButton={true} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Enrichment</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and export approved data enrichment jobs
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search DE jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* DE Jobs Table */}
        <JobList
          jobs={jobs}
          isLoading={jobsLoading}
          onRefresh={loadDEJobs}
          onViewLogs={handleViewJobDetails}
          searchQuery={searchTerm}
        />
      </div>

      {/* Modal for viewing job details */}
      <JobDetailsModal
        isOpen={showJobDetails}
        onClose={handleCloseJobDetails}
        job={selectedJob}
        isLoading={jobDetailsLoading}
        onExport={handleExportJob}
      />
    </div>
  );
};

export default ExporterDEJobsPage;