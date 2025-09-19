import React from 'react';

interface ValidationLog {
  id: number;
  timestamp: string;
  endpoint: string;
  status: 'Success' | 'Warning' | 'Error';
  message: string;
}

interface ValidationLogsTableProps {
  logs?: ValidationLog[];
}

const ValidationLogsTable: React.FC<ValidationLogsTableProps> = ({ logs = [] }) => {
  const defaultLogs: ValidationLog[] = [
    {
      id: 1,
      timestamp: '2023-11-15 10:30:00',
      endpoint: '/v1/evaluate/ACM102/iso20022/pacs.008.001.011-transfers',
      status: 'Success',
      message: 'Validation completed successfully'
    },
    {
      id: 2,
      timestamp: '2023-11-15 10:25:00',
      endpoint: '/v1/evaluate/FIN345/iso8583/0200-payments',
      status: 'Warning',
      message: 'Minor validation warnings detected'
    },
    {
      id: 3,
      timestamp: '2023-11-15 10:20:00',
      endpoint: '/v1/evaluate/BNK123/iso20022/pain.001.001.03-transfers',
      status: 'Error',
      message: 'Validation failed: Required field missing'
    }
  ];

  const displayLogs = logs.length > 0 ? logs : defaultLogs;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'text-green-600 bg-green-100';
      case 'Warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'Error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Validation Logs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.timestamp}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.endpoint}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {log.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValidationLogsTable;
