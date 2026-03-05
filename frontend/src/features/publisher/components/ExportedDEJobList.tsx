import React, { useState } from 'react';
import { Eye, MoreVertical, Package } from 'lucide-react';
import type { DataEnrichmentJobResponse } from '../../data-enrichment/types';
import { getStatusColor, getStatusLabel } from '../../../shared/utils/statusColors';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';

interface ExportedDEJobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewDetails?: (jobId: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
}

// Helper function to determine job type
const getJobType = (job: DataEnrichmentJobResponse): 'push' | 'pull' => {
  if (job.type?.toLowerCase() === 'push' || job.type?.toLowerCase() === 'pull') {
    return job.type.toLowerCase() as 'push' | 'pull';
  }
  return (job.path && !job.source_type) ? 'push' : 'pull';
};

const ExportedDEJobList: React.FC<ExportedDEJobListProps> = ({
  jobs,
  isLoading,
  onViewDetails,
  onRefresh,
  searchQuery = '',
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.endpoint_name?.toLowerCase().includes(query) ||
      job.table_name?.toLowerCase().includes(query) ||
      job.type?.toLowerCase().includes(query) ||
      job.id?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading exported DE jobs...</p>
        </div>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No exported DE jobs</h3>
        <p className="mt-1 text-sm text-gray-500">
          {searchQuery
            ? 'No DE jobs match your search criteria.'
            : 'There are no DE jobs ready for deployment.'}
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
              Endpoint Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Table Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredJobs.map((job, index) => {
            const jobType = getJobType(job);
            const isFirstRow = index === 0;
            const isLastRow = index === filteredJobs.length - 1;
            const forceDirection = isFirstRow ? 'bottom' : isLastRow ? 'top' : 'auto';
            
            return (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {job.endpoint_name ?? 'Unnamed Endpoint'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {job.id?.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded ${
                    jobType === 'push' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {jobType.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {job.table_name ?? 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status ?? 'exported')}`}>
                    {getStatusLabel(job.status ?? 'exported')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.created_at
                    ? new Date(job.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="relative actions-dropdown">
                      <button
                        onClick={() => { setOpenDropdown(openDropdown === job.id ? null : job.id); }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Actions"
                      >
                        <MoreVertical size={18} className="text-gray-600" />
                      </button>

                      {openDropdown === job.id && (
                        <DropdownMenuWithAutoDirection
                          forceDirection={forceDirection}
                          onClose={() => { setOpenDropdown(null); }}
                        >
                          <button
                            onClick={() => {
                              setOpenDropdown(null);
                              onViewDetails?.(job.id);
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

export default ExportedDEJobList;
