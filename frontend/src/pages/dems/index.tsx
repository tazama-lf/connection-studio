import React, { useState } from 'react';
import { ConfigList } from '@features/config/components/ConfigList';
import VersionHistoryModal from '@features/config/components/VersionHistoryModal';
import { Button } from '@shared/components/Button';
import { PlusIcon, SearchIcon, AlertTriangleIcon, ChevronLeft } from 'lucide-react';
import EditEndpointModal from '@shared/components/EditEndpointModal';
import ValidationLogsTable from '@shared/components/ValidationLogsTable';
import type { Config } from '@features/config/index';
import CustomTable from '@common/Tables/CustomTable';
import { useNavigate } from 'react-router';

// DEMS Module now uses real backend configurations instead of mock data
const DEMSModule: React.FC = () => {
  const navigate = useNavigate();
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(
    null,
  );
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInCloneMode, setIsInCloneMode] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const handleAddNew = () => {
    setEditingEndpointId(-1);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setIsInCloneMode(false); // Reset clone mode
    setIsReadOnly(false); // Reset read-only mode
    // Refresh the config list when modal closes
    setRefreshKey((prev) => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey((prev) => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    // Open EditEndpointModal in read-only mode for viewing
    setEditingEndpointId(config.id);
    setIsReadOnly(true);
  };

  const handleEditConfig = (config: Config) => {
    // Open EditEndpointModal in edit mode
    setEditingEndpointId(config.id);
    setIsReadOnly(false);
  };

  const handleCloneConfig = (config: Config) => {
    // Set the editing ID to trigger EditEndpointModal with clone mode
    setEditingEndpointId(config.id);
    setIsInCloneMode(true);
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
      {/* <AuthHeader
        title="Dynamic Endpoint Monitoring Service"
        showBackButton={true}
      /> */}

      <div className=" mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
      <Button variant='primary' className='py-1 pl-2' onClick={()=>navigate(-1)}><ChevronLeft size={20} /> <span>Go Back</span></Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center my-8 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <h1 className="text-2xl font-bold text-gray-800">
              Dynamic Endpoint Monitoring Service
            </h1>
          </div>
          <Button onClick={handleAddNew} icon={<PlusIcon size={16} />}>
            Create New Connection
          </Button>
        </div>

        {/* Content Section */}
        {showValidationLogs ? (
          <ValidationLogsTable />
        ) : (
          <ConfigList
            key={refreshKey}
            searchTerm={searchTerm}
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
