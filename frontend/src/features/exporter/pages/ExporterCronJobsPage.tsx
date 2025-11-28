import React, { useState, useEffect } from 'react';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { CronJobList } from '../../cron/components/CronJobList';
import { isExporter } from '../../../utils/roleUtils';
import { ChevronLeft, ClockIcon } from 'lucide-react';
import { Button } from '@shared';
import { useNavigate } from 'react-router';

export const ExporterCronJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // State
  const [searchTerm, setSearchTerm] = useState('');

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      showError('You do not have permission to access this page');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

  if (!isAuthenticated || !userIsExporter) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              You do not have permission to access this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

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

        {/* Search Bar and Export Actions */}

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
        <CronJobList searchTerm={searchTerm} />
      </div>
    </div>
  );
};

export default ExporterCronJobsPage;
