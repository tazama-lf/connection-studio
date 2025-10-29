import React, { useState } from 'react';
import { Eye, MoreVertical } from 'lucide-react';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import { Button } from '../../../shared/components/Button';
import { DropdownMenuWithAutoDirection } from '../../data-enrichment/components/DropdownMenuWithAutoDirection';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';

interface ExporterJobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewDetails?: (jobId: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
}

export const ExporterJobList: React.FC<ExporterJobListProps> = (props) => {
  const {
    jobs,
    isLoading = false,
    onViewDetails,
    onRefresh,
    searchQuery = '',
  } = props;

  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job =>
    job.endpoint_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <span className="ml-2 text-gray-600">Loading jobs...</span>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    const hasSearchQuery = searchQuery && searchQuery.trim() !== '';

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasSearchQuery ? 'No jobs match your search' : 'No approved jobs yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {hasSearchQuery
              ? 'Try adjusting your search terms'
              : 'Approved data enrichment jobs will appear here when they are ready for export'
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
                ENDPOINT NAME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TYPE
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                TABLE NAME
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                CREATED AT
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredJobs.map((job, index) => {
              const isFirstRow = index === 0;
              const isLastRow = index === filteredJobs.length - 1;
              const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
              const jobType = job.type?.toUpperCase() || 'PULL';
              
              return (
                <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {job.endpoint_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded ${
                      jobType === 'PUSH' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {jobType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {job.table_name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status || 'approved')}`}>
                      {getStatusLabel(job.status || 'approved')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleDateString('en-US', {
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
                  <td className="px-6 py-4 relative">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="relative actions-dropdown">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === job.id ? null : job.id);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 ${dropdownOpen === job.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {dropdownOpen === job.id && (
                          <DropdownMenuWithAutoDirection forceDirection={forceDirection}>
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewDetails?.(job.id);
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

export default ExporterJobList;
