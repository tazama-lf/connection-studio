import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { SearchIcon, Clock, Database, Layers } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { ScheduleResponse, DataEnrichmentJobResponse } from '../../data-enrichment/types';
import ExportedCronJobList from '../components/ExportedCronJobList';
import ExportedDEJobList from '../components/ExportedDEJobList';
import PublisherCronJobDetailsModal from '../components/PublisherCronJobDetailsModal';
import PublisherDEJobDetailsModal from '../components/PublisherDEJobDetailsModal';

type TabType = 'cron-jobs' | 'de-jobs' | 'dems';

const PublisherExportedItemsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cron-jobs');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cron Jobs state
  const [cronJobs, setCronJobs] = useState<ScheduleResponse[]>([]);
  const [cronJobsLoading, setCronJobsLoading] = useState(false);
  const [selectedCronJob, setSelectedCronJob] = useState<ScheduleResponse | null>(null);
  const [selectedDEJob, setSelectedDEJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [isCronJobModalOpen, setIsCronJobModalOpen] = useState(false);
  const [isDEJobModalOpen, setIsDEJobModalOpen] = useState(false);
  
  // DE Jobs state (placeholder)
  const [deJobs, setDeJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [deJobsLoading, setDeJobsLoading] = useState(false);
  
  const { showError } = useToast();

  useEffect(() => {
    if (activeTab === 'cron-jobs') {
      loadExportedCronJobs();
    } else if (activeTab === 'de-jobs') {
      loadExportedDEJobs();
    } else if (activeTab === 'dems') {
      loadExportedDEMS();
    }
  }, [activeTab]);

  const loadExportedCronJobs = async () => {
    console.log('PublisherExportedItemsPage: loadExportedCronJobs called');
    setCronJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('PublisherExportedItemsPage: Schedules loaded:', response?.length || 0);
      
      // Filter for exported schedules that are ready for publishing
      const exportedSchedules = response?.filter((schedule: ScheduleResponse) => 
        schedule.status === 'exported'
      ) || [];
      
      // Sort by created_at descending (newest first)
      const sortedSchedules = exportedSchedules.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setCronJobs(sortedSchedules);
    } catch (error) {
      console.error('Failed to load exported cron jobs:', error);
      showError('Failed to load exported cron jobs');
      setCronJobs([]);
    } finally {
      setCronJobsLoading(false);
    }
  };

  const loadExportedDEJobs = async () => {
    console.log('PublisherExportedItemsPage: loadExportedDEJobs called');
    setDeJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('PublisherExportedItemsPage: DE Jobs loaded:', response?.jobs?.length || 0);
      
      // Filter for exported jobs
      const exportedJobs = response?.jobs?.filter((job: DataEnrichmentJobResponse) => 
        job.status === 'exported'
      ) || [];
      
      // Sort by created_at descending
      const sortedJobs = exportedJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setDeJobs(sortedJobs);
    } catch (error) {
      console.error('Failed to load exported DE jobs:', error);
      showError('Failed to load exported DE jobs');
      setDeJobs([]);
    } finally {
      setDeJobsLoading(false);
    }
  };

  const loadExportedDEMS = async () => {
    console.log('PublisherExportedItemsPage: loadExportedDEMS called - Not implemented yet');
    // TODO: Implement DEMS loading when API is available
  };

  const handleViewCronJobDetails = (scheduleId: string) => {
    const schedule = cronJobs.find(s => s.id === scheduleId);
    if (schedule) {
      setSelectedCronJob(schedule);
      setIsCronJobModalOpen(true);
    }
  };

  const handleViewDEJobDetails = (jobId: string) => {
    const job = deJobs.find(j => j.id === jobId);
    if (job) {
      setSelectedDEJob(job);
      setIsDEJobModalOpen(true);
    }
  };

  const handlePublishSuccess = () => {
    if (activeTab === 'cron-jobs') {
      loadExportedCronJobs();
    } else if (activeTab === 'de-jobs') {
      loadExportedDEJobs();
    }
  };

  const tabs = [
    {
      id: 'cron-jobs' as TabType,
      name: 'Cron Jobs',
      icon: <Clock size={18} />,
      count: cronJobs.length,
    },
    {
      id: 'de-jobs' as TabType,
      name: 'DE Jobs',
      icon: <Database size={18} />,
      count: deJobs.length,
    },
    {
      id: 'dems' as TabType,
      name: 'DEMS',
      icon: <Layers size={18} />,
      count: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Exported Items" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Exported Items</h1>
          <p className="text-gray-600 mt-1">
            Review and publish exported items that are ready for deployment
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.name}
                <span className={`
                  ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium
                  ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full md:w-96">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.name.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'cron-jobs' && (
            <ExportedCronJobList
              schedules={cronJobs}
              isLoading={cronJobsLoading}
              onViewDetails={handleViewCronJobDetails}
              onRefresh={loadExportedCronJobs}
              searchQuery={searchTerm}
            />
          )}

          {activeTab === 'de-jobs' && (
            <ExportedDEJobList
              jobs={deJobs}
              isLoading={deJobsLoading}
              onViewDetails={handleViewDEJobDetails}
              onRefresh={loadExportedDEJobs}
              searchQuery={searchTerm}
            />
          )}

          {activeTab === 'dems' && (
            <div className="p-8 text-center text-gray-500">
              <Layers size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">DEMS</p>
              <p className="mt-2">UI component coming soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Cron Job Details Modal */}
      <PublisherCronJobDetailsModal
        isOpen={isCronJobModalOpen}
        onClose={() => setIsCronJobModalOpen(false)}
        schedule={selectedCronJob}
        onPublishSuccess={handlePublishSuccess}
      />

      {/* DE Job Details Modal */}
      <PublisherDEJobDetailsModal
        isOpen={isDEJobModalOpen}
        onClose={() => setIsDEJobModalOpen(false)}
        job={selectedDEJob}
        onPublishSuccess={handlePublishSuccess}
      />
    </div>
  );
};

export default PublisherExportedItemsPage;
