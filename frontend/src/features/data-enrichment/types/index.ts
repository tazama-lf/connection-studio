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

export interface PaginatedJobResponse {
  success: boolean;
  jobs: DataEnrichmentJobResponse[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  iterations: number;
}


export interface PaginationParams {
  limit: number;
  offset: number;
  userRole: string;
}

export interface DataEnrichmentJobResponse {
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

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
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
  onResumeJob?: (job: DataEnrichmentJobResponse) => Promise<void>;
  onUpdateStatus?: (job: DataEnrichmentJobResponse, status: string) => Promise<void>;
  onTogglePublishingStatus?: (job: DataEnrichmentJobResponse, newStatus: 'active' | 'in-active') => Promise<void>;
}

export interface DataEnrichmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloseWithRefresh?: () => void;
  onSave?: (formData: any) => void;
  editMode?: boolean;
  selectedJob?: any;
  onCreatePullJob?: (payload: any) => Promise<any>;
  onCreatePushJob?: (payload: any) => Promise<any>;
  onUpdatePullJob?: (jobId: string, payload: any) => Promise<any>;
  onUpdatePushJob?: (jobId: string, payload: any) => Promise<any>;
  onUpdateJobStatus?: (jobId: string, status: string, jobType: 'PULL' | 'PUSH') => Promise<any>;
}

export interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editMode?: boolean;
  jobId?: string;
  jobType?: 'pull' | 'push';
  onGetJob?: (jobId: string, jobType: 'PULL' | 'PUSH') => Promise<any>;
  onCreatePullJob?: (payload: any) => Promise<any>;
  onCreatePushJob?: (payload: any) => Promise<any>;
  onUpdatePullJob?: (jobId: string, payload: any) => Promise<any>;
  onUpdatePushJob?: (jobId: string, payload: any) => Promise<any>;
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
  onApprove?: (jobId: string, jobType: 'PULL' | 'PUSH', reason?: string) => void;
  onReject?: (jobId: string, jobType: 'PULL' | 'PUSH', reason: string) => void;
  onExport?: (jobId: string, jobType: 'PULL' | 'PUSH') => Promise<void>;
}

export interface CloneJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DataEnrichmentJobResponse | null;
  onSuccess?: () => void;
  onCreatePullJob?: (payload: any) => Promise<any>;
  onCreatePushJob?: (payload: any) => Promise<any>;
}

export interface JobFormProps {
  onSubmit: (jobData: CreateDataEnrichmentJobRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface CronJobManagementProps {
  onCreateSchedule?: () => void;
}

export interface EndpointHistoryButtonProps {
  jobId?: string;
}

export interface DropdownMenuWithAutoDirectionProps {
  children: React.ReactNode;
  forceDirection?: 'top' | 'bottom' | 'auto';
}

export default {};
