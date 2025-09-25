import React, { useState, useEffect } from 'react';
import { PlayIcon, PauseIcon, EditIcon, TrashIcon, EyeIcon } from 'lucide-react';
import SearchBar from '../../../shared/components/SearchBar';
import { dataEnrichmentApi } from '../../data-enrichment/services/enrichmentApi';
import type { DataEnrichmentJobResponse, ScheduleResponse } from '../../data-enrichment/types';
export const CronJobList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<DataEnrichmentJobResponse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load jobs and schedules on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load both jobs and schedules to show schedule details
        const [jobsData, schedulesData] = await Promise.all([
          dataEnrichmentApi.getAllJobs(),
          dataEnrichmentApi.getAllSchedules()
        ]);
        
        setJobs(jobsData.jobs || []);
        setSchedules(schedulesData || []);
      } catch (err) {
        console.error('Failed to load jobs:', err);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper function to get schedule details for a job
  const getScheduleForJob = (scheduleId: number) => {
    return schedules.find(schedule => schedule.id === scheduleId);
  };

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job =>
    job.endpoint_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.source_type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return <div data-id="element-116">
      <div className="flex justify-between items-center mb-6" data-id="element-117">
        <h2 className="text-xl font-semibold text-gray-800" data-id="element-118">
          Manage CRON Jobs
        </h2>
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search jobs..." data-id="element-119" />
      </div>
      <div className="bg-white shadow overflow-hidden rounded-md" data-id="element-120">
        <table className="min-w-full divide-y divide-gray-200" data-id="element-121">
          <thead className="bg-gray-50" data-id="element-122">
            <tr data-id="element-123">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-124">
                Job Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-125">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-126">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-127">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-128">
                Schedule Name
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
                  Loading jobs...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No jobs found
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => {
                const schedule = getScheduleForJob(job.schedule_id);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {job.endpoint_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule?.cron || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {job.config_type.toLowerCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        job.job_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        job.job_status === 'IN-PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        job.job_status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.job_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {schedule?.name || 'No Schedule'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-gray-500 hover:text-gray-700" title="View Details">
                          <EyeIcon size={16} />
                        </button>
                        <button className="text-blue-500 hover:text-blue-700" title="Edit Job">
                          <EditIcon size={16} />
                        </button>
                        {job.job_status === 'IN-PROGRESS' ? (
                          <button className="text-yellow-500 hover:text-yellow-700" title="Pause Job">
                            <PauseIcon size={16} />
                          </button>
                        ) : (
                          <button className="text-green-500 hover:text-green-700" title="Start Job">
                            <PlayIcon size={16} />
                          </button>
                        )}
                        <button className="text-red-500 hover:text-red-700" title="Delete Job">
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>;
};