import React, { useState } from 'react';
import { AuthHeader } from '../../shared/components/AuthHeader';
import EndpointTable from '../../shared/components/EndpointTable';
import SearchBar from '../../shared/components/SearchBar';
import { JsonDataModal } from '../../shared/components/JsonDataModal';
import { DataEnrichmentFormModal } from '../../shared/components/DataEnrichmentFormModal';
import { Button } from '../../shared/components/Button';
import { PlusIcon } from 'lucide-react';
type Endpoint = {
  id: number;
  path: string;
  createdOn: string;
  lastUpdated: string;
  status: 'Ready for Approval' | 'In-Progress' | 'Suspended' | 'Cloned';
  tenantId: string;
  workflowStatus: 'active';
  type: 'Push' | 'Pull';
};

const initialEndpoints: Endpoint[] = [{
  id: 1,
  path: '/v1/enrich/ACM102/customerdata',
  createdOn: '2023-10-15',
  lastUpdated: '2023-11-02',
  status: 'Ready for Approval',
  tenantId: 'ACM102',
  workflowStatus: 'active',
  type: 'Push'
}, {
  id: 2,
  path: '/v1/enrich/FIN345/transactiondata',
  createdOn: '2023-11-05',
  lastUpdated: '2023-11-05',
  status: 'In-Progress',
  tenantId: 'FIN345',
  workflowStatus: 'active',
  type: 'Pull'
}, {
  id: 3,
  path: '/v1/enrich/BNK123/accountdata',
  createdOn: '2023-08-30',
  lastUpdated: '2023-10-28',
  status: 'Ready for Approval',
  tenantId: 'BNK123',
  workflowStatus: 'active',
  type: 'Push'
}, {
  id: 4,
  path: '/v1/enrich/GLB789/paymentdata',
  createdOn: '2023-07-12',
  lastUpdated: '2023-09-18',
  status: 'Ready for Approval',
  tenantId: 'GLB789',
  workflowStatus: 'active',
  type: 'Pull'
}, {
  id: 5,
  path: '/v1/enrich/PAY456/merchantdata',
  createdOn: '2023-11-01',
  lastUpdated: '2023-11-01',
  status: 'Suspended',
  tenantId: 'PAY456',
  workflowStatus: 'active',
  type: 'Push'
}, {
  id: 6,
  path: '/v2/enrich/ACM102/customerdata',
  createdOn: '2023-11-12',
  lastUpdated: '2023-11-12',
  status: 'Cloned',
  tenantId: 'ACM102',
  workflowStatus: 'active',
  type: 'Push'
}];
// Sample JSON data for each endpoint
const sampleJsonData = {
  1: {
    customer: {
      id: 'C12345',
      name: 'John Smith',
      email: 'john.smith@example.com',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA'
      },
      phoneNumber: '+1-555-123-4567',
      accountType: 'Premium',
      createdAt: '2022-03-15T14:30:00Z',
      lastLogin: '2023-11-05T09:45:12Z',
      preferences: {
        notifications: true,
        twoFactorAuth: true,
        language: 'en-US'
      }
    }
  },
  2: {
    transaction: {
      id: 'T987654321',
      amount: 1250.75,
      currency: 'USD',
      type: 'payment',
      status: 'completed',
      createdAt: '2023-11-04T18:22:10Z',
      processedAt: '2023-11-04T18:22:15Z',
      source: {
        type: 'credit_card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025
      },
      destination: {
        type: 'bank_account',
        accountNumber: '****6789',
        routingNumber: '****1234'
      },
      metadata: {
        invoiceId: 'INV-2023-11-001',
        merchantReference: 'REF123456'
      }
    }
  },
  3: {
    account: {
      id: 'A789012',
      accountNumber: '9876543210',
      type: 'checking',
      balance: 4575.25,
      currency: 'USD',
      status: 'active',
      createdAt: '2021-07-12T10:15:30Z',
      lastActivity: '2023-11-03T14:22:45Z',
      owner: {
        id: 'C54321',
        name: 'Jane Doe',
        email: 'jane.doe@example.com'
      },
      permissions: ['view', 'transfer', 'withdraw'],
      limits: {
        dailyWithdrawal: 2000,
        dailyTransfer: 5000
      }
    }
  },
  4: {
    payment: {
      id: 'P456789',
      amount: 750.5,
      currency: 'EUR',
      status: 'pending',
      type: 'international',
      createdAt: '2023-11-05T08:30:15Z',
      scheduledFor: '2023-11-07T00:00:00Z',
      sender: {
        name: 'Global Corp Ltd',
        accountId: 'GC789',
        country: 'Germany'
      },
      recipient: {
        name: 'Acme Inc',
        accountId: 'AC456',
        country: 'France',
        bankDetails: {
          iban: 'FR76************1234',
          bic: 'BNPAFRPP'
        }
      },
      fees: {
        amount: 15.25,
        currency: 'EUR',
        description: 'International transfer fee'
      }
    }
  },
  5: {
    merchant: {
      id: 'M123456',
      name: 'TechGadgets Inc',
      category: 'Electronics',
      createdAt: '2020-05-18T09:30:00Z',
      status: 'active',
      contact: {
        email: 'support@techgadgets.example',
        phone: '+1-555-987-6543',
        website: 'https://techgadgets.example'
      },
      address: {
        street: '456 Tech Blvd',
        city: 'San Francisco',
        state: 'CA',
        zip: '94107',
        country: 'USA'
      },
      paymentMethods: ['credit_card', 'debit_card', 'bank_transfer'],
      settings: {
        autoSettlement: true,
        settlementFrequency: 'daily',
        disputeAutoRespond: false
      },
      performance: {
        transactionCount: 12456,
        totalVolume: 875432.5,
        averageOrderValue: 70.28,
        chargebackRate: 0.12
      }
    }
  },
  6: {
    customer: {
      id: 'C12345',
      name: 'John Smith',
      email: 'john.smith@example.com',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA'
      },
      phoneNumber: '+1-555-123-4567',
      accountType: 'Premium',
      createdAt: '2022-03-15T14:30:00Z',
      lastLogin: '2023-11-05T09:45:12Z',
      preferences: {
        notifications: true,
        twoFactorAuth: true,
        language: 'en-US'
      }
    }
  }
};
 const DataEnrichmentModule: React.FC = () => {
  const [endpoints, setEndpoints] = useState([...initialEndpoints]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingJsonData, setViewingJsonData] = useState<{
    id: number;
    data: any;
  } | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const filteredEndpoints = endpoints.filter(endpoint => endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleDelete = (id: number) => {
    setEndpoints(endpoints.filter(endpoint => endpoint.id !== id));
  };
  const handleView = (id: number) => {
    // Find the endpoint to get its path for the modal title
    const endpoint = endpoints.find(ep => ep.id === id);
    const endpointPath = endpoint ? endpoint.path : 'Unknown Endpoint';
    setViewingJsonData({
      id,
      data: sampleJsonData[id as keyof typeof sampleJsonData] || {
        message: 'No data available'
      }
    });
  };
  const handleClone = (id: number) => {
    const endpointToClone = endpoints.find(ep => ep.id === id);
    if (endpointToClone) {
      // Create a new endpoint with a v2 path and Cloned status
      const newPath = endpointToClone.path.replace('/v1/', '/v2/');
      const newEndpoint = {
        id: Math.max(...endpoints.map(ep => ep.id)) + 1,
        path: newPath,
        createdOn: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        status: 'Cloned' as const,
        tenantId: endpointToClone.tenantId,
        workflowStatus: endpointToClone.workflowStatus,
        type: endpointToClone.type
      };
      setEndpoints([...endpoints, newEndpoint]);
      // Also clone the JSON data if needed
      if (sampleJsonData[id as keyof typeof sampleJsonData]) {
        sampleJsonData[newEndpoint.id as keyof typeof sampleJsonData] = JSON.parse(JSON.stringify(sampleJsonData[id as keyof typeof sampleJsonData]));
      }
    }
  };
  const handleAddNewEndpoint = (formData: any) => {
    const newId = Math.max(...endpoints.map(ep => ep.id)) + 1;
    const newEndpoint = {
      id: newId,
      path: `/v1/enrich/${formData.name.replace(/\s+/g, '-').toLowerCase()}`,
      createdOn: formData.createdOn,
      lastUpdated: formData.lastUpdated,
      status: 'In-Progress' as const,
      tenantId: 'USR' + newId,
      workflowStatus: 'active' as const,
      type: 'Pull' as const
    };
    setEndpoints([...endpoints, newEndpoint]);
  };
  return <div className="min-h-screen bg-gray-50" data-id="element-1161">
      <AuthHeader title="Data Enrichment Module" showBackButton={true} data-id="element-1162" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-id="element-1163">
        <div className="flex justify-between items-center mb-6 gap-4" data-id="element-1164">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search endpoints..." data-id="element-1165" />
          <Button variant="primary" icon={<PlusIcon size={16} data-id="element-1167" />} onClick={() => setIsFormModalOpen(true)} data-id="element-1166">
            Define New Endpoint
          </Button>
        </div>
        <EndpointTable endpoints={filteredEndpoints} onEdit={handleView} onDelete={handleDelete} onClone={handleClone} showStatusColumn={false} showActionsColumn={false} createdTimeLabel="Received Time" showTypeColumn={true} data-id="element-1168" />
      </div>
      {viewingJsonData && <JsonDataModal isOpen={viewingJsonData !== null} onClose={() => setViewingJsonData(null)} data={viewingJsonData.data} title={`Raw JSON Data - ${endpoints.find(ep => ep.id === viewingJsonData.id)?.path}`} data-id="element-1169" />}
      <DataEnrichmentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} onSave={handleAddNewEndpoint} data-id="element-1170" />
    </div>;
};

export default DataEnrichmentModule;