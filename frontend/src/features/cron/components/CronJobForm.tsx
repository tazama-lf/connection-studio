import React, { useState } from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services/enrichmentApi';

interface CronJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
}

export const CronJobForm: React.FC<CronJobFormProps> = ({ onJobCreated, onCancel }) => {
  const [jobName, setJobName] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [iterations, setIterations] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!jobName.trim() || !cronExpression.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await dataEnrichmentApi.createSchedule({
        name: jobName.trim(),
        cron: cronExpression.trim(),
        iterations: iterations,
      });

      // Reset form
      setJobName('');
      setCronExpression('');
      setIterations(1);
      
      setSuccessMessage('Schedule created successfully!');
      onJobCreated?.();
      
    } catch (error) {
      console.error('Failed to create schedule:', error);
      setError('Failed to create schedule. Please check your settings and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div data-id="element-70">
      <h2 className="text-xl font-semibold text-gray-800 mb-6" data-id="element-71">
        Create New CRON Job
      </h2>
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} data-id="element-72">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" data-id="element-73">
          <div data-id="element-74">
            <label htmlFor="jobName" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-75">
              Job Name
            </label>
            <input 
              type="text" 
              id="jobName" 
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Enter job name" 
            />
          </div>
          <div data-id="element-77">
            <div className="flex items-center justify-between mb-1" data-id="element-78">
              <label htmlFor="cronExpression" className="block text-sm font-medium text-gray-700" data-id="element-79">
                CRON Expression
              </label>
              <button type="button" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500" data-id="element-80">
                <HelpCircleIcon size={16} className="mr-1" data-id="element-81" />
                Help
              </button>
            </div>
            <input 
              type="text" 
              id="cronExpression" 
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              placeholder="e.g., 45 * * * * *" 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6" data-id="element-83">
          <div data-id="element-84">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-85">
              Start Time
            </label>
            <input type="datetime-local" id="startTime" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-86" />
          </div>
          <div data-id="element-87">
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-88">
              End Time
            </label>
            <input type="datetime-local" id="endTime" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" readOnly placeholder="Auto-calculated based on start time and CRON expression" data-id="element-89" />
          </div>
          <div data-id="element-90">
            <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-91">
              No. of Iterations
            </label>
            <input 
              type="number" 
              id="iterations" 
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
              min="1" 
              step="1" 
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Enter number of iterations" 
            />
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg mb-6" data-id="element-93">
          <h3 className="text-lg font-medium text-gray-800 mb-4" data-id="element-94">
            Pull Job Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-id="element-95">
            <div data-id="element-96">
              <label htmlFor="dataSource" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-97">
                Data Source
              </label>
              <select id="dataSource" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-98">
                <option value="" data-id="element-99">Select a data source</option>
                <option value="database" data-id="element-100">Database</option>
                <option value="api" data-id="element-101">API Endpoint</option>
                <option value="fileserver" data-id="element-102">File Server</option>
                <option value="sftp" data-id="element-103">SFTP Server</option>
                <option value="s3" data-id="element-104">S3 Bucket</option>
                <option value="cloud" data-id="element-105">Cloud Storage</option>
              </select>
            </div>
            <div data-id="element-106">
              <label htmlFor="dataFormat" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-107">
                Data Format
              </label>
              <select id="dataFormat" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" data-id="element-108">
                <option value="csv" data-id="element-109">CSV</option>
                <option value="json" data-id="element-110">JSON</option>
                <option value="xml" data-id="element-111">XML</option>
                <option value="excel" data-id="element-112">Excel</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </form>
    </div>
  );
};