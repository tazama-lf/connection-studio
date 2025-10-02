import React from 'react';
import { CheckIcon, XIcon, EyeIcon, ClockIcon } from 'lucide-react';
import { Button } from '../../../shared/components/Button';

type ApprovalStatus = "Ready for Approval" | "In-Progress" | "Suspended" | "Cloned";

interface ApprovalEndpoint {
  id: number;
  path: string;
  tenantId: string;
  createdOn: string;
  lastUpdated: string;
  status: ApprovalStatus;
  createdBy?: string;
}

interface ApprovalListProps {
  endpoints: ApprovalEndpoint[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onView: (id: number) => void;
}

const getStatusBadge = (status: ApprovalStatus) => {
  const statusConfig = {
    "Ready for Approval": { color: "bg-yellow-100 text-yellow-800", icon: <ClockIcon size={14} /> },
    "In-Progress": { color: "bg-blue-100 text-blue-800", icon: <ClockIcon size={14} /> },
    "Suspended": { color: "bg-red-100 text-red-800", icon: <XIcon size={14} /> },
    "Cloned": { color: "bg-gray-100 text-gray-800", icon: <EyeIcon size={14} /> }
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
};

const ApprovalList: React.FC<ApprovalListProps> = ({ 
  endpoints, 
  onApprove, 
  onReject, 
  onView 
}) => {
  const approvalPendingEndpoints = endpoints.filter(endpoint => 
    endpoint.status === "Ready for Approval"
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Endpoints Pending Approval ({approvalPendingEndpoints.length})
        </h2>
      </div>
      
      <div className="divide-y divide-gray-200">
        {approvalPendingEndpoints.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <ClockIcon size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No endpoints pending approval</p>
          </div>
        ) : (
          approvalPendingEndpoints.map((endpoint) => (
            <div key={endpoint.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {endpoint.path}
                    </h3>
                    {getStatusBadge(endpoint.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Tenant: {endpoint.tenantId}</span>
                    <span>Created: {new Date(endpoint.createdOn).toLocaleDateString()}</span>
                    <span>Updated: {new Date(endpoint.lastUpdated).toLocaleDateString()}</span>
                    {endpoint.createdBy && <span>By: {endpoint.createdBy}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onView(endpoint.id)}
                    icon={<EyeIcon size={14} />}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onReject(endpoint.id)}
                    icon={<XIcon size={14} />}
                    className="text-red-600 hover:text-red-700"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onApprove(endpoint.id)}
                    icon={<CheckIcon size={14} />}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalList;
export type { ApprovalEndpoint, ApprovalStatus };