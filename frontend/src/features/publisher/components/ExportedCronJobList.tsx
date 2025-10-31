import React, { useState } from 'react';
import { Eye, MoreVertical, Package } from 'lucide-react';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';

interface ExportedCronJobListProps {
  schedules: ScheduleResponse[];
  isLoading?: boolean;
  onViewDetails?: (scheduleId: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
}

const ExportedCronJobList: React.FC<ExportedCronJobListProps> = ({
  schedules,
  isLoading,
  onViewDetails,
  onRefresh,
  searchQuery = '',
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filteredSchedules = schedules.filter(schedule => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      schedule.name?.toLowerCase().includes(query) ||
      schedule.id?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading exported cron jobs...</p>
        </div>
      </div>
    );
  }

  if (filteredSchedules.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No exported cron jobs</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchQuery
            ? 'No cron jobs match your search criteria.'
            : 'There are no cron jobs ready for deployment.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cron Expression
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredSchedules.map((schedule, index) => {
            const isFirstRow = index === 0;
            const isLastRow = index === filteredSchedules.length - 1;
            const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
            
            return (
              <tr key={schedule.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.name || 'Unnamed Schedule'}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {schedule.id?.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-mono">
                  {schedule.cron || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                  {getStatusLabel(schedule.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {schedule.created_at
                  ? new Date(schedule.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <div className="relative actions-dropdown">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === schedule.id ? null : schedule.id)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      title="Actions"
                    >
                      <MoreVertical size={18} className="text-gray-600" />
                    </button>

                    {openDropdown === schedule.id && (
                      <DropdownMenuWithAutoDirection
                        forceDirection={forceDirection}
                        onClose={() => setOpenDropdown(null)}
                      >
                        <button
                          onClick={() => {
                            setOpenDropdown(null);
                            onViewDetails?.(schedule.id);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </button>
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
  );
};

export default ExportedCronJobList;
