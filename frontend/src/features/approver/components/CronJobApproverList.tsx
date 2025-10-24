import React, { useState } from 'react';
import { Eye, Play, MoreVertical, ChevronDown, FilterIcon } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { dataEnrichmentApi } from '../../data-enrichment/services/dataEnrichmentApi';
import { useToast } from '../../../shared/providers/ToastProvider';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isApprover } from '../../../utils/roleUtils';
import { DropdownMenuWithAutoDirection } from '../../data-enrichment/components/DropdownMenuWithAutoDirection';

interface CronJobApproverListProps {
  schedules: ScheduleResponse[];
  isLoading?: boolean;
  onViewDetails?: (scheduleId: string) => void;
  onRefresh?: () => void;
  statusFilter?: 'active' | 'inactive' | 'ALL';
  onStatusFilterChange?: (status: 'active' | 'inactive' | 'ALL') => void;
  searchQuery?: string;
}

type ScheduleStatus = 'active' | 'inactive';

const StatusBadge: React.FC<{ status: ScheduleStatus }> = ({ status }) => {
  const getStatusConfig = (status: ScheduleStatus) => {
    switch (status) {
      case 'active':
        return {
          className: 'bg-green-50 text-green-700',
          dotColor: 'bg-green-500',
          text: 'ACTIVE'
        };
      case 'inactive':
        return {
          className: 'bg-gray-100 text-gray-700',
          dotColor: 'bg-gray-500',
          text: 'INACTIVE'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-700',
          dotColor: 'bg-gray-500',
          text: String(status).toUpperCase()
        };
    }
  };

  const config = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full ${config.className}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${config.dotColor}`}></span>
      {config.text}
    </span>
  );
};

export const CronJobApproverList: React.FC<CronJobApproverListProps> = (props) => {
  const {
    schedules,
    isLoading = false,
    onViewDetails,
    onRefresh,
    statusFilter = 'ALL',
    onStatusFilterChange,
    searchQuery = '',
  } = props;

  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;

  const { showSuccess, showError } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking on dropdown buttons or dropdown content
      if (target.closest('.filter-dropdown') || target.closest('.dropdown-menu') || target.closest('.actions-dropdown')) {
        return;
      }

      setStatusDropdownOpen(false);
      setDropdownOpen(null);
    };

    if (statusDropdownOpen || dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusDropdownOpen, dropdownOpen]);

  const handleStatusUpdate = async (scheduleId: string, newStatus: ScheduleStatus) => {
    try {
      console.log(`Updating schedule ${scheduleId} status to ${newStatus}`);

      await dataEnrichmentApi.updateSchedule(scheduleId, {
        schedule_status: newStatus
      });

      showSuccess(`Schedule status updated to ${newStatus}`);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update schedule status:', error);
      showError('Failed to update schedule status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading cron jobs...</span>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    // Check if any filters are active
    const hasActiveFilters =
      (statusFilter && statusFilter !== 'ALL') ||
      (searchQuery && searchQuery.trim() !== '');

    if (hasActiveFilters) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cron Jobs Match Your Filters</h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search criteria or clear all filters to see all cron jobs
            </p>
            <Button
              onClick={() => {
                onStatusFilterChange?.('ALL');
                onRefresh?.();
              }}
              variant="primary"
            >
              Refresh
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cron Jobs Yet</h3>
          <p className="text-gray-500 mb-2">
            Cron jobs are created when data enrichment jobs are scheduled
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Check the Data Enrichment Jobs tab to see scheduled jobs
          </p>
          {onRefresh && (
            <Button onClick={onRefresh} variant="secondary">
              Refresh
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (schedules.length === 0 && searchQuery.trim()) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No cron jobs match your search</h3>
          <p className="text-gray-500 mb-6">
            Try adjusting your search terms or browse all cron jobs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                SCHEDULE NAME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                CRON EXPRESSION
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <FilterIcon className="w-4 h-4 text-gray-400" />
                  <span>STATUS</span>
                  <div className="relative filter-dropdown">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setStatusDropdownOpen(!statusDropdownOpen);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Filter by status"
                    >
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 dropdown-menu">
                        <div className="py-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onStatusFilterChange?.('ALL');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'ALL' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            All Statuses
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onStatusFilterChange?.('active');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'active' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Active
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onStatusFilterChange?.('inactive');
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'inactive' ? 'bg-gray-100 font-medium' : 'text-gray-700'}`}
                          >
                            Inactive
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ITERATIONS
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                NEXT RUN
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                CREATED TIME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {schedules.map((schedule, index) => {
              const displayStatus: ScheduleStatus = (schedule.schedule_status as ScheduleStatus) || 'inactive';

              return (
                <tr key={schedule.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 font-mono">
                      {schedule.cron}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={displayStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {schedule.iterations === -1 ? 'Infinite' : schedule.iterations}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {schedule.next_time
                        ? new Date(schedule.next_time).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">
                        {schedule.created_at
                          ? new Date(schedule.created_at).toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      {/* Actions Dropdown */}
                      <div className="relative actions-dropdown">
                        <button
                          onClick={() => {
                            setDropdownOpen(dropdownOpen === schedule.id ? null : schedule.id);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === schedule.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                          title="Approver actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownOpen === schedule.id && userIsApprover && (
                          <DropdownMenuWithAutoDirection>
                            <div className="py-1">
                              {/* View Details */}
                              <button
                                onClick={() => {
                                  onViewDetails?.(schedule.id);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </button>

                              {/* Activation Controls */}
                              <hr className="my-1 border-gray-100" />
                              <button
                                onClick={() => {
                                  handleStatusUpdate(schedule.id, 'active');
                                  setDropdownOpen(null);
                                }}
                                disabled={displayStatus === 'active'}
                                className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                  displayStatus === 'active'
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700'
                                }`}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Activate
                              </button>
                              <button
                                onClick={() => {
                                  handleStatusUpdate(schedule.id, 'inactive');
                                  setDropdownOpen(null);
                                }}
                                disabled={displayStatus === 'inactive'}
                                className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                  displayStatus === 'inactive'
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700'
                                }`}
                              >
                                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                                  <span>⏸</span>
                                </div>
                                Deactivate
                              </button>
                            </div>
                          </DropdownMenuWithAutoDirection>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CronJobApproverList;