import React, { useState, useEffect } from 'react';
import { Settings, Database, Clock, SearchIcon } from 'lucide-react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import { configApi } from '../../config/services/configApi';
import type { DataEnrichmentJobResponse, ScheduleResponse } from '../../data-enrichment/types';
import type { Config } from '../../config';
import { ExporterConfigList } from '../components/ExporterConfigList';
import ExporterJobList from '../components/ExporterJobList';
import ExporterCronJobList from '../components/ExporterCronJobList';
import ConfigDetailsModal from '../components/ConfigDetailsModal';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import CronJobDetailsModal from '../components/CronJobDetailsModal';
import { isExporter } from '../../../utils/roleUtils';

export const ExporterModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'configs' | 'jobs' | 'cron-jobs'>('configs');
  const [refreshKey, setRefreshKey] = useState(0);
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Role check
  const userIsExporter = user?.claims ? isExporter(user.claims) : false;

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [cronJobSearchTerm, setCronJobSearchTerm] = useState('');

  // Config state
  const [configs, setConfigs] = useState<Config[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [configDetailsLoading, setConfigDetailsLoading] = useState(false);

  // Data Enrichment Job state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // Cron Job state
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  const [showCronJobDetails, setShowCronJobDetails] = useState(false);
  const [cronJobDetailsLoading, setCronJobDetailsLoading] = useState(false);

  useEffect(() => {
    console.log('🔍 ExporterModule - Auth state:', { isAuthenticated, user: user?.username, claims: user?.claims });
  }, [isAuthenticated]);

  // Load configs when the configs tab is active
  useEffect(() => {
    if (activeTab === 'configs') {
      loadConfigs();
    }
  }, [activeTab, refreshKey]);

  // Load data enrichment jobs when the jobs tab is active
  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [activeTab]);

  // Load cron jobs when the cron-jobs tab is active
  useEffect(() => {
    if (activeTab === 'cron-jobs') {
      loadCronJobs();
    }
  }, [activeTab]);

  // Role-based access check
  useEffect(() => {
    if (isAuthenticated && user?.claims && !userIsExporter) {
      console.warn('User does not have exporter role');
      showError('You do not have permission to access the Exporter Dashboard');
    }
  }, [isAuthenticated, user, userIsExporter, showError]);

  const loadConfigs = async () => {
    console.log('ExporterModule: loadConfigs called');
    setConfigsLoading(true);
    try {
      const response = await configApi.getAllConfigs();
      console.log('ExporterModule: Configs loaded:', response?.configs?.length || 0);
      
      // Filter for 'approved' configs only
      const approvedConfigs = response.configs.filter((c: Config) => c.status === 'approved');
      console.log('ExporterModule: Approved configs:', approvedConfigs.length);
      
      setConfigs(approvedConfigs);
    } catch (error) {
      console.error('Failed to load configs:', error);
      showError('Failed to load configurations');
      setConfigs([]);
    } finally {
      setConfigsLoading(false);
    }
  };

  const loadJobs = async () => {
    console.log('ExporterModule: loadJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('ExporterModule: Jobs loaded:', response?.jobs?.length || 0);
      
      // Filter for 'approved' jobs only
      const jobsArray = response?.jobs || [];
      const approvedJobs = jobsArray.filter((j: any) => j.status === 'approved');
      console.log('ExporterModule: Approved jobs:', approvedJobs.length);
      
      // Sort jobs by created_at descending (newest first)
      const sortedJobs = approvedJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA;
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

  const loadCronJobs = async () => {
    console.log('ExporterModule: loadCronJobs called');
    setSchedulesLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('ExporterModule: Schedules loaded:', response?.length || 0);
      
      // Filter for 'approved' schedules only
      const schedulesArray = response || [];
      const approvedSchedules = schedulesArray.filter((s: any) => s.status === 'approved');
      console.log('ExporterModule: Approved schedules:', approvedSchedules.length);
      
      // Sort schedules by created_at descending (newest first)
      const sortedSchedules = approvedSchedules.sort((a: any, b: any) => {
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

  const handleConfigRefresh = () => {
    console.log('ExporterModule: handleConfigRefresh called');
    setRefreshKey(prev => prev + 1);
  };

  const handleJobRefresh = () => {
    console.log('ExporterModule: handleJobRefresh called');
    loadJobs();
  };

  const handleCronJobRefresh = () => {
    console.log('ExporterModule: handleCronJobRefresh called');
    loadCronJobs();
  };

  const handleViewConfigDetails = async (configId: number) => {
    console.log('ExporterModule: View config details clicked for:', configId);
    try {
      setConfigDetailsLoading(true);
      setShowConfigDetails(true);
      
      const config = configs.find(c => c.id === configId);
      if (config) {
        setSelectedConfig(config);
      }
    } catch (error) {
      console.error('Failed to load config details:', error);
      showError('Failed to load configuration details');
    } finally {
      setConfigDetailsLoading(false);
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    console.log('ExporterModule: View job details clicked for:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      
      const job = jobs.find(j => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Failed to load job details:', error);
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleViewCronJobDetails = async (scheduleId: string) => {
    console.log('ExporterModule: View cron job details clicked for:', scheduleId);
    try {
      setCronJobDetailsLoading(true);
      setShowCronJobDetails(true);
      
      const schedule = schedules.find(s => s.id === scheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
      } else {
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

  const handleExportConfig = async (configId: number) => {
    try {
      await configApi.updateConfigStatus(configId, 'exported');
      showSuccess('Configuration exported successfully');
      handleConfigRefresh();
      setShowConfigDetails(false);
    } catch (error) {
      console.error('Failed to export config:', error);
      showError('Failed to export configuration');
    }
  };

  const handleExportJob = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await dataEnrichmentApi.updateJobStatus(jobId, 'exported', jobType);
      showSuccess('Job exported successfully');
      handleJobRefresh();
      setShowJobDetails(false);
    } catch (error) {
      console.error('Failed to export job:', error);
      showError('Failed to export job');
    }
  };

  const handleExportCronJob = async (scheduleId: string) => {
    try {
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'exported');
      showSuccess('Cron job exported successfully');
      handleCronJobRefresh();
      setShowCronJobDetails(false);
    } catch (error) {
      console.error('Failed to export cron job:', error);
      showError('Failed to export cron job');
    }
  };

  const handleCloseConfigDetails = () => {
    setShowConfigDetails(false);
    setSelectedConfig(null);
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  const handleCloseCronJobDetails = () => {
    setShowCronJobDetails(false);
    setSelectedSchedule(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Exporter Dashboard" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('configs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'configs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings size={16} />
                <span>DEMS Configurations</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database size={16} />
                <span>Data Enrichment Jobs</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cron-jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'cron-jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>Cron Jobs</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar - Conditional based on active tab */}
            {activeTab === 'configs' ? (
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ) : activeTab === 'jobs' ? (
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
            ) : (
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
            )}
          </div>
        </div>

        {/* Content Section */}
        {activeTab === 'configs' ? (
          <div className="bg-white rounded-lg shadow">
            <ExporterConfigList
              configs={configs}
              isLoading={configsLoading}
              onViewDetails={handleViewConfigDetails}
              onRefresh={handleConfigRefresh}
              searchQuery={searchTerm}
            />
          </div>
        ) : activeTab === 'jobs' ? (
          <div className="bg-white rounded-lg shadow">
            <ExporterJobList
              jobs={jobs}
              isLoading={jobsLoading}
              onViewDetails={handleViewJobDetails}
              onRefresh={handleJobRefresh}
              searchQuery={jobSearchTerm}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <ExporterCronJobList
              schedules={schedules}
              isLoading={schedulesLoading}
              onViewDetails={handleViewCronJobDetails}
              onRefresh={handleCronJobRefresh}
              searchQuery={cronJobSearchTerm}
            />
          </div>
        )}
      </div>

      {/* Config Details Modal */}
      {showConfigDetails && selectedConfig && (
        <ConfigDetailsModal
          isOpen={showConfigDetails}
          onClose={handleCloseConfigDetails}
          config={selectedConfig}
          onExport={handleExportConfig}
        />
      )}

      {/* Job Details Modal */}
      {showJobDetails && selectedJob && (
        <JobDetailsModal
          isOpen={showJobDetails}
          onClose={handleCloseJobDetails}
          job={selectedJob}
          isLoading={jobDetailsLoading}
          editMode={false}
          onExport={handleExportJob}
        />
      )}

      {/* Cron Job Details Modal */}
      {showCronJobDetails && selectedSchedule && (
        <CronJobDetailsModal
          isOpen={showCronJobDetails}
          onClose={handleCloseCronJobDetails}
          schedule={selectedSchedule}
          onExport={handleExportCronJob}
        />
      )}
    </div>
  );
};

export default ExporterModule;
