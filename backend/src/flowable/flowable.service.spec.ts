import { Test, TestingModule } from '@nestjs/testing';
import { FlowableService } from './flowable.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('FlowableService', () => {
  let service: FlowableService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        FLOWABLE_URL: 'http://localhost:8080',
        FLOWABLE_USER: 'admin',
        FLOWABLE_PASS: 'test',
        FLOWABLE_DEBUG: 'false',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlowableService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FlowableService>(FlowableService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with Flowable configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('FLOWABLE_URL');
      expect(configService.get).toHaveBeenCalledWith('FLOWABLE_USER');
      expect(configService.get).toHaveBeenCalledWith('FLOWABLE_PASS');
    });
  });

  describe('startProcess', () => {
    it('should start a process with config data', async () => {
      const dto = {
        configId: 'config-123',
        tenantId: 'tenant-1',
        initiator: 'user-1',
      };

      const configData = {
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: { field1: 'mapped1' },
        originalPayload: '{}',
        createdBy: 'user-1',
      };

      const mockResponse: AxiosResponse = {
        data: {
          id: 'process-123',
          processDefinitionKey: 'config-approval-process',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.startProcess(dto, configData);

      expect(result.id).toBe('process-123');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/runtime/process-instances'),
        expect.objectContaining({
          processDefinitionKey: 'config-approval-process',
          businessKey: 'config-config-123',
        }),
        expect.any(Object),
      );
    });

    it('should handle errors when starting process', async () => {
      const dto = {
        configId: 'config-123',
        tenantId: 'tenant-1',
        initiator: 'user-1',
      };

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.startProcess(dto)).rejects.toThrow(
        'Flowable API error',
      );
    });
  });

  describe('getTasksForRole', () => {
    it('should get tasks for approver role', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          data: [
            {
              id: 'task-1',
              name: 'Review Configuration',
              assignee: null,
              candidateGroups: ['approver'],
            },
            {
              id: 'task-2',
              name: 'Review Configuration',
              assignee: null,
              candidateGroups: ['approver'],
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getTasksForRole('approver');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/runtime/tasks'),
        expect.objectContaining({
          params: { candidateGroup: 'approver' },
        }),
      );
    });

    it('should return empty array when no tasks found', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getTasksForRole('approver');

      expect(result).toHaveLength(0);
    });
  });

  describe('getTasksForUser', () => {
    it('should get tasks assigned to specific user', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          data: [
            {
              id: 'task-3',
              name: 'Revise Configuration',
              assignee: 'user-1',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getTasksForUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Revise Configuration');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/runtime/tasks'),
        expect.objectContaining({
          params: { assignee: 'user-1' },
        }),
      );
    });
  });

  describe('completeTask', () => {
    it('should complete task with approval', async () => {
      const dto = {
        taskId: 'task-123',
        variables: {
          approvalStatus: 'approved',
          remarks: 'Looks good',
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.completeTask(dto);

      expect(result.success).toBe(true);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/runtime/tasks/task-123'),
        expect.objectContaining({
          action: 'complete',
          variables: expect.arrayContaining([
            { name: 'approvalStatus', value: 'approved' },
            { name: 'remarks', value: 'Looks good' },
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should complete task with rejection', async () => {
      const dto = {
        taskId: 'task-123',
        variables: {
          approvalStatus: 'rejected',
          remarks: 'Needs improvement',
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.completeTask(dto);

      expect(mockHttpService.post).toHaveBeenCalled();
    });
  });

  describe('startWorkflowWithDraft', () => {
    it('should start workflow with draft config data', async () => {
      const configData = {
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/pacs008',
        version: '1.0',
        contentType: 'application/json',
        schema: { type: 'object' },
        mapping: {},
        originalPayload: '{}',
      };

      const mockResponse: AxiosResponse = {
        data: {
          id: 'process-456',
          processDefinitionKey: 'config-approval-process',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.startWorkflowWithDraft(
        configData,
        'tenant-1',
        'user-1',
      );

      expect(result.processInstanceId).toBe('process-456');
      expect(result.configId).toBeDefined();
    });
  });

  describe('getProcessVariables', () => {
    it('should get all process variables', async () => {
      const mockResponse: AxiosResponse = {
        data: [
          { name: 'configId', value: 'config-123' },
          { name: 'msgFam', value: 'pacs.008' },
          { name: 'schema', value: '{"type":"object"}' },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getProcessVariables('process-123');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('configId');
    });
  });

  describe('getConfigFromProcess', () => {
    it('should get and parse config data from process', async () => {
      const mockResponse: AxiosResponse = {
        data: [
          { name: 'configId', value: 'config-123' },
          { name: 'msgFam', value: 'pacs.008' },
          { name: 'schema', value: '{"type":"object"}' },
          { name: 'mapping', value: '{"field1":"mapped1"}' },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getConfigFromProcess('process-123');

      expect(result.configId).toBe('config-123');
      expect(result.msgFam).toBe('pacs.008');
      expect(result.schema).toEqual({ type: 'object' });
      expect(result.mapping).toEqual({ field1: 'mapped1' });
    });

    it('should handle invalid JSON in schema gracefully', async () => {
      const mockResponse: AxiosResponse = {
        data: [
          { name: 'configId', value: 'config-123' },
          { name: 'schema', value: 'invalid json' },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getConfigFromProcess('process-123');

      expect(result.configId).toBe('config-123');
      expect(result.schema).toBe('invalid json');
    });
  });

  describe('getActiveProcesses', () => {
    it('should get active processes for tenant', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          data: [
            { id: 'process-1', tenantId: 'tenant-1' },
            { id: 'process-2', tenantId: 'tenant-1' },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getActiveProcesses('tenant-1');

      expect(result).toHaveLength(2);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/runtime/process-instances'),
        expect.objectContaining({
          params: expect.objectContaining({
            processDefinitionKey: 'config-approval-process',
            tenantId: 'tenant-1',
          }),
        }),
      );
    });
  });
});
