import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { ChevronLeft, Plus, Database } from 'lucide-react';
import { useNavigate } from 'react-router';
import JobList from '../components/JobList';
import JobDetailsModal from '../components/JobDetailsModal';
import { DataEnrichmentFormModal } from '../components/DataEnrichmentFormModal';
import { DataEnrichmentEditModal } from '../components/DataEnrichmentEditModal';
import { useDataEnrichmentJobList } from '../hooks/useDataEnrichmentJobList';
import { useToast } from '../../../shared/providers/ToastProvider';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../constants';

const DataEnrichmentModule: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const {
    jobs,
    pagination,
    searchingFilters,
    selectedJob,
    editMode,
    error,
    loading,
    actionLoading,
    userIsEditor,
    userIsApprover,
    setSearchingFilters,
    setSelectedJob,
    setEditMode,
    loadJobs,
    handleView,
    handleEdit,
    handleSaveEdit,
    handleSendForApproval,
  } = useDataEnrichmentJobList();
  
  const [showJobForm, setShowJobForm] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);

  const fetchJobsWithScrollPreservation = () => {
    const scrollPosition = window.scrollY;
    loadJobs()
      .then(() => {
        setTimeout(() => {
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      })
      .catch((error) => {
        setTimeout(() => {
          if (
            scrollPosition > 0 &&
            scrollPosition < document.body.scrollHeight
          ) {
            window.scrollTo(0, scrollPosition);
          }
        }, 100);
      });
  };

  const handleCreateJob = async (jobResponse: any) => {
    try {
      fetchJobsWithScrollPreservation();

      const backendMessage = jobResponse?.message;
      const jobName = jobResponse?.endpoint_name ?? 'New endpoint';
      const successMessage =
        backendMessage ??
        `${jobName} has been saved successfully! You can now send it for approval.`;
      showSuccess(successMessage);
    } catch (error) {
      showError('Failed to handle job creation');
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    await handleView(jobId);
    setShowJobDetails(true);
  };

  const handleEditJob = async (job: any) => {
    await handleEdit(job);
    setShowJobDetails(true);
  };

  const handleCloseJobDetails = () => {
    setShowJobDetails(false);
    setSelectedJob(null);
    setEditMode(false);
  };

  const handleSaveJobChanges = async (updatedJob: any) => {
    try {
      await handleSaveEdit(updatedJob);
      handleCloseJobDetails();
    } catch (error) {

      throw error;
    }
  };

  const handleSendJobForApproval = async (jobId: string, jobType: 'PULL' | 'PUSH') => {
    try {
      await handleSendForApproval(jobId, jobType);
      handleCloseJobDetails();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={async () => { await navigate(-1); }}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>


        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <Database size={28} style={{ color: '#10b981' }} />
              Data Enrichment
            </h1>
          </div>
          {userIsEditor && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => { setShowJobForm(true); }}
            >
              Create New Enrichment Job
            </Button>
          )}
        </div>


        {userIsApprover && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Approver Dashboard
                  </h3>
                  <p className="text-sm text-blue-700">
                    Review and approve pending data enrichment jobs
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  pending approvals
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchingFilters({ status: DATA_ENRICHMENT_JOB_STATUSES.IN_PROGRESS });
                  }}
                >
                  View Pending Jobs
                </Button>
              </div>
            </div>
          </div>
        )}


        <JobList
          jobs={jobs}
          isLoading={loading}
          onViewLogs={handleViewJobDetails}
          onEdit={handleEditJob}
          onRefresh={fetchJobsWithScrollPreservation}
          pagination={pagination}
          searchingFilters={searchingFilters}
          setSearchingFilters={setSearchingFilters}
          error={error}
          loading={loading}
        />


        {showJobForm && (
          <DataEnrichmentFormModal
            isOpen={showJobForm}
            onClose={() => { setShowJobForm(false); }}
            onSave={handleCreateJob}
            editMode={false}
          />
        )}


        {showJobDetails && !editMode && (
          <JobDetailsModal
            isOpen={showJobDetails && !editMode}
            onClose={handleCloseJobDetails}
            job={selectedJob}
            isLoading={actionLoading !== ''}
            editMode={false}
            onSave={handleSaveJobChanges}
            onSendForApproval={handleSendJobForApproval}
          />
        )}



        {editMode && (
          <DataEnrichmentEditModal
            isOpen={editMode}
            onClose={handleCloseJobDetails}
            onCloseWithRefresh={() => {
              handleCloseJobDetails();
              fetchJobsWithScrollPreservation();
            }}
            editMode={true}
            selectedJob={selectedJob}
          />
        )}
      </div>
    </div>
  );
};

export default DataEnrichmentModule;
