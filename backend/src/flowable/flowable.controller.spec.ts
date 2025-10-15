import { Test, TestingModule } from '@nestjs/testing';
import { FlowableController } from './flowable.controller';
import { FlowableService } from './flowable.service';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('FlowableController', () => {
  let controller: FlowableController;

  const mockFlowableService = {
    startProcess: jest.fn(),
    getTasksForRole: jest.fn(),
    getTasksForUser: jest.fn(),
    completeTask: jest.fn(),
    getProcessInstanceById: jest.fn(),
    getConfigFromProcess: jest.fn(),
    getActiveProcesses: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    validated: { isValid: true },
    validClaims: [],
    token: {
      tenantId: 'tenant-1',
      sub: 'user-1',
      iat: Date.now(),
      exp: Date.now() + 3600000,
      sid: 'session-1',
      iss: 'tazama',
      tokenString: 'mock-token',
      clientId: 'client-1',
      claims: [],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlowableController],
      providers: [{ provide: FlowableService, useValue: mockFlowableService }],
    }).compile();

    controller = module.get<FlowableController>(FlowableController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startProcess', () => {
    it('should start a process with tenant ID from user', async () => {
      const dto = {
        configId: 'config-123',
        tenantId: 'tenant-1',
        initiator: 'user-1',
      };

      const expectedResponse = {
        id: 'process-123',
        processDefinitionKey: 'config-approval-process',
      };

      mockFlowableService.startProcess.mockResolvedValue(expectedResponse);

      const result = await controller.startProcess(dto, mockUser);

      expect(result).toEqual(expectedResponse);
      expect(mockFlowableService.startProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          configId: 'config-123',
          tenantId: 'tenant-1',
        }),
      );
    });
  });

  describe('getTasksForRole', () => {
    it('should get tasks for approver role', async () => {
      const mockTasks = [
        { id: 'task-1', name: 'Review Configuration' },
        { id: 'task-2', name: 'Review Configuration' },
      ];

      mockFlowableService.getTasksForRole.mockResolvedValue(mockTasks);

      const result = await controller.getTasksForRole('approver');

      expect(result).toEqual(mockTasks);
      expect(mockFlowableService.getTasksForRole).toHaveBeenCalledWith(
        'approver',
      );
    });

    it('should get tasks for editor role', async () => {
      const mockTasks = [{ id: 'task-3', name: 'Revise Configuration' }];

      mockFlowableService.getTasksForRole.mockResolvedValue(mockTasks);

      const result = await controller.getTasksForRole('editor');

      expect(result).toEqual(mockTasks);
      expect(mockFlowableService.getTasksForRole).toHaveBeenCalledWith(
        'editor',
      );
    });
  });

  describe('getTasksForUser', () => {
    it('should get tasks assigned to specific user', async () => {
      const mockTasks = [
        { id: 'task-4', name: 'Revise Configuration', assignee: 'user-1' },
      ];

      mockFlowableService.getTasksForUser.mockResolvedValue(mockTasks);

      const result = await controller.getTasksForUser('user-1');

      expect(result).toEqual(mockTasks);
      expect(mockFlowableService.getTasksForUser).toHaveBeenCalledWith(
        'user-1',
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

      const expectedResponse = { success: true };

      mockFlowableService.completeTask.mockResolvedValue(expectedResponse);

      const result = await controller.completeTask(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockFlowableService.completeTask).toHaveBeenCalledWith(dto);
    });

    it('should complete task with rejection', async () => {
      const dto = {
        taskId: 'task-123',
        variables: {
          approvalStatus: 'rejected',
          remarks: 'Needs changes',
        },
      };

      mockFlowableService.completeTask.mockResolvedValue({ success: true });

      await controller.completeTask(dto);

      expect(mockFlowableService.completeTask).toHaveBeenCalledWith(dto);
    });

    it('should complete revision task with resubmit', async () => {
      const dto = {
        taskId: 'task-456',
        variables: {
          revisionAction: 'resubmit',
        },
      };

      mockFlowableService.completeTask.mockResolvedValue({ success: true });

      await controller.completeTask(dto);

      expect(mockFlowableService.completeTask).toHaveBeenCalledWith(dto);
    });

    it('should complete revision task with cancel', async () => {
      const dto = {
        taskId: 'task-456',
        variables: {
          revisionAction: 'cancel',
        },
      };

      mockFlowableService.completeTask.mockResolvedValue({ success: true });

      await controller.completeTask(dto);

      expect(mockFlowableService.completeTask).toHaveBeenCalledWith(dto);
    });
  });

  describe('getProcessInstance', () => {
    it('should get process instance by ID', async () => {
      const mockProcess = {
        id: 'process-123',
        processDefinitionKey: 'config-approval-process',
      };

      mockFlowableService.getProcessInstanceById.mockResolvedValue(mockProcess);

      const result = await controller.getProcessInstance('process-123');

      expect(result).toEqual(mockProcess);
      expect(mockFlowableService.getProcessInstanceById).toHaveBeenCalledWith(
        'process-123',
      );
    });
  });

  describe('getConfigFromProcess', () => {
    it('should get config data from process instance', async () => {
      const mockConfig = {
        configId: 'config-123',
        msgFam: 'pacs.008',
        transactionType: 'credit_transfer',
        endpointPath: '/api/pacs008',
        schema: { type: 'object' },
      };

      mockFlowableService.getConfigFromProcess.mockResolvedValue(mockConfig);

      const result = await controller.getConfigFromProcess('process-123');

      expect(result).toEqual(mockConfig);
      expect(mockFlowableService.getConfigFromProcess).toHaveBeenCalledWith(
        'process-123',
      );
    });
  });

  describe('getActiveProcesses', () => {
    it('should get active processes for tenant', async () => {
      const mockProcesses = [
        { id: 'process-1', tenantId: 'tenant-1' },
        { id: 'process-2', tenantId: 'tenant-1' },
      ];

      mockFlowableService.getActiveProcesses.mockResolvedValue(mockProcesses);

      const result = await controller.getActiveProcesses(mockUser);

      expect(result).toEqual(mockProcesses);
      expect(mockFlowableService.getActiveProcesses).toHaveBeenCalledWith(
        'tenant-1',
      );
    });

    it('should use default tenant ID if not in token', async () => {
      const userWithoutTenant: AuthenticatedUser = {
        userId: 'user-1',
        tenantId: '',
        validated: { isValid: true },
        validClaims: [],
        token: {
          tenantId: '',
          sub: 'user-1',
          iat: Date.now(),
          exp: Date.now() + 3600000,
          sid: 'session-1',
          iss: 'tazama',
          tokenString: 'mock-token',
          clientId: 'client-1',
          claims: [],
        },
      };

      mockFlowableService.getActiveProcesses.mockResolvedValue([]);

      await controller.getActiveProcesses(userWithoutTenant);

      expect(mockFlowableService.getActiveProcesses).toHaveBeenCalledWith(
        'default',
      );
    });
  });
});
