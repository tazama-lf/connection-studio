import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { SearchIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import PublisherDEJobList from '../components/PublisherDEJobList';
import PublisherDEJobDetailsModal from '../components/PublisherDEJobDetailsModal';

const PublisherDEJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { showError } = useToast();

  useEffect(() => {
    loadDEJobs();
  }, []);

  const loadDEJobs = async () => {
    console.log('PublisherDEJobsPage: loadDEJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('PublisherDEJobsPage: DE Jobs loaded:', response?.jobs?.length || 0);
      
      // Filter for exported and deployed DE jobs (publishers can see both)
      const allJobs = response?.jobs || [];
      const publisherJobs = allJobs.filter((job: DataEnrichmentJobResponse) => 
        job.status === 'exported' || job.status === 'deployed'
      );
      
      console.log('PublisherDEJobsPage: Publisher jobs (exported + deployed):', publisherJobs.length);
      
      // Transform exported status to deployed for publishers (display purposes)
      const transformedJobs = publisherJobs.map(job => ({
        ...job,
        status: job.status === 'exported' ? 'deployed' : job.status
      }));
      
      // Sort by created_at descending (newest first)
      const sortedJobs = transformedJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setJobs(sortedJobs);
    } catch (error) {
      console.error('Failed to load DE jobs:', error);
      showError('Failed to load data enrichment jobs');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleViewDetails = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
      setIsModalOpen(true);
    }
  };

  const handlePublishSuccess = () => {
    loadDEJobs(); // Refresh the list after successful publish
  };

  return (
    <div c8lassName="min-h-screen bg-gray-50">
      <AuthHeader title="Data Enrichment" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search DE jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* DE Jobs Table */}
        <PublisherDEJobList
          jobs={jobs}
          isLoading={jobsLoading}
          onViewDetails={handleViewDetails}
          onRefresh={loadDEJobs}
          searchQuery={searchTerm}
        />
      </div>

      {/* DE Job Details Modal */}
      <PublisherDEJobDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={selectedJob}
        onPublishSuccess={handlePublishSuccess}
      />
    </div>
  );
};

export default PublisherDEJobsPage;
