import React, { useState } from 'react';
import { Button } from './Button';
import { MoreVerticalIcon, ClockIcon, PlayIcon, PauseIcon, HistoryIcon, EyeIcon, CheckCircleIcon, DownloadIcon, UploadIcon, CopyIcon } from 'lucide-react';
import { EndpointHistoryModal } from './EndpointHistoryModal';
import { configApi } from '../../features/config/services/configApi';
import { useToast } from '../providers/ToastProvider';
interface Endpoint {
  id: number;
  path: string;
  createdOn: string;
  lastUpdated: string;
  status: 'In-Progress' | 'Ready for Approval' | 'Suspended' | 'Cloned' | 'IN_PROGRESS' | 'SUSPENDED';
  tenantId: string;
  workflowStatus?: 'active' | 'paused';
  type?: 'Push' | 'Pull';
}
interface EndpointTableProps {
  endpoints: Endpoint[];
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onClone?: (id: number) => void;
  onStatusUpdate?: () => void; // Callback to refresh data after status changes
  showStatusColumn?: boolean;
  createdTimeLabel?: string;
  showTypeColumn?: boolean;
  showActionsColumn?: boolean;
}
 const EndpointTable: React.FC<EndpointTableProps> = ({
  endpoints,
  onView,
  onEdit,
  onDelete: _onDelete,
  onClone,
  onStatusUpdate,
  showStatusColumn = true,
  createdTimeLabel = 'Created Time',
  showTypeColumn = false,
  showActionsColumn = true
}) => {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<number | null>(null);
  const { showSuccess, showError } = useToast();
  const getStatusColor = (status: Endpoint['status']) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'ready for approval':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'cloned':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusIcon = (status: Endpoint['status']) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'ready for approval':
        return <CheckCircleIcon size={12} className="mr-1" data-id="element-750" />;
      case 'in-progress':
      case 'in_progress':
        return <ClockIcon size={12} className="mr-1" data-id="element-751" />;
      case 'suspended':
        return <PauseIcon size={12} className="mr-1" data-id="element-752" />;
      case 'cloned':
        return <CopyIcon size={12} className="mr-1" data-id="element-753" />;
      default:
        return null;
    }
  };
  const getTypeIcon = (type?: 'Push' | 'Pull') => {
    switch (type) {
      case 'Push':
        return <UploadIcon size={14} className="mr-1 text-blue-500" data-id="element-754" />;
      case 'Pull':
        return <DownloadIcon size={14} className="mr-1 text-purple-500" data-id="element-755" />;
      default:
        return null;
    }
  };
  const handleAction = async (action: string, endpoint: Endpoint) => {
    try {
      switch (action) {
        case 'view':
          onView(endpoint.id);
          break;
        case 'edit':
          onEdit(endpoint.id);
          break;
        case 'history':
          setShowHistory(endpoint.id);
          break;
        case 'approve':
          console.log('Approve endpoint', endpoint.id);
          break;
        case 'suspend':
          setIsUpdatingStatus(endpoint.id);
          await configApi.updateConfigStatus(endpoint.id, 'SUSPENDED');
          showSuccess('Configuration suspended successfully');
          if (onStatusUpdate) {
            onStatusUpdate();
          }
          break;
        case 'resume':
          setIsUpdatingStatus(endpoint.id);
          await configApi.updateConfigStatus(endpoint.id, 'IN_PROGRESS');
          showSuccess('Configuration resumed successfully');
          if (onStatusUpdate) {
            onStatusUpdate();
          }
          break;
        case 'clone':
          if (onClone) {
            onClone(endpoint.id);
          }
          break;
        default:
          console.log('Action:', action, 'Endpoint:', endpoint.id);
      }
    } catch (error) {
      console.error('Action failed:', error);
      showError(`Failed to ${action} configuration`);
    } finally {
      setIsUpdatingStatus(null);
      setActiveDropdown(null);
    }
  };
  return <div className="overflow-x-auto bg-white rounded-lg shadow" data-id="element-756">
      <table className="min-w-full divide-y divide-gray-200" data-id="element-757">
        <thead className="bg-gray-50" data-id="element-758">
          <tr data-id="element-759">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-760">
              Endpoint Path
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-761">
              Tenant ID
            </th>
            {showTypeColumn && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-762">
                Type
              </th>}
            {showStatusColumn && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-763">
                Status
              </th>}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-764">
              {createdTimeLabel}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-id="element-765">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200" data-id="element-766">
          {endpoints.length > 0 ? endpoints.map(endpoint => <tr key={endpoint.id} className="hover:bg-gray-50" data-id="element-767">
                <td className="px-6 py-4 whitespace-nowrap text-sm" data-id="element-768">
                  <div className="flex items-center" data-id="element-769">
                    <span className="font-medium text-gray-900" data-id="element-770">
                      {endpoint.path}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-771">
                  <div className="flex items-center" data-id="element-772">
                    <span className="font-medium" data-id="element-773">
                      {endpoint.tenantId || 'default'}
                    </span>
                  </div>
                </td>
                {showTypeColumn && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-774">
                    <div className="flex items-center" data-id="element-775">
                      {getTypeIcon(endpoint.type)}
                      <span className="font-medium" data-id="element-776">
                        {endpoint.type || 'N/A'}
                      </span>
                    </div>
                  </td>}
                {showStatusColumn && <td className="px-6 py-4 whitespace-nowrap" data-id="element-777">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(endpoint.status)}`} data-id="element-778">
                      {getStatusIcon(endpoint.status)}
                      {endpoint.status}
                    </span>
                  </td>}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-779">
                  <div className="flex items-center" data-id="element-780">
                    <ClockIcon size={16} className="mr-1 text-gray-400" data-id="element-781" />
                    {new Date(endpoint.createdOn).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-id="element-782">
                  <div className="flex items-center space-x-2" data-id="element-783">
                    {showActionsColumn && <div className="relative" data-id="element-786">
                        <Button variant="danger" size="sm" onClick={() => { setActiveDropdown(activeDropdown === endpoint.id ? null : endpoint.id); }} icon={<MoreVerticalIcon size={14} data-id="element-788" />} data-id="element-787">
                          Actions
                        </Button>
                        {activeDropdown === endpoint.id && <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10" data-id="element-789">
                            <div className="py-1" role="menu" data-id="element-790">
                              <button onClick={async () => { await handleAction('view', endpoint); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-id="element-791">
                                <EyeIcon size={14} className="mr-2" data-id="element-792" />
                                View Configuration
                              </button>
                              
                              {/* Edit and Clone - Only available for non-suspended items */}
                              {endpoint.status?.toLowerCase() !== 'suspended' && (
                                <>
                                  <button onClick={async () => { await handleAction('edit', endpoint); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-id="element-793">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit Configuration
                                  </button>
                                  <button onClick={async () => { await handleAction('clone', endpoint); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" data-id="element-799">
                                    <CopyIcon size={14} className="mr-2" data-id="element-800" />
                                    Clone Configuration
                                  </button>
                                </>
                              )}
                              {/* Suspend/Resume buttons */}
                              {endpoint.status?.toLowerCase() === 'suspended' ? (
                                <button 
                                  onClick={async () => { await handleAction('resume', endpoint); }} 
                                  disabled={isUpdatingStatus === endpoint.id}
                                  className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                    isUpdatingStatus === endpoint.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                  }`}
                                  data-id="element-793"
                                >
                                  <PlayIcon size={14} className="mr-2" data-id="element-794" />
                                  {isUpdatingStatus === endpoint.id ? 'Resuming...' : 'Resume Endpoint'}
                                </button>
                              ) : (
                                <button 
                                  onClick={async () => { await handleAction('suspend', endpoint); }}
                                  disabled={isUpdatingStatus === endpoint.id}
                                  className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 ${
                                    isUpdatingStatus === endpoint.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                                  }`}
                                  data-id="element-795"
                                >
                                  <PauseIcon size={14} className="mr-2" data-id="element-796" />
                                  {isUpdatingStatus === endpoint.id ? 'Suspending...' : 'Suspend Endpoint'}
                                </button>
                              )}
                              {(endpoint.status?.toLowerCase() === 'in-progress' || endpoint.status?.toLowerCase() === 'in_progress') && (
                                <button 
                                  onClick={async () => { await handleAction('approve', endpoint); }} 
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                                  data-id="element-797"
                                >
                                  <CheckCircleIcon size={14} className="mr-2" data-id="element-798" />
                                  Submit for Approval
                                </button>
                              )}
                            </div>
                          </div>}
                      </div>}
                  </div>
                </td>
              </tr>) : <tr data-id="element-801">
              <td colSpan={showStatusColumn ? showTypeColumn ? 6 : 5 : showTypeColumn ? 5 : 4} className="px-6 py-4 text-center text-sm text-gray-500" data-id="element-802">
                No endpoints found
              </td>
            </tr>}
        </tbody>
      </table>
      {showHistory !== null && <EndpointHistoryModal endpointId={showHistory} onClose={() => { setShowHistory(null); }} data-id="element-803" />}
    </div>;
};
export default EndpointTable;