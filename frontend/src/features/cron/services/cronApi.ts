import { apiClient } from "../../shared/services/apiClient";
import { API_CONFIG } from "../../../config/api.config";

// Types for CRON
export interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression
  command: string;
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
  status: "running" | "stopped" | "error";
}

export interface CronJobLog {
  id: string;
  jobId: string;
  executionTime: string;
  status: "success" | "failure";
  output?: string;
  errorMessage?: string;
  duration: number;
}

export interface ScheduleRequest {
  jobId: string;
  schedule: string;
  isActive: boolean;
}

// CRON API service
export class CronApiService {
  // Job management
  async getCronJobs(): Promise<CronJob[]> {
    return apiClient.get<CronJob[]>(API_CONFIG.ENDPOINTS.CRON.JOBS);
  }

  async createCronJob(
    job: Omit<CronJob, "id" | "lastRun" | "nextRun" | "status">,
  ): Promise<CronJob> {
    return apiClient.post<CronJob>(API_CONFIG.ENDPOINTS.CRON.JOBS, job);
  }

  async updateCronJob(id: string, job: Partial<CronJob>): Promise<CronJob> {
    return apiClient.put<CronJob>(
      `${API_CONFIG.ENDPOINTS.CRON.JOBS}/${id}`,
      job,
    );
  }

  async deleteCronJob(id: string): Promise<void> {
    return apiClient.delete<void>(`${API_CONFIG.ENDPOINTS.CRON.JOBS}/${id}`);
  }

  // Job control
  async startJob(id: string): Promise<CronJob> {
    return apiClient.post<CronJob>(
      `${API_CONFIG.ENDPOINTS.CRON.JOBS}/${id}/start`,
    );
  }

  async stopJob(id: string): Promise<CronJob> {
    return apiClient.post<CronJob>(
      `${API_CONFIG.ENDPOINTS.CRON.JOBS}/${id}/stop`,
    );
  }

  async executeJob(id: string): Promise<CronJobLog> {
    return apiClient.post<CronJobLog>(
      `${API_CONFIG.ENDPOINTS.CRON.JOBS}/${id}/execute`,
    );
  }

  // Scheduling
  async updateSchedule(request: ScheduleRequest): Promise<CronJob> {
    return apiClient.put<CronJob>(API_CONFIG.ENDPOINTS.CRON.SCHEDULE, request);
  }

  // Logs
  async getCronLogs(jobId?: string): Promise<CronJobLog[]> {
    const url = jobId
      ? `${API_CONFIG.ENDPOINTS.CRON.LOGS}?jobId=${jobId}`
      : API_CONFIG.ENDPOINTS.CRON.LOGS;
    return apiClient.get<CronJobLog[]>(url);
  }

  async getCronLogById(id: string): Promise<CronJobLog> {
    return apiClient.get<CronJobLog>(`${API_CONFIG.ENDPOINTS.CRON.LOGS}/${id}`);
  }
}

export const cronApi = new CronApiService();
