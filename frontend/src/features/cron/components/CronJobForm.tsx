import React, { useState } from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services';

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

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    return jobName.trim() !== '' && cronExpression.trim() !== '' && iterations >= 1;
  };

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
      
      // Create schedule using data-enrichment-service API
      const createdSchedule = await dataEnrichmentApi.createSchedule({
        name: jobName.trim(),
        cron: cronExpression.trim(),
        iterations: iterations,
      });

      console.log('Schedule created successfully:', createdSchedule);

      // Reset form
      setJobName('');
      setCronExpression('');
      setIterations(1);
      
      setSuccessMessage(`Schedule "${createdSchedule.name}" created successfully! ID: ${createdSchedule.id}`);
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
              Job Name <span className="text-red-500">*</span>
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
                CRON Expression <span className="text-red-500">*</span>
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
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6" data-id="element-83">
          <div data-id="element-90">
            <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 mb-1" data-id="element-91">
              No. of Iterations <span className="text-red-500">*</span>
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

        <div className="flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <div 
            className="relative"
            title={!isFormValid() ? 'Please fill all required fields' : ''}
          >
            <button 
              type="submit" 
              disabled={isSubmitting || !isFormValid()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};