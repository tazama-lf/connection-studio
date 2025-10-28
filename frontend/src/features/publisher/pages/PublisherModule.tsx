import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { Button } from '../../../shared/components/Button';
import { SearchIcon, UploadIcon, CheckCircleIcon, Settings, Database, Clock } from 'lucide-react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isPublisher } from '../../../utils/roleUtils';
import type { Config } from '../../config/index';
import type { DataEnrichmentJobResponse, ScheduleResponse } from '../../data-enrichment/types';
import { configApi } from '../../config/services/configApi';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';

const PublisherModule: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<'configs' | 'jobs' | 'cron-jobs'>('configs');
  
  // Config-related state
  const [configs, setConfigs] = useState<Config[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  
  // Data Enrichment Job state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  
  // Cron Job state
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [cronJobSearchTerm, setCronJobSearchTerm] = useState('');
  
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('🔍 PublisherModule - Auth state:', { isAuthenticated, user: user?.username, claims: user?.claims });
    
    // Check if user has publisher role
    if (user?.claims && !isPublisher(user.claims)) {
      console.warn('User does not have publisher role');
    }
  }, [isAuthenticated, user]);

  // Load configs when the configs tab is active
  useEffect(() => {
    if (activeTab === 'configs') {
      loadConfigs();
    }
  }, [activeTab]);

  // Load jobs when the jobs tab is active
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

  const loadConfigs = async () => {
    console.log('PublisherModule: loadConfigs called');
    setConfigsLoading(true);
    try {
      const response = await configApi.getAllConfigs();
      console.log('PublisherModule: Configs loaded:', response?.configs?.length || 0);
      
      // Filter for approved configs that are ready for publishing
      const approvedConfigs = response?.configs?.filter((config: Config) => config.status === 'approved') || [];
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
    console.log('PublisherModule: loadJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('PublisherModule: Jobs loaded:', response?.jobs?.length || 0);
      
      // Filter for approved jobs that are ready for publishing
      const approvedJobs = response?.jobs?.filter((job: DataEnrichmentJobResponse) => job.status === 'approved') || [];
      setJobs(approvedJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      showError('Failed to load data enrichment jobs');
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const loadCronJobs = async () => {
    console.log('PublisherModule: loadCronJobs called');
    setSchedulesLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('PublisherModule: Schedules loaded:', response?.length || 0);
      
      // Filter for approved schedules that are ready for publishing
      const approvedSchedules = response?.filter((schedule: ScheduleResponse) => schedule.status === 'approved') || [];
      setSchedules(approvedSchedules);
    } catch (error) {
      console.error('Failed to load cron jobs:', error);
      showError('Failed to load cron jobs');
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handlePublishConfig = async (configId: number) => {
    try {
      // TODO: Implement config publishing logic
      console.log('Publishing config:', configId);
      showSuccess('Configuration published successfully');
      loadConfigs(); // Refresh the list
    } catch (error) {
      console.error('Failed to publish config:', error);
      showError('Failed to publish configuration');
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      // TODO: Implement job publishing logic
      console.log('Publishing job:', jobId);
      showSuccess('Data enrichment job published successfully');
      loadJobs(); // Refresh the list
    } catch (error) {
      console.error('Failed to publish job:', error);
      showError('Failed to publish data enrichment job');
    }
  };

  const handlePublishCronJob = async (scheduleId: string) => {
    try {
      // TODO: Implement cron job publishing logic
      console.log('Publishing cron job:', scheduleId);
      showSuccess('Cron job published successfully');
      loadCronJobs(); // Refresh the list
    } catch (error) {
      console.error('Failed to publish cron job:', error);
      showError('Failed to publish cron job');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Publisher Dashboard" showBackButton={true} />
      
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
                <span>Configuration Publishing</span>
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
                  value={configSearchTerm}
                  onChange={(e) => setConfigSearchTerm(e.target.value)}
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Configurations Ready for Publishing</h3>
              <p className="text-sm text-gray-600 mt-1">Approved configurations waiting to be published to production</p>
            </div>

            {configsLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading configurations...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Endpoint Path
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Modified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {configs
                      .filter(config =>
                        config.endpointPath.toLowerCase().includes(configSearchTerm.toLowerCase()) ||
                        config.transactionType.toLowerCase().includes(configSearchTerm.toLowerCase())
                      )
                      .map((config) => (
                        <tr key={config.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{config.endpointPath}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {config.transactionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Approved
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(config.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handlePublishConfig(config.id)}
                              size="sm"
                              icon={<UploadIcon size={14} />}
                            >
                              Publish
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {!configsLoading && configs.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No configurations to publish</h3>
                <p className="mt-1 text-sm text-gray-500">All approved configurations have been published.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'jobs' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Data Enrichment Jobs Ready for Publishing</h3>
              <p className="text-sm text-gray-600 mt-1">Approved data enrichment jobs waiting to be published to production</p>
            </div>

            {jobsLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading jobs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobs
                      .filter(job =>
                        job.name?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                        job.type?.toLowerCase().includes(jobSearchTerm.toLowerCase())
                      )
                      .map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{job.name || 'Unnamed Job'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {job.type?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Approved
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(job.created_at || job.createdAt || 0).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handlePublishJob(job.id)}
                              size="sm"
                              icon={<UploadIcon size={14} />}
                            >
                              Publish
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {!jobsLoading && jobs.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs to publish</h3>
                <p className="mt-1 text-sm text-gray-500">All approved data enrichment jobs have been published.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Cron Jobs Ready for Publishing</h3>
              <p className="text-sm text-gray-600 mt-1">Approved cron jobs waiting to be published to production</p>
            </div>

            {schedulesLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading cron jobs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cron Expression
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {schedules
                      .filter(schedule =>
                        schedule.name?.toLowerCase().includes(cronJobSearchTerm.toLowerCase()) ||
                        schedule.cronExpression?.toLowerCase().includes(cronJobSearchTerm.toLowerCase())
                      )
                      .map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{schedule.name || 'Unnamed Schedule'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {schedule.cronExpression}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Approved
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(schedule.created_at || 0).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => handlePublishCronJob(schedule.id)}
                              size="sm"
                              icon={<UploadIcon size={14} />}
                            >
                              Publish
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {!schedulesLoading && schedules.length === 0 && (
              <div className="px-6 py-12 text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No cron jobs to publish</h3>
                <p className="mt-1 text-sm text-gray-500">All approved cron jobs have been published.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublisherModule;
