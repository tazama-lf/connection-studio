import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, EditIcon, TrashIcon, EyeIcon } from 'lucide-react';
import SearchBar from '../../../shared/components/SearchBar';
import { Pagination } from '../../data-enrichment/components/Pagination';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import type { DataEnrichmentJobResponse, ScheduleResponse } from '../../data-enrichment/types';
export const CronJobList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);

  // Load jobs and schedules on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load schedules from data-enrichment-service
        const schedulesData = await dataEnrichmentApi.getAllSchedules(currentPage, itemsPerPage);
        setSchedules(schedulesData || []);
        
        // For now, we'll focus on schedules since jobs would need a separate API
        // that might not be implemented yet in the data-enrichment-service
        setJobs([]);
        setTotalItems(schedulesData.length || 0);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load schedules. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentPage, itemsPerPage]);

  // Helper function to get schedule details for a job
  const getScheduleForJob = (scheduleId: number) => {
    return schedules.find(schedule => schedule.id === scheduleId);
  };

  // Filter schedules based on search term
  const filteredSchedules = schedules.filter(schedule =>
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    schedule.cron.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination for filtered results
  const totalFilteredItems = filteredSchedules.length;
  const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

  // Update total items when filtered jobs change
  useEffect(() => {
    setTotalItems(totalFilteredItems);
    // Reset to first page if current page is beyond available pages
    if (currentPage > Math.ceil(totalFilteredItems / itemsPerPage) && totalFilteredItems > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredItems, currentPage, itemsPerPage]);
  return <div data-id="element-116">
      <div className="flex justify-between items-center mb-6" data-id="element-117">
        <h2 className="text-xl font-semibold text-gray-800" data-id="element-118">
          Manage Schedules
        </h2>
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search schedules..." data-id="element-119" />
      </div>
      <div className="bg-white shadow overflow-hidden rounded-md" data-id="element-120">
        <table className="min-w-full divide-y divide-gray-200" data-id="element-121">
          <thead className="bg-gray-50" data-id="element-122">
            <tr data-id="element-123">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-124">
                Schedule Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-125">
                CRON Expression
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-126">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-127">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-128">
                Iterations
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-129">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading schedules...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No schedules found
                </td>
              </tr>
            ) : (
              paginatedSchedules.map(schedule => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {schedule.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.cron}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Schedule
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        schedule.schedule_status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.schedule_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.iterations} iterations
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-gray-500 hover:text-gray-700" title="View Schedule Details">
                          <EyeIcon size={16} />
                        </button>
                        <button className="text-blue-500 hover:text-blue-700" title="Edit Schedule">
                          <EditIcon size={16} />
                        </button>
                        {schedule.schedule_status === 'active' ? (
                          <button className="text-yellow-500 hover:text-yellow-700" title="Pause Schedule">
                            <PauseIcon size={16} />
                          </button>
                        ) : (
                          <button className="text-green-500 hover:text-green-700" title="Activate Schedule">
                            <PlayIcon size={16} />
                          </button>
                        )}
                        <button className="text-red-500 hover:text-red-700" title="Delete Schedule">
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1); // Reset to first page when changing items per page
          }}
        />
      )}
    </div>;
};