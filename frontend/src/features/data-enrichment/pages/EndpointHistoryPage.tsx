import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import CustomTable from '@common/Tables/CustomTable';
import { dataEnrichmentJobApi as dataEnrichmentApi } from '../handlers';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Pagination,
} from '@mui/material';
import { Button } from '@shared';
import {
  ChevronLeft,
  History,
  X,
  User,
  Hash,
  Database,
  Table,
  ListOrdered,
  CheckCircle,
  Clock,
  FileText,
  Info,
  AlertTriangle,
  FileCheck2,
  FileOutput as FileOutputLucide,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { EyeIcon, Copy } from 'lucide-react';
import { handleInputFilter } from '@shared/helpers';
import { UI_CONFIG } from '@shared/config/app.config';

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
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const itemsPerPage = UI_CONFIG?.pagination?.defaultPageSize ?? 10;
  const [searchingFilters, setSearchingFilters] = useState<Record<string, any>>(
    {},
  );
  useEffect(() => {
    const load = async (pageNumber: number = 1) => {
      setLoading(true);
      setError(null);
      try {
        const offset = Math.max(pageNumber - 1, 0);
        const res = await dataEnrichmentApi.getJobHistory(
          jobId,
          offset,
          itemsPerPage,
          searchingFilters,
        );

        setData(res.data || []);
        const total = res.total ?? (res.data ? res.data.length : 0);
        setTotalRecords(total);
        setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
      } catch (err: any) {
        setError(err?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    load(page);
  }, [jobId, page, itemsPerPage, searchingFilters]);

  // Reset to first page when jobId changes
  useEffect(() => {
    setPage(1);
  }, [jobId]);

  // Reset to first page when search filters change
  useEffect(() => {
    setPage(1);
  }, [searchingFilters]);

  const visibleColumns = [
    'endpoint_name',
    'table_name',
    'counts',
    'processed_counts',
    'created_at',
    'exception',
  ];

  const prettifyHeader = (key: string) =>
    key
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const wrapCell = (value: any) => (
    <div
      style={{
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {value === null || value === undefined || value === '' ? 'N/A' : value}
    </div>
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
      headerName: prettifyHeader(key === 'processed_counts' ? 'processed' : key),
      headerAlign: 'center',
      align: 'center',
      sortable: false,
      disableColumnMenu: true,
      minWidth:
        key === 'endpoint_name'
          ? 240
          : key === 'table_name'
            ? 180
            : key === 'created_at'
              ? 200
              : key === 'exception'
                ? 140
                : 120,
      flex: key === 'endpoint_name' ? 0 : 0,
      // Render header for each column to ensure centered header text. For endpoint_name include the search input.
      renderHeader:
        key === 'endpoint_name'
          ? () => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  py: '12px',
                }}
              >
                <Box sx={{ fontSize: '14px', fontWeight: '600' }}>
                  Endpoint Name
                </Box>
                {handleInputFilter({
                  fieldName: 'endpointName',
                  searchingFilters,
                  setSearchingFilters,
                })}
              </Box>
            )
          : () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  py: '12px',
                }}
              >
                <Box sx={{ fontSize: '14px', fontWeight: '600' }}>
                  {prettifyHeader(key === 'processed_counts' ? 'processed' : key)}
                </Box>
              </Box>
            ),
      renderCell: (params: any) =>
        key === 'exception' ? (
          <span
          
          >
            <span className=""></span>
            {params.value ? 'Yes' : 'No'}
          </span>
        ) : key === 'created_at' ? (
          wrapCell(
            params.value
              ? new Date(params.value).toLocaleString()
              : 'N/A'
          )
        ) : (
          wrapCell(params.value)
        ),
    })),
    {
      field: 'actions',
      headerName: 'Actions',
      headerAlign: 'center',
      align: 'center',
      // Make Actions column wider and flexible so it consumes leftover space and removes the white gap
      minWidth: 240,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderHeader: () => (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            py: '12px',
          }}
        >
          <Box sx={{ fontSize: '14px', fontWeight: '600' }}>Actions</Box>
        </Box>
      ),
      renderCell: (params: any) => (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <Tooltip title="View Details" arrow placement="top">
            <IconButton
              aria-label={`view-details-${params.row?.job_id ?? ''}`}
              onClick={() => handleView(params.row)}
              size="small"
              sx={{ alignSelf: 'center' }}
            >
              <EyeIcon size={18} style={{ color: '#2563EB' }} />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        {error && <div className="text-red-600 mb-4">{error}</div>}

        <div className="mx-auto px-4 sm:px-6 lg:px-[48px] py-[52px]">
          <Button
            variant="primary"
            className="py-1 pl-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={20} /> <span>Go Back</span>
          </Button>
          <h1
            className="text-3xl font-bold flex items-center gap-2"
            style={{ color: '#3b3b3b', marginTop: '32px' }}
          >
            <History size={28} style={{ color: '#2563EB' }} />
            Endpoint Last Runs
          </h1>
        </div>

        <Box sx={{ margin: '0px 45px' }}>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            <CustomTable
              columns={columns as any}
              rows={data}
              pageSize={itemsPerPage}
              pageSizeOptions={UI_CONFIG?.pagination?.pageSizeOptions as any}
              search={true}
              disableRowSelection={true}
              pagination={
                data.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg flex items-center justify-between">
                    <div className="text-sm text-gray-700 font-medium">
                      Showing{' '}
                      <span className="font-bold">
                        {(page - 1) * itemsPerPage + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-bold">
                        {Math.min(page * itemsPerPage, totalRecords)}
                      </span>{' '}
                      of <span className="font-bold">{totalRecords}</span>{' '}
                      results
                    </div>
                    <div className="flex items-center space-x-3">
                      <Box>
                        <Pagination
                          page={page}
                          count={totalPages}
                          onChange={(_, newPage: number) => setPage(newPage)}
                          variant="outlined"
                          sx={{
                            '& .MuiPaginationItem-page.Mui-selected': {
                              backgroundColor: '#fbf9fa',
                            },
                          }}
                        />
                      </Box>
                    </div>
                  </div>
                )
              }
            />
          )}
        </Box>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            color: '#2B7FFF',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Endpoint Run Details</span>
          <IconButton
            aria-label="close"
            onClick={() => setModalOpen(false)}
            size="small"
            sx={{ ml: 2 }}
          >
            <X size={22} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ padding: 3 }}>
          {activeRecord ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Box
                  sx={{
                    fontSize: 18,
                    color: 'black',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Hash size={18} style={{ color: '#2563EB' }} /> Job Id
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mt: 0.75,
                  }}
                >
                  <Box
                    component="code"
                    sx={{
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      fontSize: 15,
                    }}
                  >
                    {activeRecord.job_id}
                  </Box>
                  <Tooltip title={copied ? 'Copied!' : 'Copy Job Id'} arrow>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            String(activeRecord.job_id ?? ''),
                          );
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch (e) {}
                      }}
                      aria-label="copy-job-id"
                    >
                      <Copy size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}
              >
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <User size={18} style={{ color: '#2563EB' }} /> Tenant Id
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.tenant_id ?? 'N/A'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <FileText size={18} style={{ color: '#2563EB' }} /> Version
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.version ?? 'N/A'}
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Database size={18} style={{ color: '#2563EB' }} /> Endpoint
                    Name
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.endpoint_name ?? 'N/A'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Table size={18} style={{ color: '#2563EB' }} /> Table Name
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.table_name ?? 'N/A'}
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <ListOrdered size={18} style={{ color: '#2563EB' }} />{' '}
                    Counts
                  </Box>
                  <Box sx={{ fontSize: 15 }}>{activeRecord.counts ?? 0}</Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CheckCircle size={18} style={{ color: '#2563EB' }} />{' '}
                    Processed
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.processed_counts ?? 0}
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Clock size={18} style={{ color: '#2563EB' }} /> Created At
                  </Box>
                  <Box sx={{ fontSize: 15, color: '#374151', mt: 0.5 }}>
                    {activeRecord.created_at
                      ? new Date(activeRecord.created_at).toLocaleString()
                      : 'N/A'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <FileCheck2 size={18} style={{ color: '#2563EB' }} /> Status
                  </Box>
                  <Box sx={{ mt: 0.5 }}>
                    <span
                      className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold ${getStatusBadge(activeRecord.status)}`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                      {activeRecord.status ?? 'N/A'}
                    </span>
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <FileOutputLucide size={18} style={{ color: '#2563EB' }} />{' '}
                    Publishing Status
                  </Box>
                  <Box sx={{ mt: 0.5 }}>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold
                        ${
                          activeRecord.publishing_status === 'active'
                            ? 'bg-green-50 text-green-600 border border-green-200'
                            : activeRecord.publishing_status === 'in-active'
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : getStatusBadge(activeRecord.publishing_status)
                        }
                      `}
                    >
                      {activeRecord.publishing_status ?? 'N/A'}
                    </span>
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      fontSize: 18,
                      color: 'black',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Info size={15} style={{ color: '#2563EB' }} /> Description
                  </Box>
                  <Box sx={{ fontSize: 15 }}>
                    {activeRecord.description ?? 'N/A'}
                  </Box>
                </Box>
              </Box>

              <Box>
                <Box
                  sx={{
                    fontSize: 13,
                    color: 'black',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#ff474d' }} />{' '}
                  Exception
                </Box>
                {activeRecord.exception ? (
                  <Box
                    sx={{
                      backgroundColor: '#FFF1F2',
                      border: '1px solid #FFCDD2',
                      borderRadius: 1,
                      p: 2,
                      mt: 1,
                    }}
                  >
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {activeRecord.exception}
                    </pre>
                  </Box>
                ) : (
                  <Box sx={{ fontSize: 13, mt: 0.5 }}>N/A</Box>
                )}
              </Box>
            </Box>
          ) : (
            <div>No data</div>
          )}
        </DialogContent>
        {/* No DialogActions/Close button at bottom; close icon is in title */}
      </Dialog>

      {/* loading handled above the table */}
    </>
  );
};

export default EndpointHistoryPage;
