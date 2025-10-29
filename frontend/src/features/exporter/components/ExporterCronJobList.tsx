import React, { useState } from 'react';
import { Eye, MoreVertical } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { DropdownMenuWithAutoDirection } from '../../data-enrichment/components/DropdownMenuWithAutoDirection';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface ExporterCronJobListProps {
  schedules: ScheduleResponse[];
  isLoading?: boolean;
  onViewDetails?: (scheduleId: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
}

export const ExporterCronJobList: React.FC<ExporterCronJobListProps> = (props) => {
  const {
    schedules,
    isLoading = false,
    onViewDetails,
    onRefresh,
    searchQuery = '',
  } = props;

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Filter schedules based on search query
  const filteredSchedules = schedules.filter(schedule =>
    schedule.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    schedule.cron?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (filteredSchedules.length === 0) {
    const hasSearchQuery = searchQuery && searchQuery.trim() !== '';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasSearchQuery ? 'No cron jobs match your search' : 'No approved cron jobs yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {hasSearchQuery
              ? 'Try adjusting your search terms'
              : 'Approved cron jobs will appear here when they are ready for export'
            }
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                NAME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                CRON
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                START DATE
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                END DATE
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredSchedules.map((schedule, index) => {
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
                      {schedule.start_date
                        ? new Date(schedule.start_date).toLocaleDateString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric'
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
                            year: 'numeric'
                          })
                        : 'No end date'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status || 'approved')}`}>
                      {getStatusLabel(schedule.status || 'approved')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="relative actions-dropdown">
                        <button
                          onClick={() => {
                            setDropdownOpen(dropdownOpen === schedule.id ? null : schedule.id);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === schedule.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownOpen === schedule.id && (
                          <DropdownMenuWithAutoDirection forceDirection={forceDirection}>
                            <div className="py-1">
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

export default ExporterCronJobList;
