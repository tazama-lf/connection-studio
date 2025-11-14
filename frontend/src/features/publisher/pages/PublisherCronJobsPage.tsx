import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { ScheduleResponse } from '../../data-enrichment/types';
import PublisherCronJobList from '../components/PublisherCronJobList';
import PublisherCronJobDetailsModal from '../components/PublisherCronJobDetailsModal';

const PublisherCronJobsPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { showError } = useToast();

  useEffect(() => {
    loadCronJobs();
  }, []);

  const loadCronJobs = async () => {
    console.log('PublisherCronJobsPage: loadCronJobs called');
    setSchedulesLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('PublisherCronJobsPage: Schedules loaded:', response?.length || 0);
      
      // Filter for exported and deployed schedules (publishers can see both)
      const publisherSchedules = response?.filter((schedule: ScheduleResponse) => 
        schedule.status === 'STATUS_06_EXPORTED' || schedule.status === 'STATUS_08_DEPLOYED'
      ) || [];
      
      console.log('PublisherCronJobsPage: Publisher schedules (exported + deployed):', publisherSchedules.length);
      
      // Transform exported status to deployed for publishers (display purposes)
      const transformedSchedules = publisherSchedules.map(schedule => ({
        ...schedule,
        status: schedule.status === 'STATUS_06_EXPORTED' ? 'STATUS_08_DEPLOYED' : schedule.status
      }));
      
      // Sort by created_at descending (newest first)
      const sortedSchedules = transformedSchedules.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setSchedules(sortedSchedules);
    } catch (error) {
      console.error('Failed to load cron jobs:', error);
      showError('Failed to load cron jobs');
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleViewDetails = (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      setSelectedSchedule(schedule);
      setIsModalOpen(true);
    }
  };

  const handlePublishSuccess = () => {
    loadCronJobs(); // Refresh the list after successful publish
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         
          
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cron jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cron Jobs Table */}
        <PublisherCronJobList
          schedules={schedules}
          isLoading={schedulesLoading}
          onViewDetails={handleViewDetails}
          searchQuery={searchTerm}
        />
      </div>

      {/* Cron Job Details Modal */}
      <PublisherCronJobDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        schedule={selectedSchedule}
        onPublishSuccess={handlePublishSuccess}
      />
    </div>
  );
};

export default PublisherCronJobsPage;
