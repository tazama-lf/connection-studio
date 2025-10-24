import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, EditIcon, EyeIcon, XIcon, MoreVerticalIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import type { ScheduleResponse } from '../../data-enrichment/types';
import { useToast } from '../../../shared/providers/ToastProvider';
import { UI_CONFIG } from '../../../shared/config/app.config';
import { DropdownMenuWithAutoDirection } from '../../../shared/components/DropdownMenuWithAutoDirection';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isEditor } from '../../../utils/roleUtils';

interface CronJobListProps {
  searchTerm?: string;
}

export const CronJobList: React.FC<CronJobListProps> = ({ searchTerm = '' }) => {
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
  const [isEditJobSaved, setIsEditJobSaved] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(UI_CONFIG.pagination.defaultPageSize);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { user } = useAuth();
  const userIsEditor = user?.claims ? isEditor(user.claims) : false;

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
    setIsEditJobSaved(false);
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
        end_date: schedule.end_date || undefined,
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
      setIsEditJobSaved(true);
      loadSchedules();
    } catch (err) {
      console.error('Failed to update schedule:', err);
      showError('Failed to update schedule');
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      showSuccess('Cron job submitted for approval successfully!');
      setEditModalOpen(false);
      setSelectedSchedule(null);
      setIsEditJobSaved(false);
    } catch (error) {
      console.error('Failed to submit for approval:', error);
      showError('Failed to submit for approval. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return <div data-id="element-116">
      <div className="shadow overflow-hidden rounded-lg border border-gray-200" data-id="element-120">
        <table className="min-w-full" data-id="element-121">
          <thead className="bg-gray-50" data-id="element-122">
            <tr data-id="element-123">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" data-id="element-124">
                Schedule Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" data-id="element-125">
                CRON Expression
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" data-id="element-128">
                Iterations
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" data-id="element-129">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
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
                  <tr key={schedule.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {schedule.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule.cron}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {schedule.iterations} iterations
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(schedule.start_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(schedule.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center">
                        {/* Actions dropdown with three-dot menu */}
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === schedule.id ? null : schedule.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </button>
                          {openDropdown === schedule.id && (
                            <DropdownMenuWithAutoDirection onClose={() => setOpenDropdown(null)}>
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    handleView(schedule);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <EyeIcon className="w-4 h-4 mr-2" />
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    handleEdit(schedule);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <EditIcon className="w-4 h-4 mr-2" />
                                  Edit
                                </button>
                                {!userIsEditor && (
                                  <>
                                    {schedule.schedule_status === 'active' ? (
                                      <button
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          handleToggleStatus(schedule);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <PauseIcon className="w-4 h-4 mr-2" />
                                        Deactivate
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
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
            >
              Next →
            </button>
          </div>
        </div>
      )}

    {/* View Modal */}
    {viewModalOpen && selectedSchedule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Enhanced blurred backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
          onClick={() => setViewModalOpen(false)}
        />
        
        {/* Modal Content */}
        <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Schedule Details</h3>
            <button 
              onClick={() => setViewModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Name
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {selectedSchedule.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CRON Expression
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 font-mono">
                  {selectedSchedule.cron}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. of Iterations
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {selectedSchedule.iterations}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {formatDate(selectedSchedule.start_date)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                  {formatDate(selectedSchedule.end_date)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedSchedule.schedule_status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSchedule.schedule_status}
                  </span>
                </div>
              </div>
              {selectedSchedule.next_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Run
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                    {formatDate(selectedSchedule.next_time)}
                  </div>
                </div>
              )}
            </div>
            
            {selectedSchedule.created_at && (
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created At
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900">
                    {formatDate(selectedSchedule.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setViewModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal */}
    {editModalOpen && selectedSchedule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Enhanced blurred backdrop */}
        <div 
          className="fixed inset-0 backdrop-blur-sm backdrop-saturate-150 z-40" 
          onClick={() => setEditModalOpen(false)}
        />
        
        {/* Modal Content */}
        <div className="relative z-50 p-5 border w-full max-w-2xl shadow-2xl rounded-lg bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Edit Schedule</h3>
            <button 
              onClick={() => setEditModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XIcon size={20} />
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter job name" 
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
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="e.g., 45 * * * * *" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. of Iterations <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    value={editForm.iterations}
                    onChange={(e) => setEditForm({ ...editForm, iterations: parseInt(e.target.value) || 1 })}
                    min="1" 
                    step="1" 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter number of iterations" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    value={editForm.start_date ? new Date(editForm.start_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    required
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
            </div>

            <div className="mt-6 flex justify-between space-x-3">
              <button 
                type="button" 
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
                {isEditJobSaved && (
                  <button 
                    type="button"
                    onClick={handleSubmitForApproval}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>;
};


export default CronJobList;
