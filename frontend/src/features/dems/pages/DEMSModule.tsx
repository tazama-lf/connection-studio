import React, { useState, useEffect, useRef } from 'react';
import { AuthHeader } from '../../../shared/components/AuthHeader';
import { ConfigList } from '../../config/components/ConfigList';
import VersionHistoryModal from '../../config/components/VersionHistoryModal';
import { Button } from '../../../shared/components/Button';
import { PlusIcon, SearchIcon, AlertTriangleIcon, Copy, ChevronDown } from 'lucide-react';
import EditEndpointModal from '../../../shared/components/EditEndpointModal';
import ValidationLogsTable from '../../../shared/components/ValidationLogsTable';
import type { Config } from '../../config/index';
import { configApi } from '../../config/services/configApi';
// DEMS Module now uses real backend configurations instead of mock data
const DEMSModule: React.FC = () => {
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(null);
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCloneDropdown, setShowCloneDropdown] = useState(false);
  const [availableConfigs, setAvailableConfigs] = useState<Config[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [isInCloneMode, setIsInCloneMode] = useState(false);

  const handleAddNew = () => {
    setEditingEndpointId(-1);
  };

  const handleCloseModal = () => {
    setEditingEndpointId(null);
    setIsInCloneMode(false); // Reset clone mode
    // Refresh the config list when modal closes
    setRefreshKey(prev => prev + 1);
  };

  const handleConfigSuccess = () => {
    // Refresh immediately when config is saved/updated
    setRefreshKey(prev => prev + 1);
  };

  const handleViewDetails = (config: Config) => {
    // Open EditEndpointModal for viewing/editing - same workflow for both
    setEditingEndpointId(config.id);
  };

  const handleEditConfig = (config: Config) => {
    // Same as view - both use EditEndpointModal workflow
    setEditingEndpointId(config.id);
  };



  const handleViewHistory = (config: Config) => {
    setSelectedConfig(config);
    setShowVersionHistoryModal(true);
  };

  const handleCloseVersionHistoryModal = () => {
    setShowVersionHistoryModal(false);
    setSelectedConfig(null);
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all configs for clone dropdown
  const loadAvailableConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const response = await configApi.getAllConfigs();
      setAvailableConfigs(response.configs);
    } catch (error) {
      console.error('Failed to load configs for cloning:', error);
      setAvailableConfigs([]);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleCloneDropdownToggle = async () => {
    if (!showCloneDropdown) {
      await loadAvailableConfigs();
    }
    setShowCloneDropdown(!showCloneDropdown);
  };

  const handleCloneConfig = (config: Config) => {
    // Set the editing ID to trigger EditEndpointModal with clone mode
    setEditingEndpointId(config.id);
    setIsInCloneMode(true);
    setShowCloneDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCloneDropdown(false);
      }
    };

    if (showCloneDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCloneDropdown]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AuthHeader title="Dynamic Endpoint Monitoring Service" showBackButton={true} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <Button 
              variant="secondary" 
              onClick={() => setShowValidationLogs(!showValidationLogs)} 
              icon={<AlertTriangleIcon size={16} />}
            >
              Validation Logs
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleAddNew} 
              icon={<PlusIcon size={16} />}
            >
              Create New Connection
            </Button>
            
            {/* Clone Configuration Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button 
                onClick={handleCloneDropdownToggle}
                icon={<Copy size={16} />}
                variant="secondary"
              >
                Clone Configuration
                <ChevronDown size={16} className="ml-2" />
              </Button>
              
              {showCloneDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
                  {loadingConfigs ? (
                    <div className="p-4 text-center text-gray-600">Loading configurations...</div>
                  ) : availableConfigs.length === 0 ? (
                    <div className="p-4 text-center text-gray-600">No configurations available</div>
                  ) : (
                    <div className="py-2">
                      {availableConfigs.map((config) => (
                        <button
                          key={config.id}
                          onClick={() => handleCloneConfig(config)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{config.transactionType}</div>
                          <div className="text-sm text-gray-600">
                            v{config.version} • {config.msgFam}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {showValidationLogs ? (
          <ValidationLogsTable />
        ) : (
          <div className="bg-white rounded-lg shadow">
            <ConfigList
              key={refreshKey}
              searchTerm={searchTerm}
              onViewDetails={handleViewDetails}
              onConfigEdit={handleEditConfig}
              onViewHistory={handleViewHistory}
              onRefresh={handleRefresh}
            />
          </div>
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