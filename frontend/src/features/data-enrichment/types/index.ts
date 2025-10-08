// Data Enrichment Job Types - Aligned with Backend

export type ConfigType = 'Pull' | 'Push';
export type SourceType = 'HTTP' | 'SFTP';
export type JobStatus = 'PENDING' | 'IN-PROGRESS' | 'SUSPENDED' | 'CLONED';
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

// File Configuration for SFTP
export interface FileConfig {
  path: string;
  file_type: FileType;
  delimiter: string;
  header: boolean;
  encoding: EncodingType;
}

// Schedule types
export interface ScheduleRequest {
  name: string;
  cron: string;
  iterations: number;
}

export interface ScheduleResponse {
  id: number;
  name: string;
  cron: string;
  iterations: number;
  schedule_status: string;
  next_time: string | null;
  created_at?: string;
}

// Base Data Enrichment Job
export interface DataEnrichmentJobBase {
  config_type: ConfigType;
  endpoint_name: string;
  schedule_id: number;
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
  endpoint_name: string;
  schedule_id: number;
  source_type: SourceType;
  description: string;
  connection: HttpConnection | SftpConnection;
  file?: FileConfig; // Only for SFTP
  table_name: string;
  mode?: 'append' | 'replace';
}

export interface CreatePushJobDto {
  endpoint_name: string;
  path: string; // Push jobs use path instead of connection/source_type
  description: string;
  table_name: string;
  mode?: 'append' | 'replace';
}

// Job creation request (without id and status) - Legacy for compatibility
export type CreateDataEnrichmentJobRequest = CreatePullJobDto | CreatePushJobDto;

// Job response with ID and metadata - using intersection instead of extends
export type DataEnrichmentJobResponse = DataEnrichmentJob & {
  id: string; // Backend uses UUID string ID
  job_status?: JobStatus; // Optional in response
  created_at?: string; // Backend returns dates as strings
  updated_at?: string;
};

// Pagination for job listing
export interface JobListResponse {
  jobs: DataEnrichmentJobResponse[];
  total: number;
  page: number;
  limit: number;
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
