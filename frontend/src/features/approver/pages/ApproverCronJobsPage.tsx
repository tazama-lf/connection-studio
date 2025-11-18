import React, { useState, useEffect } from 'react';
import { ChevronLeft, SearchIcon } from 'lucide-react';
import { CronJobApproverList } from '../components/CronJobApproverList';
import CronJobDetailsModal from '../components/CronJobDetailsModal';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { Button } from '@shared';
import { useNavigate } from 'react-router';
import { getPrimaryRole } from '@utils/roleUtils';
import { useAuth } from '@features/auth';
import { UI_CONFIG } from '@shared/config/app.config';
import CronJobViewModal from '@features/cron/components/CronJobViewModal';

const ApproverCronJobsPage: React.FC = () => {
  const navigate = useNavigate();
  // Cron Job state
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [cronJobSearchTerm, setCronJobSearchTerm] = useState('');
  
  // Cron job details modal state
  const [showCronJobDetails, setShowCronJobDetails] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
  useState<any>(null);
  const [cronJobDetailsLoading, setCronJobDetailsLoading] = useState(false);
  console.log(selectedSchedule);

  const { user } = useAuth();
  const userRole = getPrimaryRole(user?.claims as string[]);

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);

  const { showSuccess, showError } = useToast();

  // useEffect(() => {
  //   loadCronJobs();
  // }, []);

  // const loadCronJobs = async () => {
  //   console.log('ApproverCronJobsPage: loadCronJobs called');
  //   setSchedulesLoading(true);
  //   try {
  //     const response = await dataEnrichmentApi.getAllSchedules();
  //     console.log(
  //       'ApproverCronJobsPage: Schedules loaded:',
  //       response?.length || 0,
  //     );

  //     // Show all statuses: under-review, approved, and rejected
  //     const schedulesArray = response || [];
  //     const relevantSchedules = schedulesArray.filter(
  //       (s: any) =>
  //         s.status === 'under-review' ||
  //         s.status === 'approved' ||
  //         s.status === 'rejected',
  //     );
  //     console.log(
  //       'ApproverCronJobsPage: Relevant schedules (under-review, approved, rejected):',
  //       relevantSchedules.length,
  //     );

  //     // Sort schedules by created_at descending (newest first)
  //     const sortedSchedules = relevantSchedules.sort((a: any, b: any) => {
  //       const dateA = new Date(a.created_at || 0).getTime();
  //       const dateB = new Date(b.created_at || 0).getTime();
  //       return dateB - dateA; // Descending order (newest first)
  //     });

  //     setSchedules(sortedSchedules);
  //   } catch (error) {
  //     console.error('Failed to load cron jobs:', error);
  //     showError('Failed to load cron jobs');
  //     setSchedules([]);
  //   } finally {
  //     setSchedulesLoading(false);
  //   }
  // };

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});

  const loadCronJobs = async (pageNumber: number = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params = { limit, offset, userRole: userRole as string };

      const response = await dataEnrichmentApi.getCronJobList(
        params,
        searchingFilters,
      );

      setSchedules(response?.data || []);
      setTotalPages(response.pages);
      setTotalRecords(response.total);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch schedules';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCronJobs(page);
  }, [page, searchingFilters]);

  const handleCronJobRefresh = () => {
    console.log(
      'ApproverCronJobsPage: handleCronJobRefresh called - triggering loadCronJobs',
    );
    loadCronJobs();
  };

  const handleViewCronJobDetails = async (scheduleId: string) => {
    console.log(
      'ApproverCronJobsPage: View cron job details clicked for:',
      scheduleId,
    );
    try {
      setCronJobDetailsLoading(true);
      setShowCronJobDetails(true);

      // Find the schedule in the current list
      const schedule = schedules.find((s) => s.id === scheduleId);
      if (schedule) {
        setSelectedSchedule({ ...schedule, cronExpression: schedule.cron });
      } else {
        // If not found in current list, fetch from API
        const scheduleDetails = await dataEnrichmentApi.getSchedule(scheduleId);
        setSelectedSchedule({...scheduleDetails, cronExpression: scheduleDetails.cron});
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
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'STATUS_04_APPROVED');
      showSuccess('Cron job approved successfully');
      handleCronJobRefresh();
    } catch (error) {
      console.error('Failed to approve cron job:', error);
      showError('Failed to approve cron job');
    }
  };

  const handleRejectCronJob = async (scheduleId: string) => {
    try {
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'STATUS_05_REJECTED');
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
    <div className="min-h-screen bg-white">
      <main className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1 className="text-2xl font-bold text-gray-800">
              CRON Job Module
            </h1>
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
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            itemsPerPage={itemsPerPage}
            searchingFilters={searchingFilters}
            setSearchingFilters={setSearchingFilters}
            error={error}
            loading={loading}
          />
        </div>
      </main>

      {/* Cron Job Details Modal */}
      {/* {showCronJobDetails && selectedSchedule && (
        <CronJobDetailsModal
          isOpen={showCronJobDetails}
          onClose={handleCloseCronJobDetails}
          schedule={selectedSchedule}
          isLoading={cronJobDetailsLoading}
          onApprove={handleApproveCronJob}
          onReject={handleRejectCronJob}
        />
      )} */}
      {showCronJobDetails && selectedSchedule && (
        <CronJobViewModal
          isOpen={showCronJobDetails}
          onClose={handleCloseCronJobDetails}
          viewFormData={selectedSchedule}
          onApprove={handleApproveCronJob}
          onReject={handleRejectCronJob}
        />
      )}
    </div>
  );
};

export default ApproverCronJobsPage;
