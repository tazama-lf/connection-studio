import React, { useState, useEffect } from 'react';
import { Button } from '../../../../shared/components/Button';
import { Plus, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { dataEnrichmentApi } from '../../handlers/index';
import { cronJobApi as cronJobService } from '../../../cron/handlers';
import type { ScheduleResponse } from '../../../cron/types';
import { useToast } from '../../../../shared/providers/ToastProvider';
import { useAuth } from '../../../auth/contexts/AuthContext';
import { isEditor, isApprover } from '../../../../utils/common/roleUtils';
import { getStatusColor, getStatusLabel } from '../../../../shared/utils/statusColors';

interface CronJobManagementProps {
  onCreateSchedule?: () => void;
}

const CronJobManagement: React.FC<CronJobManagementProps> = ({ onCreateSchedule }) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const userIsEditor = user?.claims ? isEditor(user.claims) : false;
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;

  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await cronJobService.getAll();
      setSchedules(response);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      showError('Failed to load cron jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'under-review');
      showSuccess('Cron job submitted for approval');
      await loadSchedules();
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showError('Failed to submit cron job for approval');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'approved');
      showSuccess('Cron job approved successfully');
      await loadSchedules();
    } catch (error) {
      console.error('Failed to approve:', error);
      showError('Failed to approve cron job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (scheduleId: string) => {
    try {
      setActionLoading(scheduleId);
      await dataEnrichmentApi.updateScheduleStatus(scheduleId, 'rejected');
      showSuccess('Cron job rejected');
      await loadSchedules();
    } catch (error) {
      console.error('Failed to reject:', error);
      showError('Failed to reject cron job');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusValue = status || 'unknown';
    const colorClasses = getStatusColor(statusValue);
    const label = getStatusLabel(statusValue);
    
    // Get icon based on status
    let icon = null;
    switch (status) {
      case 'in-progress':
        icon = <Clock size={12} className="mr-1" />;
        break;
      case 'under-review':
        icon = <Send size={12} className="mr-1" />;
        break;
      case 'approved':
        icon = <CheckCircle size={12} className="mr-1" />;
        break;
      case 'rejected':
        icon = <XCircle size={12} className="mr-1" />;
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
        {icon}
        {label}
      </span>
    );
  };

  const getFilteredSchedules = () => {
    if (userIsApprover) {
      // Approvers see all "under-review" schedules
      return schedules.filter(schedule => schedule.status === 'under-review');
    } else if (userIsEditor) {
      // Editors see their own schedules in any status
      return schedules; // In a real app, you'd filter by creator/owner
    }
    return [];
  };

  const filteredSchedules = getFilteredSchedules();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cron Job Management</h3>
              <p className="text-sm text-gray-600">
                {userIsApprover
                  ? 'Review and approve cron job schedules'
                  : userIsEditor
                    ? 'Create and manage cron job schedules'
                    : 'View cron job schedules'
                }
              </p>
            </div>
          </div>
          {userIsEditor && onCreateSchedule && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={onCreateSchedule}
            >
              New Cron Job
            </Button>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading cron jobs...</p>
          </div>
        ) : filteredSchedules.length > 0 ? (
          <div className="space-y-4">
            {filteredSchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="font-medium text-gray-900">{schedule.name || 'Unnamed Schedule'}</div>
                    {getStatusBadge(schedule.status)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Cron: {schedule.cron} | Iterations: {schedule.iterations}
                  </div>
                  {schedule.start_date && (
                    <div className="text-xs text-gray-400 mt-1">
                      Start: {new Date(schedule.start_date).toLocaleDateString()}
                      {schedule.end_date && ` | End: ${new Date(schedule.end_date).toLocaleDateString()}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {userIsEditor && schedule.status === 'in-progress' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Send size={14} />}
                      onClick={() => handleSubmitForApproval(schedule.id)}
                      disabled={actionLoading === schedule.id}
                    >
                      {actionLoading === schedule.id ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                  )}

                  {userIsApprover && schedule.status === 'under-review' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle size={14} />}
                        onClick={() => handleApprove(schedule.id)}
                        disabled={actionLoading === schedule.id}
                      >
                        {actionLoading === schedule.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle size={14} />}
                        onClick={() => handleReject(schedule.id)}
                        disabled={actionLoading === schedule.id}
                      >
                        {actionLoading === schedule.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cron jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {userIsApprover
                ? 'No cron jobs are currently under review.'
                : userIsEditor
                  ? 'Create your first cron job schedule to get started.'
                  : 'No cron jobs available.'
              }
            </p>
            {userIsEditor && onCreateSchedule && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={onCreateSchedule}
                className="mt-4"
              >
                Create Cron Job
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CronJobManagement;