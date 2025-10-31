import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { CronJobList } from '../../cron/components/CronJobList';
import { isExporter } from '../../../utils/roleUtils';

export const ExporterCronJobsPage: React.FC = () => {
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
      <div className="min-h-screen bg-gray-50">
        <AuthHeader title="Cron Job Management" showBackButton={true} />
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
      <AuthHeader title="Cron Job Management" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          

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
                placeholder="Search cron jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Cron Jobs Table */}
        <CronJobList
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
};

export default ExporterCronJobsPage;