import React from 'react';
import { XIcon } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: {
    id: number;
    endpointPath: string;
    versions?: Array<{
      version: string;
      status: 'DEVELOPMENT' | 'DEPLOYED';
      releaseDate: string;
      releasedBy: string;
      changes: string[];
    }>;
  };
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  if (!isOpen) return null;

  // Mock version data - in real app this would come from API
  const versions = config?.versions || [
    {
      version: 'v2',
      status: 'DEVELOPMENT' as const,
      releaseDate: '2023-11-10',
      releasedBy: 'John Doe',
      changes: [
        'Updated schema validation',
        'Added new field mappings',
        'Enhanced error handling'
      ]
    },
    {
      version: 'v1',
      status: 'DEPLOYED' as const,
      releaseDate: '2023-10-15',
      releasedBy: 'Jane Smith',
      changes: [
        'Initial implementation',
        'Basic field mappings',
        'Standard validation rules'
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DEVELOPMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DEPLOYED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <div className="space-y-6">
            {versions.map((version) => (
              <div key={version.version} className="border-l-4 border-blue-200 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {version.version}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {version.version}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(version.status)}`}>
                    {version.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  Released on {new Date(version.releaseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} by {version.releasedBy}
                </p>
                
                <div className="space-y-2">
                  {version.changes.map((change, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      <span className="text-sm text-gray-700">{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;