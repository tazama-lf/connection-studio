import React, { useState } from 'react';
import { CronJobList } from '../components/CronJobList';
import { CronJobModal } from '../components/CronJobModal';
import { Button } from '../../../shared/components/Button';
import { ChevronLeft, PlusIcon, SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

const CRONModule: React.FC = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button variant='primary' className='py-1 pl-2' onClick={()=>navigate(-1)}><ChevronLeft size={20} /> <span>Go Back</span></Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1 className="text-2xl font-bold text-gray-800">
              CRONS Module
            </h1>
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