export interface SaveJobOptions {
  formValues: any;
  configurationType: 'push' | 'pull';
  editMode: boolean;
  selectedJob?: any;
  onSave?: (response: any) => void;
  onCloseWithRefresh?: () => void;
  onClose?: () => void;
  showSuccess: (title: string, message: string) => void;
  setShowSendForApproval: (show: boolean) => void;
  setIsCreating: (creating: boolean) => void;
}
export interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editMode?: boolean;
  jobId?: string;
  jobType?: 'pull' | 'push';
}
export interface EndpointHistoryButtonProps {
  jobId?: string;
}
export interface DropdownMenuWithAutoDirectionProps {
  children: React.ReactNode;
  forceDirection?: 'top' | 'bottom' | 'auto';
}
export interface PaginatedJobResponse {
  success: boolean;
  jobs: DataEnrichmentJobResponse[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
  userRole: string;
}
export interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
      error?: string;
    };
  };
  message?: string;
}
export interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  isLoading?: boolean;
  editMode?: boolean;
  cloneMode?: boolean;
  onSave?: (updatedJob: Partial<DataEnrichmentJobResponse>) => Promise<void>;
  onClone?: (job: DataEnrichmentJobResponse) => Promise<void>;
  onSendForApproval?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  onApprove?: (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason?: string,
  ) => void;
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void;
  onExport?: (jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>;
}
// Data Enrichment Job Types - Aligned with Backend

export type ConfigType = 'Pull' | 'Push';
export type SourceType = 'HTTP' | 'SFTP';
export type JobStatus = 
  | 'STATUS_01_IN_PROGRESS'
  | 'STATUS_02_ON_HOLD'
  | 'STATUS_03_UNDER_REVIEW'
  | 'STATUS_04_APPROVED'
  | 'STATUS_05_REJECTED'
  | 'STATUS_06_EXPORTED'
  | 'STATUS_07_READY_FOR_DEPLOYMENT'
  | 'STATUS_08_DEPLOYED';
export type AuthType = 'USERNAME_PASSWORD' | 'PRIVATE_KEY';
export type FileType = 'CSV' | 'JSON' | 'TSV';
export type EncodingType = 'utf-8' | 'ascii' | 'latin1' | 'utf16le';

export interface CloneJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  onSuccess?: () => void;
}
export interface CronJobManagementProps {
  onCreateSchedule?: () => void;
}
export interface DataEnrichmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWithRefresh?: () => void;
  onSave?: (formData: any) => void;
  editMode?: boolean;
  selectedJob?: any;
}

export interface DataEnrichmentJobListProps {
  // No props needed - uses hooks internally
}

export interface DataEnrichmentJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
  viewFormData?: any;
  editFormData?: any;
  setEditFormData?: (data: any) => void;
  handleSendForApproval?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  handleSaveEdit?: (data: any) => void;
  onApprove?: (jobId: string, jobType: 'PULL' | 'PUSH', reason?: string) => void;
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void;
}

export interface JobFormProps {
  onSubmit: (jobData: CreateDataEnrichmentJobRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface JobListProps {
  jobs: DataEnrichmentJobResponse[];
  isLoading?: boolean;
  onViewLogs?: (jobId: string) => void;
  onEdit?: (job: DataEnrichmentJobResponse) => void;
  onClone?: (job: DataEnrichmentJobResponse) => void;
  onRefresh?: () => void;
  page?: number;
  setPage?: (page: number) => void;
  totalPages?: number;
  totalRecords?: number;
  itemsPerPage?: number;
  searchingFilters?: any;
  setSearchingFilters?: any;
  error?: string | null;
  loading?: boolean;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

// HTTP Connection Configuration
export interface HttpConnection {
  url: string;
  headers: Record<string, string>;
}

// SFTP Connection Configuration
export interface SftpConnection {
  host: string;
  port: number;
  auth_type: AuthType;
  user_name: string;
  password?: string; // Only for USERNAME_PASSWORD auth
  private_key?: string; // Only for PRIVATE_KEY auth
}

// File Configuration for SFTP - Matching backend FileSettingDto
export interface FileConfig {
  path: string;
  file_type: FileType;
  delimiter: string;
}

// Schedule types
export interface ScheduleRequest {
  name: string;
  cron: string;
  iterations: number;
  start_date?: string;
  end_date?: string;
  schedule_status?: string;
  status?: string; // Approval status: pending, approved, rejected
}

export interface ScheduleCreateResponse {
  success: boolean;
  message: string;
}

export interface ScheduleResponse {
  id: string; // UUID string from backend
  name: string;
  cron: string;
  iterations: number;
  schedule_status: string;
  status?: JobStatus; // Updated to use JobStatus type: inprogress, under review, approved, suspended, rejected, exported, published
  source_type?: SourceType; // SFTP or HTTP source type
  next_time?: string | null;
  created_at?: string;
  start_date?: string;
  end_date?: string | null;
}

// Base Data Enrichment Job
export interface DataEnrichmentJobBase {
  config_type: ConfigType;
  endpoint_name: string;
  schedule_id: string; // UUID string from backend
  source_type: SourceType;
  description: string;
  table_name: string;
  job_status?: JobStatus;
}

// HTTP-based Data Enrichment Job
export interface HttpDataEnrichmentJob extends DataEnrichmentJobBase {
  source_type: 'HTTP';
  connection: HttpConnection;
}

// SFTP-based Data Enrichment Job
export interface SftpDataEnrichmentJob extends DataEnrichmentJobBase {
  source_type: 'SFTP';
  connection: SftpConnection;
  file: FileConfig;
}

// Union type for all job types
export type DataEnrichmentJob = HttpDataEnrichmentJob | SftpDataEnrichmentJob;

// Backend DTO types (matching actual API structure)
export interface CreatePullJobDto {
  id?: string; // Optional for upsert operations
  endpoint_name: string;
  schedule_id: string; // UUID string from backend
  source_type: SourceType;
  description: string;
  connection: HttpConnection | SftpConnection;
  file?: FileConfig; // Only required for SFTP
  table_name: string;
  mode?: 'append' | 'replace';
  version: string;
}

export interface CreatePushJobDto {
  id?: string; // Optional for upsert operations
  endpoint_name: string;
  path: string; // Push jobs use path instead of connection/source_type
  description: string;
  table_name: string;
  mode?: 'append' | 'replace';
  version: string;
}

// Update DTOs - Partial versions for updating existing jobs
export type UpdatePullJobDto = Partial<CreatePullJobDto>;
export type UpdatePushJobDto = Partial<CreatePushJobDto>;

// Job creation request (without id and status) - Legacy for compatibility
export type CreateDataEnrichmentJobRequest =
  | CreatePullJobDto
  | CreatePushJobDto;

// Job update request
export type UpdateDataEnrichmentJobRequest =
  | UpdatePullJobDto
  | UpdatePushJobDto;

// Job response with ID and metadata - matching actual backend response
export interface DataEnrichmentJobResponse {
  id: string;
  endpoint_name: string;
  path?: string | null; // For push jobs
  mode: 'append' | 'replace';
  table_name: string;
  description: string;
  version: string;
  status?: JobStatus | null; // Note: backend returns 'status' not 'job_status'
   publishing_status?: 'active' | 'in-active' | null; // Activation status
  created_at?: string;
  updated_at?: string;
  type: 'push' | 'pull'; // Backend returns lowercase type
  // Additional fields for type discrimination
  config_type?: ConfigType; // For compatibility
  job_status?: JobStatus; // Alias for status
  schedule_id?: string;
  source_type?: SourceType;
  connection?: HttpConnection | SftpConnection;
  file?: FileConfig;
}

// Pagination for job listing
export interface JobListResponse {
  jobs: DataEnrichmentJobResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Job execution log
export interface JobExecutionLog {
  id: number;
  job_id: number;
  status: JobStatus;
  start_time: string;
  end_time?: string;
  error_message?: string;
  records_processed?: number;
  duration?: number;
}

// Component Props - Following CRON module pattern
export interface DataEnrichmentJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: () => void;
}

export interface DataEnrichmentJobViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewFormData: DataEnrichmentJobResponse;
  handleSendForApproval?: () => void;
  onApprove?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
}

export interface DataEnrichmentJobEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editFormData: DataEnrichmentJobResponse;
  setEditFormData: (data: DataEnrichmentJobResponse) => void;
  handleSaveEdit?: () => void;
}

export type ActionType = '' | 'export' | 'approval' | 'edit' | 'activate' | 'deactivate';

export interface DataEnrichmentJobTableColumnsProps {
  searchingFilters: Record<string, unknown>;
  setSearchingFilters: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setPage: (page: number) => void;
  userRole: string;
  userIsEditor: boolean;
  userIsApprover: boolean;
  userIsExporter: boolean;
  userIsPublisher: boolean;
  onView: (jobId: string) => void;
  onEdit: (job: DataEnrichmentJobResponse) => void;
  onExport: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
}

// ============================================================================
// Component Props Types - DataEnrichmentFormModal Components
// ============================================================================

export interface SourceConfigurationFieldsProps {
  control: any;
  errors: any;
  configurationType: 'pull' | 'push';
}

export interface AuthenticationFieldsProps {
  control: any;
  errors: any;
  configurationType: 'pull' | 'push';
}

export interface FileProcessingFieldsProps {
  control: any;
  errors: any;
  watch: any;
  configurationType: 'pull' | 'push';
}

export interface EndpointConfigurationFieldsProps {
  control: any;
  errors: any;
  watch: any;
  getValues: any;
  tenantId: string;
  generateEndpointUrl: (version?: string, endpointPath?: string) => string;
}

export interface DataIngestionFieldsProps {
  control: any;
  errors: any;
}

export interface FormSummaryStepProps {
  formValues: any;
  configurationType: 'pull' | 'push';
}

export interface SummaryRowProps {
  label: string;
  value: any;
}

// ============================================================================
// Component Props Types - JobDetailsModal Components
// ============================================================================

export interface JobMetadataProps {
  job: DataEnrichmentJobResponse;
  jobType: 'push' | 'pull';
}

export interface MetadataRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export interface JobActionsProps {
  editMode?: boolean;
  cloneMode?: boolean;
  status?: string;
  userIsEditor: boolean;
  userIsApprover: boolean;
  userIsExporter: boolean;
  onSendForApproval?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  onClone?: () => void;
  onClose: () => void;
}

export default {};
