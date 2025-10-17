import React, { useState } from 'react';
import { HelpCircleIcon } from 'lucide-react';
import { dataEnrichmentApi } from '../../data-enrichment/services';
import { useToast } from '../../../shared/providers/ToastProvider';

interface CronJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
}

export const CronJobForm: React.FC<CronJobFormProps> = ({ onJobCreated, onCancel }) => {
  const [jobName, setJobName] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [iterations, setIterations] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  // Validation function to check if all required fields are filled
  const isFormValid = () => {
    return jobName.trim() !== '' && cronExpression.trim() !== '' && iterations >= 1 && startDate.trim() !== '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobName.trim() || !cronExpression.trim() || !startDate.trim()) {
      showError('Please provide job name, CRON expression, and start date to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create schedule using data-enrichment-service API
      const scheduleData: any = {
        name: jobName.trim(),
        cron: cronExpression.trim(),
        iterations: iterations,
        start_date: startDate,
      };
      
      // Add end_date only if provided
      if (endDate.trim()) {
        scheduleData.end_date = endDate;
      }
      
      const response = await dataEnrichmentApi.createSchedule(scheduleData);

      console.log('Schedule created successfully:', response);

      // Show success message using the job name from the form
      const scheduleName = jobName.trim();
      
      // Reset form
      setJobName('');
      setCronExpression('');
      setIterations(1);
      setStartDate('');
      setEndDate('');
      
      showSuccess(`Schedule "${scheduleName}" created successfully!`);
      onJobCreated?.();
      
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'We encountered an issue while creating your schedule. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = 'The CRON expression or job details are invalid. Please check your input and try again.';
      } else if (error?.response?.status === 409) {
        errorMessage = 'A schedule with this name already exists. Please choose a different name.';
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        errorMessage = 'You do not have permission to create schedules. Please contact your administrator.';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Our service is temporarily unavailable. Please try again in a few minutes.';
      } else if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
        errorMessage = 'Unable to connect to the service. Please check your internet connection and try again.';
      }
      
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div data-id="element-70">
      <h2 className="text-xl font-semibold text-gray-800 mb-6" data-id="element-71">
        Create New CRON Job
      </h2>

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input 
              type="datetime-local" 
              id="startDate" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date <span className="text-gray-400">(Optional)</span>
            </label>
            <input 
              type="datetime-local" 
              id="endDate" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
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