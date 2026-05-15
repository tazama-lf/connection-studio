import React, { useState } from 'react';
import { DownloadIcon, ChevronDownIcon, ClockIcon } from 'lucide-react';
import { Button } from './Button';

interface ValidationError {
  message: string;
  type: 'error' | 'warning';
}

interface ValidationLog {
  id: number;
  timestamp: string;
  endpoint: string;
  status: 'ERROR' | 'WARNING' | 'SUCCESS';
  errorCount?: number;
  errors?: ValidationError[];
  payload?: object;
}

interface ValidationLogsTableProps {
  logs?: ValidationLog[];
}

const ValidationLogsTable: React.FC<ValidationLogsTableProps> = ({
  logs = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const defaultLogs: ValidationLog[] = [
    {
      id: 1,
      timestamp: '11/10/2023, 7:30:00 PM',
      endpoint: '/transactions/pacs.008',
      status: 'ERROR',
      errorCount: 3,
      errors: [
        {
          message: 'Invalid transaction amount: must be positive',
          type: 'error',
        },
        {
          message: 'Transaction ID format invalid: expected format XX999999',
          type: 'error',
        },
        { message: 'Missing required field: currency', type: 'error' },
      ],
      payload: {
        transactionId: '123',
        amount: -100,
      },
    },
    {
      id: 2,
      timestamp: '11/10/2023, 6:15:00 PM',
      endpoint: '/accounts/acmt.023',
      status: 'WARNING',
      errorCount: 2,
      errors: [
        { message: 'Account balance approaching limit', type: 'warning' },
        { message: 'Deprecated field usage detected', type: 'warning' },
      ],
      payload: {
        accountId: 'ACC123',
        balance: 95000,
        currency: 'USD',
      },
    },
  ];

  const displayLogs = logs.length > 0 ? logs : defaultLogs;

  const filteredLogs = displayLogs.filter(
    (log) =>
      log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.errors?.some((error) =>
        error.message.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
  );

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const toggleRowExpansion = (id: number): void => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const timeFilterButtons = ['ALL', '24H', '7D', '30D'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Validation Logs</h2>
        <Button
          variant="secondary"
          icon={<DownloadIcon size={16} />}
          className="text-sm"
        >
          Export Logs
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search endpoints or errors..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-3 top-2.5">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeFilterButtons.map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setTimeFilter(filter);
                }}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  timeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                TIME
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ENDPOINT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                DETAILS
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredLogs.map((log, index) => (
              <React.Fragment key={log.id}>
                <tr
                  className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center">
                    <ClockIcon size={16} className="mr-2 text-gray-400" />
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">
                    {log.endpoint}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${getStatusBadge(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.errorCount && log.errorCount > 0 && (
                      <button
                        onClick={() => {
                          toggleRowExpansion(log.id);
                        }}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {log.errorCount} error{log.errorCount > 1 ? 's' : ''}
                        <ChevronDownIcon
                          size={16}
                          className={`ml-1 transform transition-transform ${
                            expandedRows.has(log.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Error Details */}
                {expandedRows.has(log.id) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 bg-gray-50 border-b border-gray-200"
                    >
                      <div className="space-y-4">
                        {/* Error Stack */}
                        {log.errors && log.errors.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Error Stack
                            </h4>
                            <div className="space-y-2">
                              {log.errors.map((error, errorIndex) => (
                                <div
                                  key={errorIndex}
                                  className="flex items-start"
                                >
                                  <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500 mr-3 mt-0.5 flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mx-auto mt-0.5"></div>
                                  </div>
                                  <span className="text-sm text-red-700">
                                    {error.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Failed Payload */}
                        {log.payload && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Failed Payload
                            </h4>
                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <pre className="text-sm text-white font-mono">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValidationLogsTable;
