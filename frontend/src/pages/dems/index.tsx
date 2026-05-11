import { ConfigList } from '@features/config/components/ConfigList';
import VersionHistoryModal from '@features/config/components/VersionHistoryModal';
import type { Config } from '@features/config/index';
import { Button } from '@shared/components/Button';
import EditEndpointModal from '@shared/components/EditEndpointModal';
import ValidationLogsTable from '@shared/components/ValidationLogsTable';
import { useToast } from '@shared/providers/ToastProvider';
import { ActivityIcon, ChevronLeft, PlusIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

// DEMS Module now uses real backend configurations instead of mock data
const DEMSModule: React.FC = () => {
  const navigate = useNavigate();
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
  const [showValidationLogs] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInCloneMode, setIsInCloneMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isCloneCheck, setIsCloneCheck] = useState(false);

  useToast();

  // Disable body scroll when any modal is open
  useEffect(() => {
    if (
      editingEndpointId !== null ||
      showVersionHistoryModal
    ) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingEndpointId, showVersionHistoryModal]);

  const handleAddNew = () => {
    setEditingEndpointId(-1);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setIsInCloneMode(false);
    setIsCloneCheck(false);
    setIsReadOnly(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfigSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    setEditingEndpointId(config.id);
    setIsReadOnly(true);
  };

  const handleEditConfig = (config: Config) => {
    // Open EditEndpointModal in edit mode
    setEditingEndpointId(config.id);
    setIsReadOnly(false);
    setIsCloneCheck(false); // Ensure clone check is false for edit mode
  };

  const handleCloneConfig = (config: Config) => {
    // Set the editing ID to trigger EditEndpointModal with clone mode
    setEditingEndpointId(config.id);
    setIsInCloneMode(true);
    setIsCloneCheck(true);
  };

  const handleViewHistory = (config: Config) => {
    setSelectedConfig(config);
    setShowVersionHistoryModal(true);
  };

  const handleCloseVersionHistoryModal = () => {
    setShowVersionHistoryModal(false);
    setSelectedConfig(null);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className=" mx-auto px-4 sm:px-6 lg:px-12 py-[52px]">
        <Button
          variant="primary"
          className="py-1 pl-2"
          onClick={async () => { await navigate(-1); }}
        >
          <ChevronLeft size={20} /> <span>Go Back</span>
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1
              className="text-3xl font-bold flex items-center gap-2"
              style={{ color: '#3b3b3b' }}
            >
              <ActivityIcon size={28} style={{ color: '#3b82f6' }} />
              Dynamic Event Monitoring Service
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleAddNew} icon={<PlusIcon size={16} />}>
              Create New Connection
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {showValidationLogs ? (
          <ValidationLogsTable />
        ) : (
          <ConfigList
            key={refreshKey}
            onViewDetails={handleViewDetails}
            onConfigEdit={handleEditConfig}
            onConfigClone={handleCloneConfig}
            onViewHistory={handleViewHistory}
            onRefresh={handleRefresh}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      {editingEndpointId !== null && (
        <EditEndpointModal
          isOpen={editingEndpointId !== null}
          onClose={handleCloseModal}
          endpointId={editingEndpointId}
          onSuccess={handleConfigSuccess}
          isCloneMode={isInCloneMode}
          isCloneCheck={isCloneCheck}
          setIsInCloneMode={setIsInCloneMode}
          readOnly={isReadOnly}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && selectedConfig && (
        <VersionHistoryModal
          isOpen={showVersionHistoryModal}
          onClose={handleCloseVersionHistoryModal}
          config={selectedConfig}
        />
      )}

    </div>
  );
};

export default DEMSModule;

