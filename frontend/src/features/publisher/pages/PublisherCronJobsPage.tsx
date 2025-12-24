import React, { useState, useEffect } from 'react';
import { ChevronLeft, ClockIcon, SearchIcon } from 'lucide-react';
import { cronJobApi as cronJobService } from '../../cron/handlers';
import { useToast } from '../../../shared/providers/ToastProvider';
import type { ScheduleResponse } from '../../cron/types';
import PublisherCronJobList from '../components/PublisherCronJobList';
import PublisherCronJobDetailsModal from '../components/PublisherCronJobDetailsModal';
import { Button } from '@shared';
import { useNavigate } from 'react-router';
import { useAuth } from '@features/auth';
import { getPrimaryRole } from '@utils/common/roleUtils';
import { UI_CONFIG } from '@shared/config/app.config';
import CronJobApproverList from '@features/approver/components/CronJobApproverList';
import CronJobViewModal from '@features/cron/components/CronJobViewModal/index';

const PublisherCronJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchedule, setSelectedSchedule] =
    useState<ScheduleResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showError } = useToast();

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchingFilters, setSearchingFilters] = useState({});

  const { user } = useAuth();
  const userRole = getPrimaryRole(user?.claims as string[]);

  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);

  const loadCronJobs = async (pageNumber: number = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const limit: number = itemsPerPage;
      const offset: number = pageNumber - 1;

      const params = { limit, offset, userRole: userRole as string };

      const response = await cronJobService.getList(
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

  const handleViewDetails = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
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
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
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
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ClockIcon size={28} style={{ color: '#f59e0b' }} />
              Cron Job Module
            </h1>
          </div>
        </div>

        {/* Cron Jobs Table */}
        <CronJobApproverList
          schedules={schedules}
          isLoading={schedulesLoading}
          onViewDetails={handleViewDetails}
          searchQuery={searchTerm}
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

      {/* Cron Job Details Modal */}
      {/* <PublisherCronJobDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        schedule={selectedSchedule}
        onPublishSuccess={handlePublishSuccess}
      /> */}

      <CronJobViewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        viewFormData={selectedSchedule}
      />
    </div>
  );
};

export default PublisherCronJobsPage;
