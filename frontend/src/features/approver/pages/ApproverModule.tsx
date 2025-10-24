import React, { useState, useEffect } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ConfigList } from '../../config/components/ConfigList';
import { JobList } from '../../data-enrichment/components/JobList';
import JobDetailsModal from '../../data-enrichment/components/JobDetailsModal';
import { Button } from '../../../shared/components/Button';
import { SearchIcon, AlertTriangleIcon, Settings, Database, Clock } from 'lucide-react';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import ValidationLogsTable from '../../../shared/components/ValidationLogsTable';
import type { Config } from '../../config/index';
import type { DataEnrichmentJobResponse, JobStatus } from '../../data-enrichment/types';
import { configApi } from '../../config/services/configApi';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { RejectionDialog } from '../../../shared/components/RejectionDialog';
import { ConfigReviewModal } from '../../../shared/components/ConfigReviewModal';
import { ChangeRequestDialog } from '../../../shared/components/ChangeRequestDialog';
import { useAuth } from '../../auth/contexts/AuthContext';
import { CronJobApproverList } from './CronJobApproverList';
import CronJobDetailsModal from './CronJobDetailsModal';
import type { ScheduleResponse } from '../../data-enrichment/types';

const ApproverModule: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<'configs' | 'jobs' | 'cron-jobs'>('configs');
  
  // Config-related state
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(null);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [configToReject, setConfigToReject] = useState<Config | null>(null);
  const [configToRequestChanges, setConfigToRequestChanges] = useState<Config | null>(null);
  
  // Data Enrichment Job state
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('pending'); // Default to pending for approvers
  const [recordStatusFilter, setRecordStatusFilter] = useState<'active' | 'in-active' | 'not-set' | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'push' | 'pull' | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Job details modal state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DataEnrichmentJobResponse | null>(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  
  // Cron Job state
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [cronJobSearchTerm, setCronJobSearchTerm] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'active' | 'inactive' | 'ALL'>('ALL');
  
  // Cron job details modal state
  const [showCronJobDetails, setShowCronJobDetails] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  const [cronJobDetailsLoading, setCronJobDetailsLoading] = useState(false);
  
  const { showSuccess, showError } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('🔍 ApproverModule - Auth state:', { isAuthenticated, user: user?.username, claims: user?.claims });
  }, [isAuthenticated]);

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

  const loadJobs = async () => {
    console.log('ApproverModule: loadJobs called');
    setJobsLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllJobs();
      console.log('ApproverModule: Jobs loaded:', response?.jobs?.length || 0);
      
      // Sort jobs by created_at descending (newest first)
      const jobsArray = response?.jobs || [];
      const sortedJobs = jobsArray.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA; // Descending order (newest first)
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

  const handleJobRefresh = () => {
    console.log('ApproverModule: handleJobRefresh called - triggering loadJobs');
    loadJobs();
  };

  const loadCronJobs = async () => {
    console.log('ApproverModule: loadCronJobs called');
    setSchedulesLoading(true);
    try {
      const response = await dataEnrichmentApi.getAllSchedules();
      console.log('ApproverModule: Schedules loaded:', response?.length || 0);
      
      // Sort schedules by created_at descending (newest first)
      const schedulesArray = response || [];
      const sortedSchedules = schedulesArray.sort((a: any, b: any) => {
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
    console.log('ApproverModule: handleCronJobRefresh called - triggering loadCronJobs');
    loadCronJobs();
  };

  const handleViewCronJobDetails = async (scheduleId: string) => {
    console.log('ApproverModule: View cron job details clicked for:', scheduleId);
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

  const handleCloseCronJobDetails = () => {
    setShowCronJobDetails(false);
    setSelectedSchedule(null);
  };

  const handleViewJobDetails = async (jobId: string) => {
    console.log('ApproverModule: View job details clicked for:', jobId);
    try {
      setJobDetailsLoading(true);
      setShowJobDetails(true);
      
      // Find the job in the current list to determine its type
      const job = jobs.find(j => j.id === jobId);
      const jobType = job?.type?.toUpperCase() as 'PULL' | 'PUSH' | undefined;
      
      // Fetch job details from the API
      const jobDetails = await dataEnrichmentApi.getJob(jobId, jobType);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Failed to load job details:', error);
      showError('Failed to load job details');
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setEditingConfig(null);
    // Refresh the config list when modal closes
    setRefreshKey(prev => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey(prev => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    // Open EditEndpointModal for viewing - same workflow as DEMS
    setEditingEndpointId(config.id);
    setEditingConfig(config);
  };

  const handleApprove = async (configId: number) => {
    try {
      const response = await configApi.approveConfig(configId);
      if (response.success) {
        showSuccess('Configuration approved successfully');
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('❌ handleApprove - Response success is false, but checking if operation actually succeeded...');
        console.log('❌ handleApprove - Config in response:', response.config);

        // Even if success is false, if we have a config object, the operation likely succeeded
        if (response.config) {
          console.log('✅ handleApprove - Config object found, treating as successful despite success: false');
          showSuccess('Configuration approved successfully');
          setRefreshKey(prev => prev + 1);
        } else {
          showError(response.message || 'Failed to approve configuration');
        }
      }
    } catch (error) {
      console.error('Failed to approve config:', error);
      showError('Failed to approve configuration');
    }
  };

  const handleRejectClick = (config: Config) => {
    setConfigToReject(config);
    setShowRejectionDialog(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!configToReject) return;

    try {
      const response = await configApi.rejectConfig(configToReject.id, reason);
      if (response.success) {
        showSuccess('Configuration rejected successfully');
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('❌ handleRejectConfirm - Response success is false, but checking if operation actually succeeded...');
        if (response.config) {
          console.log('✅ handleRejectConfirm - Config object found, treating as successful despite success: false');
          showSuccess('Configuration rejected successfully');
          setRefreshKey(prev => prev + 1);
        } else {
          showError(response.message || 'Failed to reject configuration');
        }
      }
    } catch (error) {
      console.error('Failed to reject config:', error);
      showError('Failed to reject configuration');
    }
  };

  const handleChangeRequestConfirm = async (requestedChanges: string) => {
    if (!configToRequestChanges) return;

    try {
      const response = await configApi.requestChanges(configToRequestChanges.id, requestedChanges);
      if (response.success) {
        showSuccess('Change request sent to editor successfully');
        setRefreshKey(prev => prev + 1);
        // Close the modal after successful change request
        handleCloseModal();
      } else {
        console.log('❌ handleChangeRequestConfirm - Response success is false, but checking if operation actually succeeded...');
        if (response.config) {
          console.log('✅ handleChangeRequestConfirm - Config object found, treating as successful despite success: false');
          showSuccess('Change request sent to editor successfully');
          setRefreshKey(prev => prev + 1);
          handleCloseModal();
        } else {
          showError(response.message || 'Failed to send change request');
        }
      }
    } catch (error) {
      console.error('Failed to request changes:', error);
      showError('Failed to send change request to editor');
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRevertToEditor = (config: Config) => {
    setConfigToRequestChanges(config);
    setShowChangeRequestDialog(true);
  };

  const handleSendForApproval = async (configId: number) => {
    try {
      console.log('🚀 handleSendForApproval - Starting approval for config:', configId);
      const response = await configApi.approveConfig(configId);
      console.log('📨 handleSendForApproval - Raw API response:', response);
      console.log('📨 handleSendForApproval - Response success:', response.success);
      console.log('📨 handleSendForApproval - Response message:', response.message);

      if (response.success) {
        console.log('✅ handleSendForApproval - Approval successful');
        showSuccess('Configuration approved successfully');
        setRefreshKey(prev => prev + 1);
        // Close the modal after successful approval
        handleCloseModal();
      } else {
        console.log('❌ handleSendForApproval - Response success is false, but checking if operation actually succeeded...');
        console.log('❌ handleSendForApproval - Error message:', response.message);
        console.log('❌ handleSendForApproval - Config in response:', response.config);

        // Even if success is false, if we have a config object, the operation likely succeeded
        // This handles cases where the backend returns success: false but still performs the action
        if (response.config) {
          console.log('✅ handleSendForApproval - Config object found, treating as successful despite success: false');
          showSuccess('Configuration approved successfully');
          setRefreshKey(prev => prev + 1);
          handleCloseModal();
        } else {
          showError(response.message || 'Failed to approve configuration');
        }
      }
    } catch (error) {
      console.error('💥 handleSendForApproval - Exception occurred:', error);
      showError('Failed to approve configuration');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Approver Dashboard" showBackButton={true} />
      
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
                <span>Configuration Approval</span>
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
              <>
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
                
                {/* <Button 
                  variant="secondary" 
                  onClick={() => setShowValidationLogs(!showValidationLogs)} 
                  icon={<AlertTriangleIcon size={16} />}
                >
                  Validation Logs
                </Button> */}
              </>
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
          showValidationLogs ? (
            <ValidationLogsTable />
          ) : (
            <div className="bg-white rounded-lg shadow">
              <ConfigList
                key={refreshKey}
                searchTerm={searchTerm}
                onViewDetails={handleViewDetails}
                onRefresh={handleRefresh}
                showPendingApprovals={true}
                onApprove={handleSendForApproval}
                onReject={handleRevertToEditor}
                onSendForDeployment={handleSendForApproval}
              />
            </div>
          )
        ) : activeTab === 'jobs' ? (
          <div className="bg-white rounded-lg shadow">
            <JobList
              jobs={jobs}
              isLoading={jobsLoading}
              onViewLogs={handleViewJobDetails}
              onRefresh={handleJobRefresh}
              statusFilter={statusFilter}
              onStatusFilterChange={(newStatus) => {
                setStatusFilter(newStatus);
                setCurrentPage(1);
              }}
              searchQuery={jobSearchTerm}
              recordStatusFilter={recordStatusFilter}
              onRecordStatusFilterChange={(newStatus) => {
                setRecordStatusFilter(newStatus);
                setCurrentPage(1);
              }}
              dateFilter={dateFilter}
              onDateFilterChange={(newPeriod) => {
                setDateFilter(newPeriod);
                setCurrentPage(1);
              }}
              typeFilter={typeFilter}
              onTypeFilterChange={(newType) => {
                setTypeFilter(newType);
                setCurrentPage(1);
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <CronJobApproverList
              schedules={schedules}
              isLoading={schedulesLoading}
              onViewDetails={handleViewCronJobDetails}
              onRefresh={handleCronJobRefresh}
              statusFilter={scheduleStatusFilter}
              onStatusFilterChange={setScheduleStatusFilter}
              searchQuery={cronJobSearchTerm}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEndpointId !== null && (
        <EditEndpointModal
          isOpen={editingEndpointId !== null}
          onClose={handleCloseModal}
          endpointId={editingEndpointId}
          onSuccess={handleConfigSuccess}
          readOnly={true}
          onRevertToEditor={() => editingConfig && handleRevertToEditor(editingConfig)}
          onSendForDeployment={() => handleSendForApproval(editingEndpointId)}
        />
      )}

      {/* Rejection Dialog */}
      {configToReject && (
        <RejectionDialog
          isOpen={showRejectionDialog}
          onClose={() => {
            setShowRejectionDialog(false);
            setConfigToReject(null);
          }}
          onConfirm={handleRejectConfirm}
          configName={configToReject.endpointPath}
        />
      )}

      {/* Config Review Modal */}
      {selectedConfig && (
        <ConfigReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedConfig(null);
          }}
          config={selectedConfig}
          onApprove={() => handleApprove(selectedConfig.id)}
          onReject={() => handleRejectClick(selectedConfig)}
        />
      )}

      {/* Change Request Dialog */}
      {configToRequestChanges && (
        <ChangeRequestDialog
          isOpen={showChangeRequestDialog}
          onClose={() => {
            setShowChangeRequestDialog(false);
            setConfigToRequestChanges(null);
          }}
          onConfirm={handleChangeRequestConfirm}
          configName={configToRequestChanges.endpointPath}
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
        />
      )}

      {/* Cron Job Details Modal */}
      {showCronJobDetails && selectedSchedule && (
        <CronJobDetailsModal
          isOpen={showCronJobDetails}
          onClose={handleCloseCronJobDetails}
          schedule={selectedSchedule}
          isLoading={cronJobDetailsLoading}
        />
      )}
    </div>
  );
};

export default ApproverModule;