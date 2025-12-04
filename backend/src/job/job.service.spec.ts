import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  ConfigType,
  FileType,
  IngestMode,
  Job,
  JobStatus,
  ScheduleStatus,
  SourceType,
} from '@tazama-lf/tcs-lib';
import { AuthenticatedUser } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { DryRunService } from '../dry-run/dry-run.service';
import { NotifyService } from '../notify/notify.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { NotificationService } from '../notification/notification.service';
import * as helpers from '../../src/utils/helpers';

jest.spyOn(helpers, 'encrypt').mockReturnValue('encrypted-password');

describe('JobService', () => {
  let service: JobService;
  let loggerService: jest.Mocked<LoggerService>;
  let dryRunService: jest.Mocked<DryRunService>;
  let sftpService: jest.Mocked<SftpService>;
  let notifyService: jest.Mocked<NotifyService>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;
  let schedulerService: jest.Mocked<SchedulerService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockToken = 'mock-jwt-token';
  const mockTenantId = 'tenant_abc';
  const mockJobId = 'job-test-id-123';

  const mockUser: AuthenticatedUser = {
    tenantId: mockTenantId,
    validClaims: ['EDITOR'],
    token: {
      tokenString: mockToken,
    },
  } as AuthenticatedUser;

  const mockPushJob = {
    id: mockJobId,
    endpoint_name: 'Test Endpoint',
    schedule_id: 'schedule-123',
    path: '/test/path',
    table_name: 'test_table',
    description: 'Test description',
    version: 'v1',
    mode: IngestMode.APPEND,
    status: JobStatus.INPROGRESS,
    tenant_id: mockTenantId,
    publishing_status: ScheduleStatus.INACTIVE,
    created_at: new Date(),
    type: 'push' as 'push' | 'pull',
  };

  const mockPullJob = {
    id: mockJobId,
    endpoint_name: 'Test Pull Job',
    table_name: 'test_pull_table',
    description: 'Test pull description',
    version: 'v1',
    mode: IngestMode.APPEND,
    schedule_id: 'schedule-123',
    source_type: SourceType.HTTP,
    file: { path: 'test.csv', file_type: FileType.CSV, delimiter: ',' },
    connection: {
      url: '/v1/enrich/ACM102/customerdata',
      headers: { 'content-type': 'application/json' },
    },
    status: JobStatus.INPROGRESS,
    tenant_id: mockTenantId,
    path: '/v1/test',
    publishing_status: ScheduleStatus.ACTIVE,
    created_at: new Date(),
    type: 'push' as 'push' | 'pull',
  };

  const mockSchedule = {
    id: 'schedule-123',
    name: 'Test Schedule',
    cron: '0 0 * * *',
    status: JobStatus.APPROVED,
    tenant_id: mockTenantId,
    iterations: 12,
    start_date: new Date(),
    comments: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: SchedulerService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DryRunService,
          useValue: {
            dryRun: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SftpService,
          useValue: {
            createFile: jest.fn(),
            readFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: NotifyService,
          useValue: {
            notifyEnrichment: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: AdminServiceClient,
          useValue: {
            createPushJob: jest.fn(),
            createPullJob: jest.fn(),
            getAllJobs: jest.fn(),
            findJobById: jest.fn(),
            findJobByStatus: jest.fn(),
            updateJob: jest.fn(),
            updateJobActivation: jest.fn(),
            updateJobByStatus: jest.fn(),
            validateExisting: jest.fn(),
            findScheduleById: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendWorkflowNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    loggerService = module.get(LoggerService);
    dryRunService = module.get(DryRunService);
    sftpService = module.get(SftpService);
    notifyService = module.get(NotifyService);
    adminServiceClient = module.get(AdminServiceClient);
    schedulerService = module.get(SchedulerService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateJob', () => {
    const updateDto = {
      endpoint_name: 'Updated Endpoint',
      description: 'Updated description',
    };

    it('should update a push job successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Job updated successfully',
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.INPROGRESS,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue(expectedResult);

      const result = await service.updateJob(
        mockJobId,
        updateDto,
        ConfigType.PUSH,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          ...updateDto,
        }),
        ConfigType.PUSH,
        mockToken,
      );
    });

    it('should update a rejected job successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Job updated successfully',
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.REJECTED,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue(expectedResult);

      const result = await service.updateJob(
        mockJobId,
        updateDto,
        ConfigType.PUSH,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          ...updateDto,
        }),
        ConfigType.PUSH,
        mockToken,
      );
    });

    it('should update a pull job with HTTP connection', async () => {
      const pullUpdateDto = {
        endpoint_name: 'Updated Pull Job',
        source_type: SourceType.HTTP,
        connection: {
          url: '/v1/updated',
          headers: { 'content-type': 'application/json' },
        },
      };

      const expectedResult = {
        success: true,
        message: 'Job updated successfully',
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPullJob,
        status: JobStatus.INPROGRESS,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue(expectedResult);

      const result = await service.updateJob(
        mockJobId,
        pullUpdateDto,
        ConfigType.PULL,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          ...pullUpdateDto,
        }),
        ConfigType.PULL,
        mockToken,
      );
    });

    it('should update a pull job with SFTP connection and encrypt credentials', async () => {
      const pullUpdateDto = {
        endpoint_name: 'Updated SFTP Job',
        source_type: SourceType.SFTP,
        file: { path: 'test.csv', file_type: FileType.CSV, delimiter: ',' },
        connection: {
          host: 'sftp.example.com',
          port: 22,
          auth_type: AuthType.USERNAME_PASSWORD,
          user_name: 'testuser',
          password: 'plaintext-password',
        },
      };

      const expectedResult = {
        success: true,
        message: 'Job updated successfully',
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPullJob,
        source_type: SourceType.SFTP,
        status: JobStatus.INPROGRESS,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue(expectedResult);

      const result = await service.updateJob(
        mockJobId,
        pullUpdateDto,
        ConfigType.PULL,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({
          connection: expect.objectContaining({
            host: 'sftp.example.com',
            password: expect.not.stringMatching('plaintext-password'),
          }),
        }),
        ConfigType.PULL,
        mockToken,
      );
    });

    it('should throw ForbiddenException if job is APPROVED', async () => {
      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.APPROVED,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.updateJob(mockJobId, updateDto, ConfigType.PUSH, mockUser),
      ).rejects.toThrow(ForbiddenException);

      expect(adminServiceClient.updateJob).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if job is DEPLOYED', async () => {
      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.DEPLOYED,
      } as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.updateJob(mockJobId, updateDto, ConfigType.PUSH, mockUser),
      ).rejects.toThrow(ForbiddenException);

      expect(adminServiceClient.updateJob).not.toHaveBeenCalled();
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Update failed';
      adminServiceClient.findJobById.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.updateJob(mockJobId, updateDto, ConfigType.PUSH, mockUser),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });

  describe('createPush', () => {
    const createPushDto = {
      endpoint_name: 'Test Endpoint',
      path: '/test/path',
      table_name: 'test_table',
      description: 'Test description',
      version: 'v1',
      mode: IngestMode.APPEND,
      publishing_status: ScheduleStatus.INACTIVE,
    };

    it('should create a push job successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Job Created Successfully',
      };

      adminServiceClient.createPushJob.mockResolvedValue(expectedResult);

      const result = await service.createPush(
        createPushDto as CreatePushJobDto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.createPushJob).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPushDto,
          tenant_id: mockTenantId,
          status: JobStatus.INPROGRESS,
          path: expect.stringContaining(`/${mockTenantId}/enrichment/`),
        }),
        mockToken,
      );
    });

    it('should create a deployed push job and send notification', async () => {
      const deployedJob = { ...createPushDto, id: mockJobId };
      adminServiceClient.createPushJob.mockResolvedValue({
        success: true,
        message: 'Job Created Successfully',
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      const result = await service.createPush(
        deployedJob as CreatePushJobDto,
        mockUser,
        JobStatus.DEPLOYED,
      );

      expect(result.success).toBe(true);
      expect(notifyService.notifyEnrichment).toHaveBeenCalledWith(
        mockJobId,
        ConfigType.PUSH,
      );
    });

    it('should throw error if job creation fails', async () => {
      adminServiceClient.createPushJob.mockResolvedValue({
        success: false,
        message: 'Job creation failed',
      });

      await expect(
        service.createPush(createPushDto as CreatePushJobDto, mockUser),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const errorMessage = 'Validation failed';
      adminServiceClient.createPushJob.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.createPush(createPushDto as CreatePushJobDto, mockUser),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });

  describe('createPull', () => {
    it('should create a pull job successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Job Created Successfully',
      };

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue(expectedResult);

      const result = await service.createPull(mockPullJob, mockUser);

      expect(result).toEqual(expectedResult);
      expect(dryRunService.dryRun).toHaveBeenCalledWith(mockPullJob);
      expect(adminServiceClient.createPullJob).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          status: JobStatus.INPROGRESS,
        }),
        mockToken,
      );
    });

    it('should create a pull job with SFTP and encrypt credentials', async () => {
      const sftpPullJob = {
        ...mockPullJob,
        source_type: SourceType.SFTP,
        connection: {
          host: 'sftp.example.com',
          port: 22,
          auth_type: AuthType.USERNAME_PASSWORD,
          user_name: 'testuser',
          password: 'plaintext',
        },
        file: { path: 'test.csv', file_type: FileType.CSV, delimiter: ',' },
      };

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({
        success: true,
        message: 'Job Created Successfully',
      });

      await service.createPull(sftpPullJob, mockUser);

      expect(adminServiceClient.createPullJob).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: expect.objectContaining({
            host: 'sftp.example.com',
            password: expect.not.stringMatching('plaintext'),
          }),
        }),
        mockToken,
      );
    });

    it('should throw error if schedule not found', async () => {
      adminServiceClient.findScheduleById.mockResolvedValue(null);

      await expect(service.createPull(mockPullJob, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if schedule is not approved', async () => {
      adminServiceClient.findScheduleById.mockResolvedValue({
        ...mockSchedule,
        status: JobStatus.INPROGRESS,
      });

      await expect(service.createPull(mockPullJob, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should send notification for deployed pull job', async () => {
      const deployedJob = { ...mockPullJob, id: mockJobId };
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({
        success: true,
        message: 'Job Created Successfully',
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      const result = await service.createPull(
        deployedJob,
        mockUser,
        JobStatus.DEPLOYED,
      );

      expect(result.success).toBe(true);
      expect(notifyService.notifyEnrichment).toHaveBeenCalled();
    });

    it('should validate file type for SFTP source', async () => {
      const invalidFileJob = {
        ...mockPullJob,
        source_type: SourceType.SFTP,
        file: { path: 'test.invalid', file_type: FileType.CSV, delimiter: ',' },
      };

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);

      await expect(
        service.createPull(invalidFileJob, mockUser),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    const offset = '0';
    const limit = '10';
    const filters = { status: JobStatus.APPROVED };

    it('should return all jobs with pagination', async () => {
      const mockResponse = {
        data: [mockPushJob, mockPullJob],
        total: 2,
        offset: 0,
        limit: 10,
      };

      adminServiceClient.getAllJobs.mockResolvedValue(mockResponse);

      const result = await service.findAll(offset, limit, mockUser, filters);

      expect(result).toEqual(mockResponse);
      expect(adminServiceClient.getAllJobs).toHaveBeenCalledWith(
        offset,
        limit,
        mockUser,
        filters,
      );
    });

    it('should work without filters', async () => {
      const mockResponse = {
        data: [mockPushJob],
        total: 1,
        offset: 0,
        limit: 10,
      };

      adminServiceClient.getAllJobs.mockResolvedValue(mockResponse);

      const result = await service.findAll(offset, limit, mockUser);

      expect(result).toEqual(mockResponse);
      expect(adminServiceClient.getAllJobs).toHaveBeenCalledWith(
        offset,
        limit,
        mockUser,
        undefined,
      );
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.getAllJobs.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.findAll(offset, limit, mockUser, filters),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a push job by id with schedule name', async () => {
      adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(
        mockJobId,
        ConfigType.PUSH,
        mockToken,
      );

      expect(result).toEqual({
        ...mockPushJob,
        schedule_name: mockSchedule.name,
      });
      expect(adminServiceClient.findJobById).toHaveBeenCalledWith(
        mockJobId,
        'push_jobs',
        mockToken,
      );
      expect(schedulerService.findOne).toHaveBeenCalledWith(
        'schedule-123',
        mockToken,
      );
    });

    it('should find a job without schedule_id', async () => {
      const jobWithoutSchedule = { ...mockPushJob, schedule_id: undefined };
      adminServiceClient.findJobById.mockResolvedValue(
        jobWithoutSchedule as Job,
      );

      const result = await service.findOne(
        mockJobId,
        ConfigType.PUSH,
        mockToken,
      );

      expect(result).toEqual(jobWithoutSchedule);
      expect(schedulerService.findOne).not.toHaveBeenCalled();
    });

    it('should return job without schedule name if schedule not found', async () => {
      adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
      schedulerService.findOne.mockResolvedValue(null);

      const result = await service.findOne(
        mockJobId,
        ConfigType.PUSH,
        mockToken,
      );

      expect(result).toEqual(mockPushJob);
    });

    it('should find a pull job by id', async () => {
      adminServiceClient.findJobById.mockResolvedValue(mockPullJob as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(
        mockJobId,
        ConfigType.PULL,
        mockToken,
      );

      expect(result).toEqual({
        ...mockPullJob,
        schedule_name: mockSchedule.name,
      });
      expect(adminServiceClient.findJobById).toHaveBeenCalledWith(
        mockJobId,
        'pull_jobs',
        mockToken,
      );
    });

    it('should throw BadRequestException if id is missing', async () => {
      await expect(
        service.findOne('', ConfigType.PUSH, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if job not found', async () => {
      adminServiceClient.findJobById.mockResolvedValue(null);

      await expect(
        service.findOne(mockJobId, ConfigType.PUSH, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Database error';
      adminServiceClient.findJobById.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.findOne(mockJobId, ConfigType.PUSH, mockToken),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByStatus', () => {
    const page = 1;
    const limit = 10;
    const status = JobStatus.APPROVED;

    it('should find jobs by status', async () => {
      const mockJobs = [mockPushJob];
      adminServiceClient.findJobByStatus.mockResolvedValue(mockJobs);

      const result = await service.findByStatus(
        status,
        page,
        limit,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(mockJobs);
      expect(adminServiceClient.findJobByStatus).toHaveBeenCalledWith(
        mockTenantId,
        status,
        page,
        limit,
        mockToken,
      );
    });

    it('should throw BadRequestException for invalid pagination', async () => {
      await expect(
        service.findByStatus(status, 0, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.findJobByStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.findByStatus(status, page, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateActivation', () => {
    it('should update activation status successfully for push job', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: true,
        message: 'Job Updated',
        data: mockPushJob,
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);
      notificationService.sendWorkflowNotification.mockResolvedValue(undefined);

      const result = await service.updateActivation(
        mockJobId,
        ScheduleStatus.ACTIVE,
        ConfigType.PUSH,
        mockUser,
      );

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('successfully updated'),
      });
      expect(adminServiceClient.updateJobActivation).toHaveBeenCalledWith(
        mockJobId,
        ScheduleStatus.ACTIVE,
        ConfigType.PUSH,
        mockToken,
      );
      expect(notifyService.notifyEnrichment).toHaveBeenCalledWith(
        mockJobId,
        ConfigType.PUSH,
      );
      expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
    });

    it('should update activation status successfully for pull job', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: true,
        message: 'Job Updated',
        data: mockPullJob,
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);
      notificationService.sendWorkflowNotification.mockResolvedValue(undefined);

      const result = await service.updateActivation(
        mockJobId,
        ScheduleStatus.ACTIVE,
        ConfigType.PULL,
        mockUser,
      );

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('successfully updated'),
      });
      expect(adminServiceClient.updateJobActivation).toHaveBeenCalledWith(
        mockJobId,
        ScheduleStatus.ACTIVE,
        ConfigType.PULL,
        mockToken,
      );
      expect(notifyService.notifyEnrichment).toHaveBeenCalledWith(
        mockJobId,
        ConfigType.PULL,
      );
    });

    it('should not notify if update fails', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: false,
        message: 'Job Updated',
        data: mockPullJob,
      });

      await service.updateActivation(
        mockJobId,
        ScheduleStatus.ACTIVE,
        ConfigType.PUSH,
        mockUser,
      );

      expect(notifyService.notifyEnrichment).not.toHaveBeenCalled();
      expect(
        notificationService.sendWorkflowNotification,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const errorMessage = 'Update failed';
      adminServiceClient.updateJobActivation.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.updateActivation(
          mockJobId,
          ScheduleStatus.ACTIVE,
          ConfigType.PUSH,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    describe('REVIEW status', () => {
      it('should update status to REVIEW and send notification', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.REVIEW,
          ConfigType.PUSH,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
        expect(adminServiceClient.updateJobByStatus).toHaveBeenCalledWith(
          mockJobId,
          JobStatus.REVIEW,
          mockTenantId,
          ConfigType.PUSH,
          mockToken,
          undefined,
        );
      });
    });

    describe('APPROVED status', () => {
      it('should update status to APPROVED and send notification', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.APPROVED,
          ConfigType.PUSH,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
        expect(adminServiceClient.updateJobByStatus).toHaveBeenCalledWith(
          mockJobId,
          JobStatus.APPROVED,
          mockTenantId,
          ConfigType.PUSH,
          mockToken,
          undefined,
        );
      });
    });

    describe('REJECTED status', () => {
      it('should throw error if reason is not provided', async () => {
        adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);

        await expect(
          service.updateStatus(
            mockJobId,
            JobStatus.REJECTED,
            ConfigType.PUSH,
            mockUser,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update status with reason and send notification', async () => {
        const reason = 'Invalid configuration';
        const expectedResult = {
          success: true,
          message: 'Status updated',
        };

        adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.REJECTED,
          ConfigType.PUSH,
          mockUser,
          reason,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
        expect(adminServiceClient.updateJobByStatus).toHaveBeenCalledWith(
          mockJobId,
          JobStatus.REJECTED,
          mockTenantId,
          ConfigType.PUSH,
          mockToken,
          reason,
        );
      });
    });

    describe('EXPORTED status', () => {
      it('should export job to SFTP and send notification', async () => {
        const expectedResult = { success: true, message: 'Status updated' };

        adminServiceClient.findJobById.mockResolvedValue(mockPushJob as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        sftpService.createFile.mockResolvedValue(undefined);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        await service.updateStatus(
          mockJobId,
          JobStatus.EXPORTED,
          ConfigType.PUSH,
          mockUser,
        );

        expect(sftpService.createFile).toHaveBeenCalledWith(
          `de_${mockTenantId}_${mockJobId}`,
          expect.objectContaining({ status: JobStatus.READY }),
        );
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });
    });

    describe('DEPLOYED status', () => {
      it('should deploy a push job from SFTP and send notification', async () => {
        const fileName = `de_${mockTenantId}_${mockJobId}`;

        sftpService.readFile.mockResolvedValue(mockPushJob);
        adminServiceClient.createPushJob.mockResolvedValue({
          success: true,
          message: 'Job Created Successfully',
        });
        sftpService.deleteFile.mockResolvedValue(undefined);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.DEPLOYED,
          ConfigType.PUSH,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
        expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });

      it('should deploy a pull job from SFTP and send notification', async () => {
        const fileName = `de_${mockTenantId}_${mockJobId}`;

        sftpService.readFile.mockResolvedValue(mockPullJob);
        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        dryRunService.dryRun.mockResolvedValue(undefined);
        adminServiceClient.createPullJob.mockResolvedValue({
          success: true,
          message: 'Job Created Successfully',
        });
        sftpService.deleteFile.mockResolvedValue(undefined);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.DEPLOYED,
          ConfigType.PULL,
          mockUser,
        );

        expect(result.success).toBe(true);
        expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
        expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });
    });

    it('should handle errors and log them', async () => {
      const errorMessage = 'Update failed';
      adminServiceClient.findJobById.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.updateStatus(
          mockJobId,
          JobStatus.APPROVED,
          ConfigType.PUSH,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
