import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ConfigType, FileType, IngestMode, Job, JobStatus, ScheduleStatus, SourceType } from '@tazama-lf/tcs-lib';
import { DatabaseService } from '../database/database.service';
import { DryRunService } from '../dry-run/dry-run.service';
import { NotifyService } from '../notify/notify.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpService } from '../sftp/sftp.service';
import { CreatePushJobDto } from './dto/create-push-job.dto';
import { JobService } from './job.service';
import { EndpointJobRecord } from './types/job.interface';

describe('JobService', () => {
  let service: JobService;
  let dbService: jest.Mocked<DatabaseService>;
  let loggerService: jest.Mocked<LoggerService>;
  let dryRunService: jest.Mocked<DryRunService>;
  let sftpService: jest.Mocked<SftpService>;
  let notifyService: jest.Mocked<NotifyService>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  const mockToken = 'mock-jwt-token';
  const mockTenantId = 'tenant_abc';
  const mockJobId = 'job-test-id-123';

  const mockPushJob = {
    id: mockJobId,
    endpoint_name: 'Test Endpoint',
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
    comments: null
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
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    dbService = module.get(DatabaseService) as jest.Mocked<DatabaseService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    dryRunService = module.get(DryRunService) as jest.Mocked<DryRunService>;
    sftpService = module.get(SftpService) as jest.Mocked<SftpService>;
    notifyService = module.get(NotifyService) as jest.Mocked<NotifyService>;
    adminServiceClient = module.get(
      AdminServiceClient,
    ) as jest.Mocked<AdminServiceClient>;
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

    it('should update a job successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Job updated successfully',
      };

      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.INPROGRESS,
      } as Job);
      adminServiceClient.updateJob.mockResolvedValue(expectedResult);

      const result = await service.updateJob(
        mockJobId,
        updateDto,
        ConfigType.PUSH,
        mockToken,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateJob).toHaveBeenCalledWith(
        mockJobId,
        updateDto,
        ConfigType.PUSH,
        mockToken,
      );
    });

    it('should throw ForbiddenException if job is not INPROGRESS', async () => {
      adminServiceClient.findJobById.mockResolvedValue({
        ...mockPushJob,
        status: JobStatus.APPROVED,
      } as Job);

      await expect(
        service.updateJob(mockJobId, updateDto, ConfigType.PUSH, mockToken),
      ).rejects.toThrow(ForbiddenException);

      expect(adminServiceClient.updateJob).not.toHaveBeenCalled();
    });
  });

  describe('createPush', () => {
    const createPushDto = {
      endpoint_name: 'Test Endpoint',
      path: '/test/path',
      table_name: 'test_table',
      description: 'Test description',
      version: 'v1',
      mode: 'push',
      publishing_status: ScheduleStatus.INACTIVE,
    };

    it('should create a push job successfully', async () => {
      adminServiceClient.validateExisting.mockResolvedValue({
        success: true,
        message: 'Table does not exists',
      });
      adminServiceClient.createPushJob.mockResolvedValue({ id: mockJobId });

      const result = await service.createPush(
        createPushDto as CreatePushJobDto,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('successfully created'),
      });
      expect(adminServiceClient.validateExisting).toHaveBeenCalledWith(
        createPushDto.table_name,
        mockToken,
      );
      expect(adminServiceClient.createPushJob).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPushDto,
          tenant_id: mockTenantId,
          status: JobStatus.INPROGRESS,
          path: expect.stringContaining('/enrichment/'),
        }),
        mockToken,
      );
    });
    it('should create a deployed push job and send notification', async () => {
      const deployedJob = { ...createPushDto, id: mockJobId };
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.createPushJob.mockResolvedValue({ id: mockJobId });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      await service.createPush(
        deployedJob as CreatePushJobDto,
        mockTenantId,
        mockToken,
        JobStatus.DEPLOYED,
      );

      expect(notifyService.notifyEnrichment).toHaveBeenCalledWith(
        mockJobId,
        ConfigType.PUSH,
      );
    });

    it('should throw error if job creation fails', async () => {
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table Already Exists',
      });
      adminServiceClient.createPushJob.mockResolvedValue({ id: null });

      await expect(
        service.createPush(createPushDto as CreatePushJobDto, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const errorMessage = 'Table already exists';
      adminServiceClient.validateExisting.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.createPush(createPushDto as CreatePushJobDto, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });
  describe('createPull', () => {

    it('should create a pull job successfully', async () => {
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ id: mockJobId });

      const result = await service.createPull(
        mockPullJob,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual({
        success: true,
        message: `Job with id ${mockJobId} successfully created`,
      });
      expect(dryRunService.dryRun).toHaveBeenCalledWith(mockPullJob);
      expect(adminServiceClient.createPullJob).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          status: JobStatus.INPROGRESS,
        }),
        mockToken,
      );
    });

    it('should throw error if schedule not found', async () => {
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.findScheduleById.mockResolvedValue(null);

      await expect(
        service.createPull(mockPullJob, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if schedule is not approved', async () => {
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.findScheduleById.mockResolvedValue({
        ...mockSchedule,
        status: JobStatus.INPROGRESS,
      });

      await expect(
        service.createPull(mockPullJob, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send notification for deployed pull job', async () => {
      const deployedJob = { ...mockPullJob, id: mockJobId };
      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ id: mockJobId });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      await service.createPull(
        deployedJob,
        mockTenantId,
        mockToken,
        JobStatus.DEPLOYED,
      );

      expect(notifyService.notifyEnrichment).toHaveBeenCalled();
    });

    it('should validate file type for SFTP source', async () => {
      const invalidFileJob = {
        ...mockPullJob,
        file: { path: 'test.csv', file_type: FileType.CSV, delimiter: ',' },
      };

      adminServiceClient.validateExisting.mockResolvedValue({
        success: false,
        message: 'Table does not Exists',
      });
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);

      await expect(
        service.createPull(invalidFileJob, mockTenantId, mockToken),
      ).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    const page = 1;
    const limit = 10;

    const mockJob = {
      id: mockJobId,
      endpoint_name: 'test',
      path: '/v1/enrich/ACM102/customerdata',
      mode: IngestMode.APPEND,
      table_name: 'test',
      description: 'test',
      version: 'v1',
      status: JobStatus.INPROGRESS,
      publishing_status: ScheduleStatus.ACTIVE,
      created_at: new Date(),
      type: "push" as 'push' | 'pull',
    }

    it('should return all jobs with pagination', async () => {
      const mockJobs: EndpointJobRecord[] = [mockJob];
      adminServiceClient.getAllJobs.mockResolvedValue(mockJobs);

      const result = await service.findAll(
        page,
        limit,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(mockJobs);
      expect(adminServiceClient.getAllJobs).toHaveBeenCalledWith(
        page,
        limit,
        mockTenantId,
        mockToken,
      );
    });

    it('should throw BadRequestException for invalid page', async () => {
      await expect(
        service.findAll(0, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(
        service.findAll(page, -1, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-integer page', async () => {
      await expect(
        service.findAll(1.5, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.getAllJobs.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.findAll(page, limit, mockTenantId, mockToken),
      ).rejects.toThrow();

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a push job by id', async () => {
      adminServiceClient.findJobById.mockResolvedValue(mockPushJob);

      const result = await service.findOne(
        mockJobId,
        ConfigType.PUSH,
        mockToken,
      );

      expect(result).toEqual(mockPushJob);
      expect(adminServiceClient.findJobById).toHaveBeenCalledWith(
        mockJobId,
        'endpoints',
        mockToken,
      );
    });

    it('should find a pull job with schedule info', async () => {
      const mockScheduleInfo = {
        name: 'Test Schedule',
        cron: '0 0 * * *',
      };

      adminServiceClient.findJobById.mockResolvedValue(mockPullJob);
      dbService.query.mockResolvedValue({ rows: [mockScheduleInfo] });

      const result = await service.findOne(mockJobId, ConfigType.PULL, mockToken);

      expect(result).toEqual(expect.objectContaining(mockScheduleInfo));
      expect(dbService.query).toHaveBeenCalled();
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

    it('should throw BadRequestException for missing parameters', async () => {
      await expect(
        service.findByStatus(null as any, page, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
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
    it('should update activation status successfully', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: true,
        message: "Job Updated"
      });
      notifyService.notifyEnrichment.mockResolvedValue(undefined);

      const result = await service.updateActivation(
        mockJobId,
        ScheduleStatus.ACTIVE,
        'endpoints',
        mockToken,
      );

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('successfully updated'),
      });
      expect(notifyService.notifyEnrichment).toHaveBeenCalledWith(
        mockJobId,
        ConfigType.PUSH,
      );
    });

    it('should throw BadRequestException if status is missing', async () => {
      await expect(
        service.updateActivation(
          mockJobId,
          null as any,
          'endpoints',
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not notify if update fails', async () => {
      adminServiceClient.updateJobActivation.mockResolvedValue({
        success: false,
        message: "Job Updated"
      });

      await service.updateActivation(
        mockJobId,
        ScheduleStatus.ACTIVE,
        'endpoints',
        mockToken,
      );

      expect(notifyService.notifyEnrichment).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    describe('REJECTED status', () => {
      it('should throw error if reason is not provided', async () => {
        await expect(
          service.updateStatus(
            mockJobId,
            JobStatus.REJECTED,
            ConfigType.PUSH,
            mockTenantId,
            mockToken,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update status with reason', async () => {
        const reason = 'Invalid configuration';
        const expectedResult = {
          success: true,
          message: 'Status updated',
        };

        adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);

        const result = await service.updateStatus(
          mockJobId,
          JobStatus.REJECTED,
          ConfigType.PUSH,
          mockTenantId,
          mockToken,
          reason,
        );

        expect(result).toEqual(expectedResult);
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
  });
  describe('EXPORTED status', () => {
    it('should export job to SFTP', async () => {
      const expectedResult = { success: true, message: 'Status updated' };

      adminServiceClient.findJobById.mockResolvedValue(mockPushJob);
      sftpService.createFile.mockResolvedValue(undefined);
      adminServiceClient.updateJobByStatus.mockResolvedValue(expectedResult);

      await service.updateStatus(
        mockJobId,
        JobStatus.EXPORTED,
        ConfigType.PUSH,
        mockTenantId,
        mockToken,
      );

      expect(sftpService.createFile).toHaveBeenCalledWith(
        `de_${mockTenantId}_${mockJobId}`,
        expect.objectContaining({ status: JobStatus.READY }),
      );
      expect(loggerService.log).toHaveBeenCalled();
    });
  });
  describe('DEPLOYED status', () => {
    it('should deploy a push job from SFTP', async () => {
      const fileName = `de_${mockTenantId}_${mockJobId}`;

      sftpService.readFile.mockResolvedValue(mockPushJob);
      adminServiceClient.validateExisting.mockResolvedValue({
        success: true,
        message: 'Table does not exists'
      });
      adminServiceClient.createPushJob.mockResolvedValue({ id: mockJobId });
      sftpService.deleteFile.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.DEPLOYED,
        ConfigType.PUSH,
        mockTenantId,
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
      expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
    });

    it('should deploy a pull job from SFTP', async () => {
      const fileName = `de_${mockTenantId}_${mockJobId}`;

      sftpService.readFile.mockResolvedValue(mockPullJob);
      adminServiceClient.validateExisting.mockResolvedValue({
        success: true,
        message: 'Table does not exists'
      });
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
      dryRunService.dryRun.mockResolvedValue(undefined);
      adminServiceClient.createPullJob.mockResolvedValue({ id: mockJobId });
      sftpService.deleteFile.mockResolvedValue(undefined);

      const result = await service.updateStatus(
        mockJobId,
        JobStatus.DEPLOYED,
        ConfigType.PULL,
        mockTenantId,
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
      expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
    });
    it('should throw BadRequestException if status is missing', async () => {
      await expect(
        service.updateStatus(
          mockJobId,
          null as any,
          ConfigType.PUSH,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors and log them', async () => {
      const errorMessage = 'Update failed';
      adminServiceClient.updateJobByStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.updateStatus(
          mockJobId,
          JobStatus.APPROVED,
          ConfigType.PUSH,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
