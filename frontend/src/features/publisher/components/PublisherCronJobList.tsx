import React, { useState } from 'react';
import { Eye, MoreVertical, PlayIcon, PauseIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface PublisherCronJobListProps {
  schedules: ScheduleResponse[];
  isLoading?: boolean;
  onViewDetails?: (scheduleId: string) => void;
  searchQuery?: string;
  onToggleStatus?: (scheduleId: string, newStatus: 'active' | 'in-active') => void;
}

type SortField = 'name' | 'cron' | 'iterations' | 'start_date' | 'end_date' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

export const PublisherCronJobList: React.FC<PublisherCronJobListProps> = ({
  schedules,
  isLoading,
  onViewDetails,
  searchQuery = '',
  onToggleStatus
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter schedules based on search query
  const filteredSchedules = schedules.filter(schedule =>
    schedule.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schedule.cron?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort filtered schedules
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special cases for sorting
    if (sortField === 'created_at') {
      aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
      bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
    } else if (sortField === 'start_date') {
      aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
      bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
    } else if (sortField === 'end_date') {
      aValue = a.end_date ? new Date(a.end_date).getTime() : 0;
      bValue = b.end_date ? new Date(b.end_date).getTime() : 0;
    } else if (sortField === 'status') {
      aValue = a.status || '';
      bValue = b.status || '';
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (target.closest('.actions-dropdown')) {
        return;
      }
      
      setDropdownOpen(null);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading cron jobs...</span>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Exported Cron Jobs</h3>
          <p className="text-gray-500 mb-2">
            Cron jobs with "exported" status will appear here
          </p>
        </div>
      </div>
    );
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No cron jobs match your search</h3>
          <p className="text-gray-500 mb-6">
            Try adjusting your search terms or browse all cron jobs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>SCHEDULE NAME</span>
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('cron')}
              >
                <div className="flex items-center space-x-1">
                  <span>CRON EXPRESSION</span>
                  {sortField === 'cron' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('iterations')}
              >
                <div className="flex items-center space-x-1">
                  <span>ITERATIONS</span>
                  {sortField === 'iterations' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>START DATE</span>
                  {sortField === 'start_date' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('end_date')}
              >
                <div className="flex items-center space-x-1">
                  <span>END DATE</span>
                  {sortField === 'end_date' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center space-x-1">
                  <span>CREATED AT</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>STATUS</span>
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? 
                      <ChevronUpIcon className="w-4 h-4 ml-1" /> : 
                      <ChevronDownIcon className="w-4 h-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedSchedules.map((schedule, index) => {
              const isFirstRow = index === 0;
              const isLastRow = index === filteredSchedules.length - 1;
              const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
              
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
                    <div className="text-sm text-gray-600">
                      {schedule.iterations === -1 ? 'Infinite' : `${schedule.iterations} iterations`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {schedule.start_date
                        ? new Date(schedule.start_date).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {schedule.end_date
                        ? new Date(schedule.end_date).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No end date'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {schedule.created_at
                        ? new Date(schedule.created_at).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                      {getStatusLabel(schedule.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="relative actions-dropdown">
                        <button
                          onClick={() => {
                            setDropdownOpen(dropdownOpen === schedule.id ? null : schedule.id);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === schedule.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownOpen === schedule.id && (
                          <DropdownMenuWithAutoDirection 
                            forceDirection={forceDirection}
                            onClose={() => setDropdownOpen(null)}
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  onViewDetails?.(schedule.id);
                                  setDropdownOpen(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </button>
                              {onToggleStatus && (
                                <>
                                  {schedule.schedule_status === 'active' ? (
                                    <button
                                      onClick={() => {
                                        onToggleStatus(schedule.id, 'in-active');
                                        setDropdownOpen(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <PauseIcon className="w-4 h-4 mr-2" />
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        onToggleStatus(schedule.id, 'active');
                                        setDropdownOpen(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <PlayIcon className="w-4 h-4 mr-2" />
                                      Activate
                                    </button>
                                  )}
                                </>
                              )}
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

export default PublisherCronJobList;
