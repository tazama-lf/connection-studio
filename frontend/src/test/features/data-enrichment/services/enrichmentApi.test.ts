import {
  dataEnrichmentApi,
  DataEnrichmentApiService,
} from '../../../../features/data-enrichment/services/enrichmentApi';
import { apiClient } from '../../../../shared/services/apiClient';
import type {
  SftpDataEnrichmentJob,
  HttpDataEnrichmentJob,
  JobListResponse,
} from '../../../../features/data-enrichment/types';

// Mock the apiClient
jest.mock('../../../../shared/services/apiClient');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock API_CONFIG
jest.mock('../../../../shared/config/api.config', () => ({
  API_CONFIG: {
    ENDPOINTS: {
      DATA_ENRICHMENT: {
        MAPPINGS: '/api/enrichment/mappings',
        TEMPLATES: '/api/enrichment/templates',
        TRANSFORM: '/api/enrichment/transform',
        JOBS: '/job',
      },
    },
  },
}));

describe('DataEnrichmentApiService', () => {
  let service: DataEnrichmentApiService;

  beforeEach(() => {
    service = new DataEnrichmentApiService();
    jest.clearAllMocks();
  });

  describe('Mapping Rules', () => {
    describe('getMappingRules', () => {
      it('should fetch all mapping rules', async () => {
        const mockRules = [
          {
            id: '1',
            name: 'Test Rule',
            sourceField: 'input.field',
            targetField: 'output.field',
            transformation: 'uppercase',
            isActive: true,
          },
        ];

        mockedApiClient.get.mockResolvedValue(mockRules);

        const result = await service.getMappingRules();

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          '/api/enrichment/mappings',
        );
        expect(result).toEqual(mockRules);
      });

      it('should handle API errors when fetching mapping rules', async () => {
        const error = new Error('API Error');
        mockedApiClient.get.mockRejectedValue(error);

        await expect(service.getMappingRules()).rejects.toThrow('API Error');
      });
    });

    describe('createMappingRule', () => {
      it('should create a new mapping rule', async () => {
        const newRule = {
          name: 'New Rule',
          sourceField: 'input.newField',
          targetField: 'output.newField',
          transformation: 'lowercase',
          isActive: true,
        };

        const createdRule = { id: '2', ...newRule };
        mockedApiClient.post.mockResolvedValue(createdRule);

        const result = await service.createMappingRule(newRule);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/enrichment/mappings',
          newRule,
        );
        expect(result).toEqual(createdRule);
      });

      it('should handle validation errors when creating mapping rule', async () => {
        const invalidRule = {
          name: '',
          sourceField: 'input.field',
          targetField: 'output.field',
          transformation: 'uppercase',
          isActive: true,
        };

        const error = new Error('Validation Error');
        mockedApiClient.post.mockRejectedValue(error);

        await expect(service.createMappingRule(invalidRule)).rejects.toThrow(
          'Validation Error',
        );
      });
    });

    describe('updateMappingRule', () => {
      it('should update an existing mapping rule', async () => {
        const ruleId = '1';
        const updates = { name: 'Updated Rule', isActive: false };
        const updatedRule = {
          id: ruleId,
          name: 'Updated Rule',
          sourceField: 'input.field',
          targetField: 'output.field',
          transformation: 'uppercase',
          isActive: false,
        };

        mockedApiClient.put.mockResolvedValue(updatedRule);

        const result = await service.updateMappingRule(ruleId, updates);

        expect(mockedApiClient.put).toHaveBeenCalledWith(
          '/api/enrichment/mappings/1',
          updates,
        );
        expect(result).toEqual(updatedRule);
      });
    });

    describe('deleteMappingRule', () => {
      it('should delete a mapping rule', async () => {
        const ruleId = '1';
        mockedApiClient.delete.mockResolvedValue(undefined);

        await service.deleteMappingRule(ruleId);

        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          '/api/enrichment/mappings/1',
        );
      });

      it('should handle errors when deleting mapping rule', async () => {
        const ruleId = '1';
        const error = new Error('Delete Error');
        mockedApiClient.delete.mockRejectedValue(error);

        await expect(service.deleteMappingRule(ruleId)).rejects.toThrow(
          'Delete Error',
        );
      });
    });
  });

  describe('Templates', () => {
    describe('getTemplates', () => {
      it('should fetch all templates', async () => {
        const mockTemplates = [
          {
            id: '1',
            name: 'Test Template',
            description: 'A test template',
            mappingRules: [],
            createdAt: '2023-01-01T00:00:00Z',
          },
        ];

        mockedApiClient.get.mockResolvedValue(mockTemplates);

        const result = await service.getTemplates();

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          '/api/enrichment/templates',
        );
        expect(result).toEqual(mockTemplates);
      });
    });

    describe('createTemplate', () => {
      it('should create a new template', async () => {
        const newTemplate = {
          name: 'New Template',
          description: 'A new template',
          mappingRules: [],
        };

        const createdTemplate = {
          id: '2',
          ...newTemplate,
          createdAt: '2023-01-01T00:00:00Z',
        };

        mockedApiClient.post.mockResolvedValue(createdTemplate);

        const result = await service.createTemplate(newTemplate);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/enrichment/templates',
          newTemplate,
        );
        expect(result).toEqual(createdTemplate);
      });
    });

    describe('updateTemplate', () => {
      it('should update an existing template', async () => {
        const templateId = '1';
        const updates = { name: 'Updated Template' };
        const updatedTemplate = {
          id: templateId,
          name: 'Updated Template',
          description: 'A test template',
          mappingRules: [],
          createdAt: '2023-01-01T00:00:00Z',
        };

        mockedApiClient.put.mockResolvedValue(updatedTemplate);

        const result = await service.updateTemplate(templateId, updates);

        expect(mockedApiClient.put).toHaveBeenCalledWith(
          '/api/enrichment/templates/1',
          updates,
        );
        expect(result).toEqual(updatedTemplate);
      });
    });

    describe('deleteTemplate', () => {
      it('should delete a template', async () => {
        const templateId = '1';
        mockedApiClient.delete.mockResolvedValue(undefined);

        await service.deleteTemplate(templateId);

        expect(mockedApiClient.delete).toHaveBeenCalledWith(
          '/api/enrichment/templates/1',
        );
      });
    });
  });

  describe('Data Transformation', () => {
    describe('transformData', () => {
      it('should transform data using a template', async () => {
        const transformRequest = {
          templateId: '1',
          data: { inputField: 'test value' },
        };

        const transformResponse = {
          transformedData: { outputField: 'TEST VALUE' },
          appliedRules: ['rule1', 'rule2'],
        };

        mockedApiClient.post.mockResolvedValue(transformResponse);

        const result = await service.transformData(transformRequest);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/api/enrichment/transform',
          transformRequest,
        );
        expect(result).toEqual(transformResponse);
      });

      it('should handle transformation errors', async () => {
        const transformRequest = {
          templateId: '1',
          data: { inputField: 'test value' },
        };

        const transformResponse = {
          transformedData: {},
          appliedRules: [],
          errors: ['Transformation failed'],
        };

        mockedApiClient.post.mockResolvedValue(transformResponse);

        const result = await service.transformData(transformRequest);

        expect(result).toEqual(transformResponse);
        expect(result.errors).toContain('Transformation failed');
      });

      it('should handle API errors during transformation', async () => {
        const transformRequest = {
          templateId: '1',
          data: { inputField: 'test value' },
        };

        const error = new Error('Transform API Error');
        mockedApiClient.post.mockRejectedValue(error);

        await expect(service.transformData(transformRequest)).rejects.toThrow(
          'Transform API Error',
        );
      });
    });
  });

  describe('Job Management', () => {
    describe('getAllJobs', () => {
      it('should fetch all jobs with pagination', async () => {
        const mockResponse: JobListResponse = {
          jobs: [
            {
              id: 1,
              endpoint_name: 'Test Endpoint',
              description: 'Test Description',
              table_name: 'test_table',
              job_status: 'PENDING',
              config_type: 'Pull',
              source_type: 'HTTP',
              schedule_id: 1,
              connection: {
                url: 'http://test.com',
                headers: {},
              },
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        mockedApiClient.get.mockResolvedValue(mockResponse);

        const result = await service.getAllJobs(1, 10);

        expect(mockedApiClient.get).toHaveBeenCalledWith(
          '/job/all?page=1&limit=10',
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle empty job list', async () => {
        const mockResponse: JobListResponse = {
          jobs: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        };

        mockedApiClient.get.mockResolvedValue(mockResponse);

        const result = await service.getAllJobs();

        expect(result).toEqual(mockResponse);
      });
    });

    describe('createJob', () => {
      it('should create a new HTTP job successfully', async () => {
        const mockJobData: Omit<HttpDataEnrichmentJob, 'id' | 'job_status'> = {
          endpoint_name: 'New HTTP Endpoint',
          description: 'New HTTP job description',
          table_name: 'new_table',
          config_type: 'Pull' as const,
          source_type: 'HTTP' as const,
          schedule_id: 1,
          connection: {
            url: 'https://api.example.com/data',
            headers: {
              Authorization: 'Bearer token123',
              'Content-Type': 'application/json',
            },
          },
        };

        const mockResponse = {
          id: 1,
          job_status: 'PENDING' as const,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          ...mockJobData,
        };

        mockedApiClient.post.mockResolvedValue(mockResponse);

        const result = await service.createJob(mockJobData);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/job/create',
          mockJobData,
        );
        expect(result).toEqual(mockResponse);
      });

      it('should create a new SFTP job successfully', async () => {
        const mockJobData: Omit<SftpDataEnrichmentJob, 'id' | 'job_status'> = {
          endpoint_name: 'New SFTP Endpoint',
          description: 'New SFTP job description',
          table_name: 'sftp_table',
          config_type: 'Push' as const,
          source_type: 'SFTP' as const,
          schedule_id: 1,
          connection: {
            host: 'sftp.example.com',
            port: 22,
            auth_type: 'USERNAME_PASSWORD' as const,
            user_name: 'testuser',
            password: 'testpass',
          },
          file: {
            path: '/data/export.csv',
            file_type: 'CSV' as const,
            delimiter: ',',
            header: true,
            encoding: 'utf-8' as const,
          },
        };

        const mockResponse = {
          id: 2,
          job_status: 'PENDING' as const,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          ...mockJobData,
        };

        mockedApiClient.post.mockResolvedValue(mockResponse);

        const result = await service.createJob(mockJobData);

        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/job/create',
          mockJobData,
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getJobById', () => {
      it('should fetch job by ID successfully', async () => {
        const mockJob = {
          id: 1,
          endpoint_name: 'Test Endpoint',
          description: 'Test Description',
          table_name: 'test_table',
          job_status: 'PENDING' as const,
          config_type: 'Pull' as const,
          source_type: 'HTTP' as const,
          schedule_id: 1,
          connection: {
            url: 'http://test.com',
            headers: {},
          },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        mockedApiClient.get.mockResolvedValue(mockJob);

        const result = await service.getJobById(1);

        expect(mockedApiClient.get).toHaveBeenCalledWith('/job/1');
        expect(result).toEqual(mockJob);
      });
    });

    describe('updateJob', () => {
      it('should update job successfully', async () => {
        const mockJobData = {
          endpoint_name: 'Updated Endpoint',
          description: 'Updated description',
          table_name: 'updated_table',
          config_type: 'Push' as const,
          source_type: 'HTTP' as const,
          schedule_id: 1,
          connection: {
            url: 'https://updated.example.com',
            headers: {},
          },
        };

        const mockResponse = {
          id: 1,
          job_status: 'PENDING' as const,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T01:00:00Z',
          ...mockJobData,
        };

        mockedApiClient.put.mockResolvedValue(mockResponse);

        const result = await service.updateJob(1, mockJobData);

        expect(mockedApiClient.put).toHaveBeenCalledWith('/job/1', mockJobData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('deleteJob', () => {
      it('should delete job successfully', async () => {
        mockedApiClient.delete.mockResolvedValue(undefined);

        await service.deleteJob(1);

        expect(mockedApiClient.delete).toHaveBeenCalledWith('/job/1');
      });
    });

    describe('executeJob', () => {
      it('should execute job successfully', async () => {
        const mockResponse = { message: 'Job execution started' };
        mockedApiClient.post.mockResolvedValue(mockResponse);

        const result = await service.executeJob(1);

        expect(mockedApiClient.post).toHaveBeenCalledWith('/job/1/execute');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('dataEnrichmentApi singleton', () => {
    it('should export a singleton instance', () => {
      expect(dataEnrichmentApi).toBeInstanceOf(DataEnrichmentApiService);
    });

    it('should have all required methods', () => {
      expect(typeof dataEnrichmentApi.getMappingRules).toBe('function');
      expect(typeof dataEnrichmentApi.createMappingRule).toBe('function');
      expect(typeof dataEnrichmentApi.updateMappingRule).toBe('function');
      expect(typeof dataEnrichmentApi.deleteMappingRule).toBe('function');
      expect(typeof dataEnrichmentApi.getTemplates).toBe('function');
      expect(typeof dataEnrichmentApi.createTemplate).toBe('function');
      expect(typeof dataEnrichmentApi.updateTemplate).toBe('function');
      expect(typeof dataEnrichmentApi.deleteTemplate).toBe('function');
      expect(typeof dataEnrichmentApi.transformData).toBe('function');
      // New job management methods
      expect(typeof dataEnrichmentApi.getAllJobs).toBe('function');
      expect(typeof dataEnrichmentApi.createJob).toBe('function');
      expect(typeof dataEnrichmentApi.getJobById).toBe('function');
      expect(typeof dataEnrichmentApi.updateJob).toBe('function');
      expect(typeof dataEnrichmentApi.deleteJob).toBe('function');
      expect(typeof dataEnrichmentApi.executeJob).toBe('function');
    });
  });
});
