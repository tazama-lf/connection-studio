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
import { AuthenticatedUser } from '../../src/auth/auth.types';
import { DryRunService } from '../../src/dry-run/dry-run.service';
import { NotifyService } from '../../src/notify/notify.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { SftpService } from '../../src/sftp/sftp.service';
import { CreatePushJobDto } from '../../src/job/dto/create-push-job.dto';
import { JobService } from '../../src/job/job.service';
import { SchedulerService } from '../../src/scheduler/scheduler.service';
import { NotificationService } from '../../src/notification/notification.service';
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
    actorRole: 'editor',
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

    jest.spyOn(helpers, 'decrypt').mockReturnValue('decrypted-value');
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

  describe('findAllHistory', () => {
    it('should return job history', async () => {
      const mockHistory = { data: [], total: 0, offset: 0, limit: 10 };
      adminServiceClient.getAllJobsHistory = jest.fn().mockResolvedValue(mockHistory);

      const result = await service.findAllHistory('0', '10', mockUser);
      expect(result).toEqual(mockHistory);
    });

    it('should handle errors from admin service', async () => {
      adminServiceClient.getAllJobsHistory = jest.fn().mockRejectedValue(new Error('history error'));

      await expect(
        service.findAllHistory('0', '10', mockUser),
      ).rejects.toThrow(BadRequestException);
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
        expect.objectContaining({
          status: expect.any(String),
        }),
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
        mockUser,
      );

      expect(result).toEqual({
        ...mockPushJob,
        schedule_name: mockSchedule.name,
      });
      expect(adminServiceClient.findJobById).toHaveBeenCalledWith(
        mockJobId,
        'tcs_push_jobs',
        mockToken,
      );
      expect(schedulerService.findOne).toHaveBeenCalledWith(
        'schedule-123',
        mockUser,
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
        mockUser,
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
        mockUser,
      );

      expect(result).toEqual(mockPushJob);
    });

    it('should find a pull job by id', async () => {
      adminServiceClient.findJobById.mockResolvedValue(mockPullJob as Job);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      const result = await service.findOne(
        mockJobId,
        ConfigType.PULL,
        mockUser,
      );

      expect(result).toEqual({
        ...mockPullJob,
        schedule_name: mockSchedule.name,
      });
      expect(adminServiceClient.findJobById).toHaveBeenCalledWith(
        mockJobId,
        'tcs_pull_jobs',
        mockToken,
      );
    });

    it('should throw BadRequestException if id is missing', async () => {
      await expect(
        service.findOne('', ConfigType.PUSH, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if push job not found', async () => {
      adminServiceClient.findJobById.mockResolvedValue(null);

      await expect(
        service.findOne(mockJobId, ConfigType.PUSH, mockUser),
      ).rejects.toThrow('Push Job with id job-test-id-123 not found.');
    });

    it('should throw BadRequestException if pull job not found', async () => {
      adminServiceClient.findJobById.mockResolvedValue(null);

      await expect(
        service.findOne(mockJobId, ConfigType.PULL, mockUser),
      ).rejects.toThrow('Pull Job with id job-test-id-123 not found.');
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Database error';
      adminServiceClient.findJobById.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.findOne(mockJobId, ConfigType.PUSH, mockUser),
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
        mockUser,
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
        service.findByStatus(status, 0, limit, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.findJobByStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.findByStatus(status, page, limit, mockUser),
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
        const editorUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['EDITOR'],
          actorRole: 'editor',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findJobById.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.INPROGRESS,
        } as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.REVIEW,
          ConfigType.PUSH,
          editorUser,
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
        const approverUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['APPROVER'],
          actorRole: 'approver',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findJobById.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.REVIEW,
        } as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.APPROVED,
          ConfigType.PUSH,
          approverUser,
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
        const approverUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['APPROVER'],
          actorRole: 'approver',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        adminServiceClient.findJobById.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.REVIEW,
        } as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);

        await expect(
          service.updateStatus(
            mockJobId,
            JobStatus.REJECTED,
            ConfigType.PUSH,
            approverUser,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update status with reason and send notification', async () => {
        const approverUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['APPROVER'],
          actorRole: 'approver',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const reason = 'Invalid configuration';
        const expectedResult = {
          success: true,
          message: 'Status updated',
        };

        adminServiceClient.findJobById.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.REVIEW,
        } as Job);
        schedulerService.findOne.mockResolvedValue(mockSchedule);
        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.REJECTED,
          ConfigType.PUSH,
          approverUser,
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
        const exporterUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['EXPORTER'],
          actorRole: 'exporter',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const expectedResult = { success: true, message: 'Status updated' };

        adminServiceClient.findJobById.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.APPROVED,
        } as Job);
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
          exporterUser,
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
        const publisherUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['PUBLISHER'],
          actorRole: 'publisher',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const fileName = `de_${mockTenantId}_${mockJobId}`;

        sftpService.readFile.mockResolvedValue({
          ...mockPushJob,
          status: JobStatus.READY,
        });
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
          publisherUser,
        );

        expect(result.success).toBe(true);
        expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
        expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });

      it('should deploy a pull job from SFTP and send notification', async () => {
        const publisherUser: AuthenticatedUser = {
          tenantId: mockTenantId,
          validClaims: ['PUBLISHER'],
          actorRole: 'publisher',
          token: { tokenString: mockToken },
        } as AuthenticatedUser;

        const fileName = `de_${mockTenantId}_${mockJobId}`;

        sftpService.readFile.mockResolvedValue({
          ...mockPullJob,
          status: JobStatus.READY,
        });
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
          publisherUser,
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

  // ===== handleError: non-Error value (String path) =====

  describe('handleError with non-Error', () => {
    it('should convert non-Error thrown value to string', async () => {
      adminServiceClient.getAllJobs.mockRejectedValue('plain string error');

      await expect(
        service.findAll('0', '10', mockUser, {}),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith('plain string error');
    });
  });

  // ===== encryptSftpCredentials: no password and no private_key =====

  describe('encryptSftpCredentials edge cases', () => {
    it('returns unchanged connection when no password and no private_key', async () => {
      const sftpConnection = {
        host: 'sftp.example.com',
        port: 22,
        user_name: 'testuser',
        auth_type: AuthType.USERNAME_PASSWORD,
        // no password, no private_key
      };

      const pullUpdateDto = {
        source_type: SourceType.SFTP,
        connection: sftpConnection,
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPullJob,
        status: JobStatus.INPROGRESS,
      } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue({ success: true, message: 'ok' });

      await service.updateJob(mockJobId, pullUpdateDto as any, ConfigType.PULL, mockUser);

      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        expect.objectContaining({ connection: expect.not.objectContaining({ password: 'encrypted-password' }) }),
        ConfigType.PULL,
        mockToken,
      );
    });
  });

  // ===== updateJob: missing branches =====

  describe('updateJob additional branches', () => {
    it('throws ForbiddenException for invalid user role', async () => {
      const viewerUser = { ...mockUser, actorRole: 'viewer' } as AuthenticatedUser;
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.updateJob(mockJobId, {}, ConfigType.PUSH, viewerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uses fallback message when tier2 reason is null', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: false });

      await expect(
        service.updateJob(mockJobId, {}, ConfigType.PUSH, mockUser),
      ).rejects.toThrow('Not authorized to update this job');
    });

    it('skips updateJobByStatus when job is already INPROGRESS', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue({ success: true, message: 'ok' });

      await service.updateJob(mockJobId, {}, ConfigType.PUSH, mockUser);

      expect(adminServiceClient.updateJobByStatus).not.toHaveBeenCalled();
    });

    it('does not call updateJobByStatus when update result is not successful', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.REJECTED } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue({ success: false, message: 'failed' });

      await service.updateJob(mockJobId, {}, ConfigType.PUSH, mockUser);

      expect(adminServiceClient.updateJobByStatus).not.toHaveBeenCalled();
    });

    it('updates pull SFTP job without file path (skips validateFileType)', async () => {
      const sftpDtoNoPath = {
        source_type: SourceType.SFTP,
        file: { path: '' },
        connection: { host: 'sftp.example.com', port: 22, auth_type: AuthType.PRIVATE_KEY, private_key: 'key' },
      };

      adminServiceClient.findJobById.mockResolvedValue({ ...mockPullJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue({ success: true, message: 'ok' });

      await service.updateJob(mockJobId, sftpDtoNoPath as any, ConfigType.PULL, mockUser);

      expect(adminServiceClient.updateJob).toHaveBeenCalled();
    });

    it('calls updateJobByStatus when job is not INPROGRESS and update succeeds', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.REJECTED } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      adminServiceClient.updateJob.mockResolvedValue({ success: true, message: 'ok' });
      adminServiceClient.updateJobByStatus.mockResolvedValue({ success: true, message: 'ok' });

      await service.updateJob(mockJobId, {}, ConfigType.PUSH, mockUser);

      expect(adminServiceClient.updateJobByStatus).toHaveBeenCalledWith(
        mockJobId,
        JobStatus.INPROGRESS,
        mockTenantId,
        ConfigType.PUSH,
        mockToken,
      );
    });
  });

  // ===== createPull: missing branches =====

  describe('createPull additional branches', () => {
    it('generates id with v4() when job has no id', async () => {
      const jobNoId = { ...mockPullJob, id: undefined };
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ success: true, message: 'Created' });

      const result = await service.createPull(jobNoId as any, mockUser);

      expect(result.success).toBe(true);
      expect(adminServiceClient.createPullJob).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
        mockToken,
      );
    });

    it('throws BadRequestException for array validation error with constraints', async () => {
      const validationErrors = [{ constraints: { isNotEmpty: 'field must not be empty' } }];
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockRejectedValue(validationErrors);

      await expect(service.createPull(mockPullJob, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for array validation error without constraints', async () => {
      const validationErrors = [{ message: 'some error' }]; // no constraints property
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockRejectedValue(validationErrors);

      await expect(service.createPull(mockPullJob, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ===== findByStatus: missing branches =====

  describe('findByStatus additional branches', () => {
    it('throws BadRequestException for invalid role (wrapped by handleError)', async () => {
      const viewerUser = { ...mockUser, actorRole: 'viewer' } as AuthenticatedUser;

      await expect(
        service.findByStatus(JobStatus.APPROVED, 1, 10, viewerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when limit is 0', async () => {
      await expect(
        service.findByStatus(JobStatus.APPROVED, 1, 0, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when status not in allowedStatuses (wrapped by handleError)', async () => {
      jest.spyOn(service['rbacService'], 'getTier2').mockReturnValue({
        allowed: true,
        allowedStatuses: [JobStatus.INPROGRESS],
      });

      await expect(
        service.findByStatus(JobStatus.DEPLOYED, 1, 10, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===== updateActivation: INACTIVE =====

  describe('updateActivation INACTIVE', () => {
    it('sends PublisherDeactivate when setting INACTIVE', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: true,
        message: 'ok',
        data: mockPushJob,
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);
      notificationService.sendWorkflowNotification.mockResolvedValue(undefined);

      await service.updateActivation(mockJobId, ScheduleStatus.INACTIVE, ConfigType.PUSH, mockUser);

      expect(notificationService.sendWorkflowNotification).toHaveBeenCalledWith(
        'publisher_deactivate',
        mockUser,
        mockPushJob,
        mockToken,
      );
    });
  });

  // ===== updateStatus: missing branches =====

  describe('updateStatus additional branches', () => {
    it('throws BadRequestException when publisher SFTP read fails with non-Error', async () => {
      const publisherUser = { ...mockUser, actorRole: 'publisher' } as AuthenticatedUser;
      sftpService.readFile.mockRejectedValue('SFTP string error');

      await expect(
        service.updateStatus(mockJobId, JobStatus.DEPLOYED, ConfigType.PUSH, publisherUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('publisher with non-DEPLOYED status goes through findOne (covers && short-circuit)', async () => {
      const publisherUser = { ...mockUser, actorRole: 'publisher' } as AuthenticatedUser;
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.EXPORTED } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: true });
      jest.spyOn(service['rbacService'], 'checkTier3').mockReturnValue({ allowed: true });
      adminServiceClient.updateJobByStatus.mockResolvedValue({ success: true, message: 'ok' });

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.REVIEW,
        ConfigType.PUSH,
        publisherUser,
      );

      expect(result.success).toBe(true);
      expect(adminServiceClient.findJobById).toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid role in updateStatus (wrapped by handleError)', async () => {
      const viewerUser = { ...mockUser, actorRole: 'viewer' } as AuthenticatedUser;
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.updateStatus(mockJobId, JobStatus.REVIEW, ConfigType.PUSH, viewerUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses fallback when tier2 reason is null in updateStatus', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: false });

      await expect(
        service.updateStatus(mockJobId, JobStatus.REVIEW, ConfigType.PUSH, mockUser),
      ).rejects.toThrow('Not authorized to update this job status');
    });

    it('uses fallback when tier3 reason is null in updateStatus', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: true });
      jest.spyOn(service['rbacService'], 'checkTier3').mockReturnValue({ allowed: false });

      await expect(
        service.updateStatus(mockJobId, JobStatus.REVIEW, ConfigType.PUSH, mockUser),
      ).rejects.toThrow('Not authorized to perform this status transition');
    });

    it('hits default case and returns result for unhandled status', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: true });
      jest.spyOn(service['rbacService'], 'checkTier3').mockReturnValue({ allowed: true });
      adminServiceClient.updateJobByStatus.mockResolvedValue({ success: true, message: 'ok' });

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.INPROGRESS,
        ConfigType.PUSH,
        mockUser,
      );

      expect(result.success).toBe(true);
    });

    it('returns fallback message when result is null (default case with null result)', async () => {
      adminServiceClient.findJobById.mockResolvedValue({ ...mockPushJob, status: JobStatus.INPROGRESS } as any);
      schedulerService.findOne.mockResolvedValue(mockSchedule);
      jest.spyOn(service['rbacService'], 'checkTier2').mockReturnValue({ allowed: true });
      jest.spyOn(service['rbacService'], 'checkTier3').mockReturnValue({ allowed: true });
      adminServiceClient.updateJobByStatus.mockResolvedValue(null as any);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.INPROGRESS,
        ConfigType.PUSH,
        mockUser,
      );

      expect(result).toEqual({ success: true, message: 'Job Status updated successfully' });
    });

    it('deploys pull job with USERNAME_PASSWORD auth and decrypts password', async () => {
      const publisherUser = { ...mockUser, actorRole: 'publisher' } as AuthenticatedUser;

      sftpService.readFile.mockResolvedValue({
        ...mockPullJob,
        status: JobStatus.READY,
        connection: {
          host: 'sftp.example.com',
          port: 22,
          user_name: 'testuser',
          auth_type: AuthType.USERNAME_PASSWORD,
          password: 'encrypted-password-value',
        },
      } as any);

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ success: true, message: 'deployed' });
      sftpService.deleteFile.mockResolvedValue(undefined);
      notificationService.sendWorkflowNotification.mockResolvedValue(undefined);
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.DEPLOYED,
        ConfigType.PULL,
        publisherUser,
      );

      expect(result.success).toBe(true);
      expect(helpers.decrypt).toHaveBeenCalledWith('encrypted-password-value');
    });

    it('deploys pull job with PRIVATE_KEY auth and decrypts private_key', async () => {
      const publisherUser = { ...mockUser, actorRole: 'publisher' } as AuthenticatedUser;


      sftpService.readFile.mockResolvedValue({
        ...mockPullJob,
        status: JobStatus.READY,
        connection: {
          host: 'sftp.example.com',
          port: 22,
          user_name: 'testuser',
          auth_type: AuthType.PRIVATE_KEY,
          private_key: 'encrypted-key',
        },
      } as any);

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ success: true, message: 'deployed' });
      sftpService.deleteFile.mockResolvedValue(undefined);
      notificationService.sendWorkflowNotification.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.DEPLOYED,
        ConfigType.PULL,
        publisherUser,
      );

      expect(result.success).toBe(true);
      expect(helpers.decrypt).toHaveBeenCalledWith('encrypted-key');
    });

    it('deploys pull job with private_key=undefined (&&= skipped)', async () => {
      const publisherUser = { ...mockUser, actorRole: 'publisher' } as AuthenticatedUser;

      sftpService.readFile.mockResolvedValue({
        ...mockPullJob,
        status: JobStatus.READY,
        connection: {
          host: 'sftp.example.com',
          port: 22,
          user_name: 'testuser',
          auth_type: AuthType.PRIVATE_KEY,
          private_key: undefined,
        },
      } as any);

      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ success: true, message: 'deployed' });
      sftpService.deleteFile.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.DEPLOYED,
        ConfigType.PULL,
        publisherUser,
      );

      expect(result.success).toBe(true);
    });
  });
});
