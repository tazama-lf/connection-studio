import { ChevronLeft, PlusIcon, ClockIcon } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../shared/components/Button';
import { CronJobList } from '../components/CronJobList';
import { CronJobModal } from '../components/CronJobModal';
import { useAuth } from '../../auth/contexts/AuthContext';
import { isEditor } from '../../../utils/common/roleUtils';

const CRONModule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditorRole = user?.claims ? isEditor(user.claims) : false;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const handleJobCreated = (): void => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          data-testid="button-go-back"
          onClick={() => {
            navigate(-1);
          }}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ClockIcon size={28} style={{ color: '#f59e0b' }} />
              Cron Job Module
            </h1>
          </div>

          {isEditorRole && (
            <Button
              onClick={handleCreateNew}
              icon={<PlusIcon size={16} />}
              data-testid="button-create-new"
            >
              Create New Cron Job
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <CronJobList key={refreshKey} />
        </div>
      </div>

      {isEditorRole && (
        <CronJobModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onJobCreated={handleJobCreated}
        />
      )}
    </div>
  );
};

export default CRONModule;
