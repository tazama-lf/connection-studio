import React from 'react';
import { XIcon, GitCommitIcon, CheckCircleIcon } from 'lucide-react';
interface EndpointHistoryModalProps {
  endpointId: number;
  onClose: () => void;
}
interface VersionHistory {
  version: string;
  date: string;
  status: 'deployed' | 'withdrawn' | 'development';
  changes: string[];
  author: string;
}
export const EndpointHistoryModal: React.FC<EndpointHistoryModalProps> = ({
  endpointId: _endpointId,
  onClose
}) => {
  // Sample version history data
  const versionHistory: VersionHistory[] = [{
    version: 'v2',
    date: '2023-11-10',
    status: 'development',
    changes: ['Updated schema validation', 'Added new field mappings', 'Enhanced error handling'],
    author: 'John Doe'
  }, {
    version: 'v1',
    date: '2023-10-15',
    status: 'deployed',
    changes: ['Initial implementation', 'Basic field mappings', 'Standard validation rules'],
    author: 'Jane Smith'
  }];
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-id="element-1053">
    {/* Blurred backdrop */}
    <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
    <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden relative z-10" data-id="element-1054">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200" data-id="element-1055">
        <h2 className="text-xl font-semibold text-gray-800" data-id="element-1056">
          Version History
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" data-id="element-1057">
          <XIcon size={24} data-id="element-1058" />
        </button>
      </div>
      <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]" data-id="element-1059">
        <div className="relative" data-id="element-1060">
          {versionHistory.map((version, index) => <div key={version.version} className="relative pb-8" data-id="element-1061">
            {index < versionHistory.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" data-id="element-1062" />}
            <div className="relative flex items-start" data-id="element-1063">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 ring-8 ring-white" data-id="element-1064">
                <GitCommitIcon size={16} className="text-blue-600" data-id="element-1065" />
              </div>
              <div className="ml-4 flex-1" data-id="element-1066">
                <div className="flex items-center justify-between" data-id="element-1067">
                  <h3 className="text-lg font-medium text-gray-900" data-id="element-1068">
                    {version.version}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${version.status === 'deployed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} data-id="element-1069">
                    {version.status === 'deployed' && <CheckCircleIcon size={12} className="mr-1" data-id="element-1070" />}
                    {version.status.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500" data-id="element-1071">
                  Released on {version.date} by {version.author}
                </p>
                <div className="mt-2 space-y-1" data-id="element-1072">
                  {version.changes.map((change, i) => <p key={i} className="text-sm text-gray-600" data-id="element-1073">
                    • {change}
                  </p>)}
                </div>
              </div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
};