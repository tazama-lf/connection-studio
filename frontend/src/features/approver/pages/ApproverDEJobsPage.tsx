import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { JobList } from '../../data-enrichment/components/JobList';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import type { DataEnrichmentJobResponse, JobStatus } from '../../data-enrichment/types';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { AuthHeader } from '../../../shared/components/AuthHeader';

const ApproverDEJobsPage: React.FC = () => {
  // Data Enrichment Job state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('in-progress'); // Default to in-progress for approvers
  const [recordStatusFilter, setRecordStatusFilter] = useState<'active' | 'in-active' | 'not-set' | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'push' | 'pull' | 'ALL'>('ALL');

  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    console.log('ApproverDEJobsPage: loadJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('ApproverDEJobsPage: Jobs loaded:', response?.jobs?.length || 0);

      // Show all statuses: under-review, approved, and rejected
      const jobsArray = response?.jobs || [];
      const relevantJobs = jobsArray.filter((j: any) =>
        j.status === 'under-review' || j.status === 'approved' || j.status === 'rejected'
      );
      console.log('ApproverDEJobsPage: Relevant jobs (under-review, approved, rejected):', relevantJobs.length);

      // Sort jobs by created_at descending (newest first)
      const sortedJobs = relevantJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setJobs(sortedJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      showError('Failed to load data enrichment jobs');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleJobRefresh = () => {
    console.log('ApproverDEJobsPage: handleJobRefresh called - triggering loadJobs');
    loadJobs();
  };

  const handleApproveJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'approved', jobType);
      showSuccess('Job approved successfully');
      handleJobRefresh();
    } catch (error) {
      console.error('Failed to approve job:', error);
      showError('Failed to approve job');
    }
  };

  const handleRejectJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'rejected', jobType);
      showSuccess('Job rejected successfully');
      handleJobRefresh();
    } catch (error) {
      console.error('Failed to reject job:', error);
      showError('Failed to reject job');
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    console.log('ApproverDEJobsPage: View job details clicked for:', jobId);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment" showBackButton={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search data enrichment jobs..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <JobList
            jobs={jobs}
            isLoading={jobsLoading}
            onViewLogs={handleViewJobDetails}
            onRefresh={handleJobRefresh}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={jobSearchTerm}
            recordStatusFilter={recordStatusFilter}
            onRecordStatusFilterChange={setRecordStatusFilter}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />
        </div>
      </main>

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={false}
          onApprove={handleApproveJob}
          onReject={handleRejectJob}
        />
      )}
    </div>
  );
};

export default ApproverDEJobsPage;