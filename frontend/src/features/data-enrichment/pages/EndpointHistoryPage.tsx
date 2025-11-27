import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import CustomTable from '@common/Tables/CustomTable';
import { dataEnrichmentApi } from '../services/dataEnrichmentApi';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, IconButton } from '@mui/material';
import { Button } from '@shared';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { EyeIcon, Copy } from 'lucide-react';

const getStatusBadge = (status?: string) => {
  if (!status) return 'bg-gray-50 text-gray-600 border border-gray-200';

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= 3) {
      const statusName = parts.slice(2).join('_');
      switch (statusName) {
        case 'in_progress':
          return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
        case 'under_review':
          return 'bg-blue-50 text-blue-600 border border-blue-200';
        case 'approved':
          return 'bg-green-50 text-green-600 border border-green-200';
        case 'rejected':
          return 'bg-red-50 text-red-600 border border-red-200';
        case 'changes_requested':
          return 'bg-orange-50 text-orange-600 border border-orange-200';
        case 'exported':
          return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
        case 'ready_for_deployment':
          return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
        case 'deployed':
          return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
        case 'suspended':
          return 'bg-red-50 text-red-600 border border-red-200';
        default:
          return 'bg-gray-50 text-gray-600 border border-gray-200';
      }
    }
  }

  switch (normalizedStatus) {
    case 'active':
    case 'ready for approval':
    case 'approved':
      return 'bg-green-50 text-green-600 border border-green-200';
    case 'in-progress':
    case 'in_progress':
    case 'draft':
    case 'status_01_in_progress':
      return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
    case 'suspended':
    case 'rejected':
      return 'bg-red-50 text-red-600 border border-red-200';
    case 'cloned':
      return 'bg-purple-50 text-purple-600 border border-purple-200';
    case 'under_review':
    case 'under review':
      return 'bg-blue-50 text-blue-600 border border-blue-200';
    case 'deployed':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
    case 'changes_requested':
    case 'changes requested':
      return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'exported':
      return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
    case 'ready_for_deployment':
    case 'ready for deployment':
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
};

const EndpointHistoryPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const jobId = params.get('jobId') || undefined;
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dataEnrichmentApi.getJobHistory(jobId);
        setData(res.data || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [jobId]);

  const visibleColumns = ['job_id', 'tenant_id', 'endpoint_name', 'table_name', 'status'];

  const prettifyHeader = (key: string) =>
    key
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const wrapCell = (value: any) => (
    <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{value ?? ''}</div>
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const handleView = (row: any) => {
    setActiveRecord(row);
    setModalOpen(true);
  };

  const columns = [
    ...visibleColumns.map((key) => ({
      field: key,
      headerName: prettifyHeader(key),
      minWidth:
        key === 'job_id'
          ? 420
          : key === 'endpoint_name'
          ? 240
          : key === 'status'
          ? 160
          : 160,
      flex: 0,
      renderCell: (params: any) =>
        key === 'status' ? (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(params.value)}`}>
            <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
            {params.value ?? 'N/A'}
          </span>
        ) : (
          wrapCell(params.value)
        ),
    })),
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 80,
      maxWidth: 80,
      flex: 0,
      renderCell: (params: any) => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
          <Tooltip title="View Details" arrow placement="top">
            <IconButton aria-label={`view-details-${params.row?.job_id ?? ''}`} onClick={() => handleView(params.row)} size="small" sx={{ alignSelf: 'center' }}>
              <EyeIcon size={18} style={{ color: '#2563EB' }} />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ display: 'inline-block', width: 'auto', minWidth: 'max-content' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
              <Button
                variant="primary"
                className="py-1 pl-2"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={20} /> <span>Go Back</span>
              </Button>
              <Box sx={{ fontSize: 20, fontWeight: 700, paddingTop: 0 }}>Endpoint Last Runs</Box>
            </div>

            <CustomTable columns={columns as any} rows={data} pageSize={10} search={true} />
          </div>
        </div>
      </div>
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle sx={{ color: '#2B7FFF', fontWeight: 700 }}>Endpoint Run Details</DialogTitle>
        <DialogContent dividers sx={{ padding: 3 }}>
          {activeRecord ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Job Id</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                  <Box component="code" sx={{ display: 'inline-block', fontFamily: 'monospace', fontSize: 15 }}>{activeRecord.job_id}</Box>
                  <Tooltip title={copied ? 'Copied!' : 'Copy Job Id'} arrow>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(String(activeRecord.job_id ?? ''));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch (e) {
                          }
                      }}
                      aria-label="copy-job-id"
                    >
                      <Copy size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Tenant Id</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.tenant_id ?? '-'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Version</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.version ?? '-'}</Box>
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Endpoint Name</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.endpoint_name ?? '-'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Table Name</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.table_name ?? '-'}</Box>
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Counts</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.counts ?? 0}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Processed</Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.processed_counts ?? 0}</Box>
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Created At</Box>
                  <Box sx={{ fontSize: 15, color: '#374151', mt: 0.5 }}>{activeRecord.created_at ? new Date(activeRecord.created_at).toLocaleString() : '-'}</Box>
                </Box>
                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Status</Box>
                  <Box sx={{ mt: 0.5 }}>
                    <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold ${getStatusBadge(activeRecord.status)}`}>
                      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                      {activeRecord.status ?? ''}
                    </span>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Publishing Status</Box>
                  <Box sx={{ mt: 0.5 }}>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(activeRecord.publishing_status)}`}>
                      {activeRecord.publishing_status ?? ''}
                    </span>
                  </Box>
                </Box>
              </Box>

              <Box>
                <Box sx={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Description</Box>
                <Box sx={{ fontSize: 13, fontStyle: 'italic' }}>{activeRecord.description ?? '-'}</Box>
              </Box>

              <Box>
                <Box sx={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Exception</Box>
                {activeRecord.exception ? (
                  <Box sx={{ backgroundColor: '#FFF1F2', border: '1px solid #FFCDD2', borderRadius: 1, p: 2, mt: 1 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{activeRecord.exception}</pre>
                  </Box>
                ) : (
                  <Box sx={{ fontSize: 13, mt: 0.5 }}>-</Box>
                )}
              </Box>
            </Box>
          ) : (
            <div>No data</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} variant="primary">Close</Button>
        </DialogActions>
      </Dialog>
      {loading && <div className="mt-4">Loading...</div>}
    </div>
  );
};

export default EndpointHistoryPage;
