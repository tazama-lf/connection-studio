import {
  cronApi,
  CronApiService,
} from '../../../../features/cron/services/cronApi';
import type { CronJob } from '../../../../features/cron/services/cronApi';
import { apiClient } from '../../../../shared/services/apiClient';

// Mock the apiClient
jest.mock('../../../../shared/services/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock API_CONFIG
jest.mock('../../../../shared/config/api.config', () => ({
  API_CONFIG: {
    ENDPOINTS: {
      CRON: {
        JOBS: '/cron/jobs',
        SCHEDULE: '/cron/schedule',
        LOGS: '/cron/logs',
      },
    },
  },
}));

describe('CronApiService', () => {
  let service: CronApiService;

  beforeEach(() => {
    service = new CronApiService();
    jest.clearAllMocks();
  });

  describe('getCronJobs', () => {
    it('should fetch all cron jobs', async () => {
      const mockJobs: CronJob[] = [
        {
          id: '1',
          name: 'Test Job',
          schedule: '0 12 * * *',
          command: 'node script.js',
          isActive: true,
          nextRun: '2023-12-26T12:00:00Z',
          status: 'running',
        },
      ];

      mockedApiClient.get.mockResolvedValue(mockJobs);

      const result = await service.getCronJobs();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/cron/jobs');
      expect(result).toEqual(mockJobs);
    });
  });

  describe('createCronJob', () => {
    it('should create a new cron job successfully', async () => {
      const jobData = {
        name: 'New Cron Job',
        schedule: '0 12 * * *',
        command: 'node script.js',
        isActive: true,
      };

      const mockResponse: CronJob = {
        id: '3',
        status: 'running',
        nextRun: '2023-12-26T12:00:00Z',
        lastRun: undefined,
        ...jobData,
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.createCronJob(jobData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/cron/jobs', jobData);
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('cronApi instance', () => {
  it('should be an instance of CronApiService', () => {
    expect(cronApi).toBeInstanceOf(CronApiService);
  });

  it('should have all required methods', () => {
    expect(typeof cronApi.getCronJobs).toBe('function');
    expect(typeof cronApi.createCronJob).toBe('function');
    expect(typeof cronApi.updateCronJob).toBe('function');
    expect(typeof cronApi.deleteCronJob).toBe('function');
    expect(typeof cronApi.startJob).toBe('function');
    expect(typeof cronApi.stopJob).toBe('function');
    expect(typeof cronApi.executeJob).toBe('function');
    expect(typeof cronApi.updateSchedule).toBe('function');
    expect(typeof cronApi.getCronLogs).toBe('function');
    expect(typeof cronApi.getCronLogById).toBe('function');
  });
});
