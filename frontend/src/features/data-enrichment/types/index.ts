// Data Enrichment Job Types - Aligned with Backend

export type ConfigType = 'Pull' | 'Push';
export type SourceType = 'HTTP' | 'SFTP';
export type JobStatus = 'in-progress' | 'under-review' | 'approved' | 'rejected' | 'exported' | 'ready-for-deployment' | 'deployed';
export type AuthType = 'USERNAME_PASSWORD' | 'PRIVATE_KEY';
export type FileType = 'CSV' | 'JSON' | 'TSV';
export type EncodingType = 'utf-8' | 'ascii' | 'latin1' | 'utf16le';

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
  record_status?: 'active' | 'in-active' | null; // Activation status
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

export default {};
