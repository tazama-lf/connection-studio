import React, { useState } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { CronJobList } from '../components/CronJobList';
import { CronJobModal } from '../components/CronJobModal';
import { Button } from '../../../shared/components/Button';
import { PlusIcon, SearchIcon } from 'lucide-react';

const CRONModule: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleJobCreated = () => {
    // Refresh the job list when a new job is created
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Cron Job Management" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cron jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Create New Job Button */}
          <Button 
            onClick={handleCreateNew} 
            icon={<PlusIcon size={16} />}
          >
            Create New Cron Job
          </Button>
        </div>

        {/* Job List Table */}
        <div className="bg-white rounded-lg shadow">
          <CronJobList 
            key={refreshKey}
            searchTerm={searchTerm}
          />
        </div>
      </div>

      {/* Create Job Modal */}
      <CronJobModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
};

export default CRONModule;