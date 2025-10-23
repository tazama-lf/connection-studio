import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, EditIcon, EyeIcon, XIcon, ChevronDownIcon } from 'lucide-react';
import SearchBar from '../../../shared/components/SearchBar';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { Button } from '../../../shared/components/Button';
import { UI_CONFIG } from '../../../shared/config/app.config';

export const CronJobList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleResponse | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    cron: '',
    iterations: 1,
    start_date: '',
    end_date: '',
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Load schedules on component mount
  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const schedulesData = await dataEnrichmentApi.getAllSchedules(1, 1000);
      setSchedules(schedulesData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load schedules. Please try again.');
      showError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
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

  // Reset to first page if current page is beyond available pages
  useEffect(() => {
    if (currentPage > Math.ceil(totalFilteredItems / itemsPerPage) && totalFilteredItems > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredItems, currentPage, itemsPerPage]);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Handle view schedule
  const handleView = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setViewModalOpen(true);
  };

  // Handle edit schedule
  const handleEdit = (schedule: ScheduleResponse) => {
    setSelectedSchedule(schedule);
    setEditForm({
      name: schedule.name,
      cron: schedule.cron,
      iterations: schedule.iterations,
      start_date: schedule.start_date || '',
      end_date: schedule.end_date || '',
    });
    setEditModalOpen(true);
  };

  // Handle pause/activate toggle
  const handleToggleStatus = async (schedule: ScheduleResponse) => {
    try {
      const newStatus = schedule.schedule_status === 'active' ? 'in-active' : 'active';
      
      // Send the full schedule data with updated status
      await dataEnrichmentApi.updateSchedule(schedule.id, {
        name: schedule.name,
        cron: schedule.cron,
        iterations: schedule.iterations,
        schedule_status: newStatus,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
      });
      
      showSuccess(`Schedule ${newStatus === 'active' ? 'activated' : 'de-activated'} successfully`);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule status:', err);
      showError('Failed to update schedule status');
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!selectedSchedule) return;

    try {
      await dataEnrichmentApi.updateSchedule(selectedSchedule.id, editForm);
      
      showSuccess('Schedule updated successfully');
      setEditModalOpen(false);
      setSelectedSchedule(null);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      showError('Failed to update schedule');
    }
  };

  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-127">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-128">
                Iterations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-129">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading schedules...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No schedules found
                </td>
              </tr>
            ) : (
              paginatedSchedules.map(schedule => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 
                    py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {schedule.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.cron}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(schedule.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(schedule.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <button
                          onClick={() => handleView(schedule)}
                          className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </button>
                        <div className="relative dropdown-container" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="px-3 py-1.5 flex items-center text-sm font-medium"
                            onClick={() => {
                              setOpenDropdown(openDropdown === schedule.id ? null : schedule.id);
                            }}
                          >
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-1" />
                          </Button>
                          
                          {/* Dropdown Menu */}
                          {openDropdown === schedule.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    handleEdit(schedule);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <EditIcon className="w-4 h-4 mr-2" />
                                  Edit Schedule
                                </button>
                                {schedule.schedule_status === 'active' ? (
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      handleToggleStatus(schedule);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <PauseIcon className="w-4 h-4 mr-2" />
                                    Deactivate Schedule
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      handleToggleStatus(schedule);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <PlayIcon className="w-4 h-4 mr-2" />
                                    Activate Schedule
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFilteredItems > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredItems)} of {totalFilteredItems} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

    {/* View Modal */}
    {viewModalOpen && selectedSchedule && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Schedule Details</h3>
            <button 
              onClick={() => setViewModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-sm text-gray-900">{selectedSchedule.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">CRON Expression</label>
              <p className="text-sm text-gray-900 font-mono">{selectedSchedule.cron}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedSchedule.schedule_status === 'active' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedSchedule.schedule_status}
                </span>
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Iterations</label>
              <p className="text-sm text-gray-900">{selectedSchedule.iterations}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Start Date</label>
              <p className="text-sm text-gray-900">{formatDate(selectedSchedule.start_date)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="text-sm text-gray-900">{formatDate(selectedSchedule.end_date)}</p>
            </div>
            
            {selectedSchedule.next_time && (
              <div>
                <label className="text-sm font-medium text-gray-500">Next Run</label>
                <p className="text-sm text-gray-900">{formatDate(selectedSchedule.next_time)}</p>
              </div>
            )}
            
            {selectedSchedule.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm text-gray-900">{formatDate(selectedSchedule.created_at)}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => setViewModalOpen(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    {editModalOpen && selectedSchedule && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Schedule</h3>
            <button 
              onClick={() => setEditModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CRON Expression <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.cron}
                onChange={(e) => setEditForm({ ...editForm, cron: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="e.g., 45 * * * * *"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Iterations <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={editForm.iterations}
                onChange={(e) => setEditForm({ ...editForm, iterations: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={editForm.start_date ? new Date(editForm.start_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={editForm.end_date ? new Date(editForm.end_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => setEditModalOpen(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}
    </div>;
};


export default CronJobList;
