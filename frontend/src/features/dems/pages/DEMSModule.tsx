import React, { useState } from 'react';
import { AuthHeader } from '../../shared/components/AuthHeader';
import EndpointTable from '../../shared/components/EndpointTable';
import SearchBar from '../../shared/components/SearchBar';
import { Button } from '../../shared/components/Button';
import { PlusIcon, AlertTriangleIcon } from 'lucide-react';
import EditEndpointModal from '../../shared/components/EditEndpointModal';
import ValidationLogsTable from '../../shared/components/ValidationLogsTable';
type Endpoint = {
  id: number;
  path: string;
  createdOn: string;
  lastUpdated: string;
  status: "In-Progress" | "Ready for Approval" | "Suspended" | "Cloned";
  tenantId: string;
  workflowStatus?: "active" | "paused";
};

const initialEndpoints: Endpoint[] = [{
  id: 1,
  path: '/v1/evaluate/ACM102/iso20022/pacs.008.001.011-transfers',
  createdOn: '2023-10-15',
  lastUpdated: '2023-11-02',
  status: 'Ready for Approval',
  tenantId: 'ACM102',
  workflowStatus: "active"
}, {
  id: 2,
  path: '/v1/evaluate/FIN345/iso8583/0200-payments',
  createdOn: '2023-11-05',
  lastUpdated: '2023-11-05',
  status: 'In-Progress',
  tenantId: 'FIN345',
  workflowStatus: 'active'
}, {
  id: 3,
  path: '/v1/evaluate/BNK123/iso20022/pacs.002.001.011-transfers',
  createdOn: '2023-08-30',
  lastUpdated: '2023-10-28',
  status: 'Ready for Approval',
  tenantId: 'BNK123',
  workflowStatus: 'active'
}, {
  id: 4,
  path: '/v1/evaluate/GLB789/iso20022/pain.013.001.010-payments',
  createdOn: '2023-07-12',
  lastUpdated: '2023-09-18',
  status: 'Ready for Approval',
  tenantId: 'GLB789',
  workflowStatus: 'active'
}, {
  id: 5,
  path: '/v1/evaluate/PAY456/iso20022/pacs.008.001.011-payments',
  createdOn: '2023-11-01',
  lastUpdated: '2023-11-01',
  status: 'Suspended',
  tenantId: 'PAY456',
  workflowStatus: 'active'
}, {
  id: 6,
  path: '/v2/evaluate/ACM102/iso20022/pacs.008.001.011-transfers',
  createdOn: '2023-11-12',
  lastUpdated: '2023-11-12',
  status: 'Cloned',
  tenantId: 'ACM102',
  workflowStatus: 'active'
}];
 const DEMSModule: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEndpointId, setEditingEndpointId] = useState<number | null>(null);
  const [showValidationLogs, setShowValidationLogs] = useState(false);
  const filteredEndpoints = endpoints.filter(endpoint => endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleDelete = (id: number) => {
    setEndpoints(endpoints.filter(endpoint => endpoint.id !== id));
  };
  const handleEdit = (id: number) => {
    setEditingEndpointId(id);
  };
  const handleAddNew = () => {
    setEditingEndpointId(-1);
  };
  return <div className="min-h-screen bg-gray-50" data-id="element-1171">
      <AuthHeader title="Dynamic Endpoint Monitoring Service" showBackButton={true} data-id="element-1172" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-id="element-1173">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4" data-id="element-1174">
          <div className="flex items-center space-x-4" data-id="element-1175">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search endpoints..." data-id="element-1176" />
            <Button variant="secondary" onClick={() => setShowValidationLogs(!showValidationLogs)} icon={<AlertTriangleIcon size={16} data-id="element-1178" />} data-id="element-1177">
              Validation Logs
            </Button>
          </div>
          <Button onClick={handleAddNew} icon={<PlusIcon size={16} data-id="element-1180" />} data-id="element-1179">
            Create New Connection
          </Button>
        </div>
        {showValidationLogs ? <ValidationLogsTable data-id="element-1181" /> : <EndpointTable endpoints={filteredEndpoints} onEdit={handleEdit} onDelete={handleDelete} data-id="element-1182" />}
      </div>
      <EditEndpointModal isOpen={editingEndpointId !== null} onClose={() => setEditingEndpointId(null)} endpointId={editingEndpointId!} data-id="element-1183" />
    </div>;
};

export default DEMSModule;