import React, { useState } from 'react';
import { PlayIcon, PauseIcon, EditIcon, TrashIcon, EyeIcon } from 'lucide-react';
import SearchBar from '../../shared/components/SearchBar';
export const CronJobList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // Sample data for jobs
  const jobs = [{
    id: 1,
    name: 'Daily Data Backup',
    schedule: '0 0 * * *',
    department: 'IT',
    type: 'pull',
    status: 'active',
    nextRun: '2023-11-15 00:00:00'
  }, {
    id: 2,
    name: 'Weekly Report Generation',
    schedule: '0 9 * * 1',
    department: 'Finance',
    type: 'push',
    status: 'active',
    nextRun: '2023-11-13 09:00:00'
  }, {
    id: 3,
    name: 'Monthly Analytics Sync',
    schedule: '0 12 1 * *',
    department: 'Marketing',
    type: 'pull',
    status: 'paused',
    nextRun: '2023-12-01 12:00:00'
  }];
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
                Next Run
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-129">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200" data-id="element-130">
            {jobs.map(job => <tr key={job.id} className="hover:bg-gray-50" data-id="element-131">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-id="element-132">
                  {job.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-133">
                  {job.schedule}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize" data-id="element-134">
                  {job.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap" data-id="element-135">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} data-id="element-136">
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-137">
                  {job.nextRun}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" data-id="element-138">
                  <div className="flex justify-end space-x-2" data-id="element-139">
                    <button className="text-gray-500 hover:text-gray-700" data-id="element-140">
                      <EyeIcon size={16} data-id="element-141" />
                    </button>
                    <button className="text-blue-500 hover:text-blue-700" data-id="element-142">
                      <EditIcon size={16} data-id="element-143" />
                    </button>
                    {job.status === 'active' ? <button className="text-yellow-500 hover:text-yellow-700" data-id="element-144">
                        <PauseIcon size={16} data-id="element-145" />
                      </button> : <button className="text-green-500 hover:text-green-700" data-id="element-146">
                        <PlayIcon size={16} data-id="element-147" />
                      </button>}
                    <button className="text-red-500 hover:text-red-700" data-id="element-148">
                      <TrashIcon size={16} data-id="element-149" />
                    </button>
                  </div>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
};