export interface SaveJobOptions {
  formValues: Record<string, unknown>;
  configurationType: 'push' | 'pull';
  editMode: boolean;
  selectedJob?: DataEnrichmentJobResponse;
  onSave?: (response: unknown) => void;
  onCloseWithRefresh?: () => void;
  onClose?: () => void;
  showSuccess: (title: string, message: string) => void;
  setShowSendForApproval: (show: boolean) => void;
  setIsCreating: (creating: boolean) => void;
}
export interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: Record<string, unknown>) => void;
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
  data: DataEnrichmentJobResponse[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export interface Props {
  control: unknown;
  watch: unknown;
  errors: unknown;
  setValue?: unknown;
  getValues?: unknown;
  trigger?: unknown;
  availableSchedules: ScheduleResponse[];
}

export interface PropsPush {
  control: unknown;
  watch: unknown;
  errors: unknown;
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
  onSave?: (formData: Record<string, unknown>) => void;
  editMode?: boolean;
  selectedJob?: DataEnrichmentJobResponse;
}

export interface DataEnrichmentJobListProps { }

export interface DataEnrichmentJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
  viewFormData?: DataEnrichmentJobResponse;
  editFormData?: DataEnrichmentJobResponse;
  setEditFormData?: (data: DataEnrichmentJobResponse) => void;
  handleSendForApproval?: (jobId: string, jobType: 'PULL' | 'PUSH') => void;
  handleSaveEdit?: (data: DataEnrichmentJobResponse) => void;
  onApprove?: (
    jobId: string,
    jobType: 'PULL' | 'PUSH',
    reason?: string,
  ) => void;
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
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    setPage: (page: number) => void;
  };
  totalRecords?: number;
  itemsPerPage?: number;
  searchingFilters?: Record<string, unknown>;
  setSearchingFilters?: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
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

export interface HttpConnection {
  url: string;
  headers: Record<string, string>;
}

export interface SftpConnection {
  host: string;
  port: number;
  auth_type: AuthType;
  user_name: string;
  password?: string;
  private_key?: string;
}

export interface FileConfig {
  path: string;
  file_type: FileType;
  delimiter: string;
}

export interface ScheduleRequest {
  name: string;
  cron: string;
  iterations: number;
  start_date?: string;
  end_date?: string;
  schedule_status?: string;
  status?: string;
}

export interface ScheduleCreateResponse {
  success: boolean;
  message: string;
}

export interface ScheduleResponse {
  id: string;
  name: string;
  cron: string;
  iterations: number;
  schedule_status: string;
  status?: JobStatus;
  source_type?: SourceType;
  next_time?: string | null;
  created_at?: string;
  start_date?: string;
  end_date?: string | null;
}

export interface DataEnrichmentJobBase {
  config_type: ConfigType;
  endpoint_name: string;
  schedule_id: string;
  source_type: SourceType;
  description: string;
  table_name: string;
  job_status?: JobStatus;
}

export interface HttpDataEnrichmentJob extends DataEnrichmentJobBase {
  source_type: 'HTTP';
  connection: HttpConnection;
}

export interface SftpDataEnrichmentJob extends DataEnrichmentJobBase {
  source_type: 'SFTP';
  connection: SftpConnection;
  file: FileConfig;
}

export type DataEnrichmentJob = HttpDataEnrichmentJob | SftpDataEnrichmentJob;

export interface CreatePullJobDto {
  id?: string;
  endpoint_name: string;
  schedule_id: string;
  source_type: SourceType;
  description: string;
  connection: HttpConnection | SftpConnection;
  file?: FileConfig;
  table_name: string;
  mode?: 'append' | 'replace';
  version: string;
}

export interface CreatePushJobDto {
  id?: string;
  endpoint_name: string;
  path: string;
  description: string;
  table_name: string;
  mode?: 'append' | 'replace';
  version: string;
}

export type UpdatePullJobDto = Partial<CreatePullJobDto>;
export type UpdatePushJobDto = Partial<CreatePushJobDto>;

export type CreateDataEnrichmentJobRequest =
  | CreatePullJobDto
  | CreatePushJobDto;

export type UpdateDataEnrichmentJobRequest =
  | UpdatePullJobDto
  | UpdatePushJobDto;

export interface DataEnrichmentJobResponse {
  schedule_name: string;
  comments: string;
  id: string;
  endpoint_name: string;
  path?: string | null;
  mode: 'append' | 'replace';
  table_name: string;
  description: string;
  version: string;
  status?: JobStatus | null;
  publishing_status?: 'active' | 'in-active' | null;
  created_at?: string;
  updated_at?: string;
  type: 'push' | 'pull';
  config_type?: ConfigType;
  job_status?: JobStatus;
  schedule_id?: string;
  source_type?: SourceType;
  connection?: HttpConnection | SftpConnection;
  file?: FileConfig;
}

export interface JobListResponse {
  jobs: DataEnrichmentJobResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export type ActionType =
  | ''
  | 'export'
  | 'approval'
  | 'edit'
  | 'activate'
  | 'deactivate';

export interface DataEnrichmentJobTableColumnsProps {
  searchingFilters: Record<string, unknown>;
  setSearchingFilters: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
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

export interface SourceConfigurationFieldsProps {
  control: unknown;
  errors: unknown;
  configurationType: 'pull' | 'push';
}

export interface AuthenticationFieldsProps {
  control: unknown;
  errors: unknown;
  configurationType: 'pull' | 'push';
}

export interface FileProcessingFieldsProps {
  control: unknown;
  errors: unknown;
  watch: unknown;
  configurationType: 'pull' | 'push';
}

export interface EndpointConfigurationFieldsProps {
  control: unknown;
  errors: unknown;
  watch: unknown;
  getValues: unknown;
  tenantId: string;
  generateEndpointUrl: (version?: string, endpointPath?: string) => string;
}

export interface DataIngestionFieldsProps {
  control: unknown;
  errors: unknown;
}

export interface FormSummaryStepProps {
  formValues: Record<string, unknown>;
  configurationType: 'pull' | 'push';
}

export interface SummaryRowProps {
  label: string;
  value: unknown;
}

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
