import { ChevronLeft, PlusIcon, Database } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../shared/components/Button';
import { DataEnrichmentJobList } from '../components/DataEnrichmentJobList';
import { DataEnrichmentJobModal } from '../components/DataEnrichmentJobModal';

const DataEnrichmentModule: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const handleJobCreated = (): void => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
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
              <Database size={28} style={{ color: '#10b981' }} />
              Data Enrichment Module
            </h1>
          </div>

          <Button onClick={handleCreateNew} icon={<PlusIcon size={16} />}>
            Create New Data Enrichment Job
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <DataEnrichmentJobList key={refreshKey} searchTerm={searchTerm} />
        </div>
      </div>

      <DataEnrichmentJobModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onJobCreated={handleJobCreated}
      />
    </div>
  );
};

export default DataEnrichmentModule;
