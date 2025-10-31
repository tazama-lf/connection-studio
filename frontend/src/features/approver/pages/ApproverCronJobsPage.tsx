import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';
import { CronJobApproverList } from '../components/CronJobApproverList';
import CronJobDetailsModal from '../components/CronJobDetailsModal';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { AuthHeader } from '../../../shared/components/AuthHeader';

const ApproverCronJobsPage: React.FC = () => {
  // Cron Job state
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [cronJobSearchTerm, setCronJobSearchTerm] = useState('');

  // Cron job details modal state
  const [showCronJobDetails, setShowCronJobDetails] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  const [cronJobDetailsLoading, setCronJobDetailsLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadCronJobs();
  }, []);

  const loadCronJobs = async () => {
    console.log('ApproverCronJobsPage: loadCronJobs called');
    setSchedulesLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('ApproverCronJobsPage: Schedules loaded:', response?.length || 0);

      // Show all statuses: under-review, approved, and rejected
      const schedulesArray = response || [];
      const relevantSchedules = schedulesArray.filter((s: any) =>
        s.status === 'under-review' || s.status === 'approved' || s.status === 'rejected'
      );
      console.log('ApproverCronJobsPage: Relevant schedules (under-review, approved, rejected):', relevantSchedules.length);

      // Sort schedules by created_at descending (newest first)
      const sortedSchedules = relevantSchedules.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
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

  const handleCronJobRefresh = () => {
    console.log('ApproverCronJobsPage: handleCronJobRefresh called - triggering loadCronJobs');
    loadCronJobs();
  };

  const handleViewCronJobDetails = async (scheduleId: string) => {
    console.log('ApproverCronJobsPage: View cron job details clicked for:', scheduleId);
    try {
      setCronJobDetailsLoading(true);
      setShowCronJobDetails(true);

      // Find the schedule in the current list
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
      } else {
        // If not found in current list, fetch from API
        const scheduleDetails = await dataEnrichmentApi.getSchedule(scheduleId);
        setSelectedSchedule(scheduleDetails);
      }
    } catch (error) {
      console.error('Failed to load cron job details:', error);
      showError('Failed to load cron job details');
    } finally {
      setCronJobDetailsLoading(false);
    }
  };

  const handleApproveCronJob = async (scheduleId: string) => {
    try {
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'approved');
      showSuccess('Cron job approved successfully');
      handleCronJobRefresh();
    } catch (error) {
      console.error('Failed to approve cron job:', error);
      showError('Failed to approve cron job');
    }
  };

  const handleRejectCronJob = async (scheduleId: string) => {
    try {
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'rejected');
      showSuccess('Cron job rejected successfully');
      handleCronJobRefresh();
    } catch (error) {
      console.error('Failed to reject cron job:', error);
      showError('Failed to reject cron job');
    }
  };

  const handleCloseCronJobDetails = () => {
    setShowCronJobDetails(false);
    setSelectedSchedule(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Cron Jobs" showBackButton={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Review and approve scheduled cron job configurations and executions.
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cron jobs..."
                value={cronJobSearchTerm}
                onChange={(e) => setCronJobSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <CronJobApproverList
            schedules={schedules}
            isLoading={schedulesLoading}
            onViewDetails={handleViewCronJobDetails}
            onRefresh={handleCronJobRefresh}
            searchQuery={cronJobSearchTerm}
          />
        </div>
      </main>

      {/* Cron Job Details Modal */}
      {showCronJobDetails && selectedSchedule && (
        <CronJobDetailsModal
          isOpen={showCronJobDetails}
          onClose={handleCloseCronJobDetails}
          schedule={selectedSchedule}
          isLoading={cronJobDetailsLoading}
          onApprove={handleApproveCronJob}
          onReject={handleRejectCronJob}
        />
      )}
    </div>
  );
};

export default ApproverCronJobsPage;