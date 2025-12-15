import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { SftpService } from '../../src/sftp/sftp.service';
import { SchedulerService } from '../../src/scheduler/scheduler.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { JobStatus, Schedule } from '@tazama-lf/tcs-lib';
import { CreateScheduleJobDto } from '../../src/scheduler/dto/create-schedule.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UpdateScheduleJobDto } from '../../src/scheduler/dto/update-schedule-dto';
import { AuthenticatedUser } from 'src/auth/auth.types';
import { NotificationService } from '../../src/notification/notification.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let loggerService: jest.Mocked<LoggerService>;
  let sftpService: jest.Mocked<SftpService>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockSchedule: Schedule = {
    id: 'test-schedule-id',
    name: 'Test Schedule',
    cron: '0 0 * * *',
    iterations: 1,
    comments: null,
    tenant_id: 'tenant_abc',
    status: JobStatus.INPROGRESS,
  };

  const mockPaginated = {
    total: 0,
    offset: 0,
    limit: 10,
    pages: 2,
  };

  const mockTenantId = 'tenant_abc';
  const mockToken = 'mock-jwt-token';

  const mockUser: AuthenticatedUser = {
    tenantId: mockTenantId,
    validClaims: ['EDITOR'],
    token: {
      tokenString: mockToken,
    },
  } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
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
          provide: AdminServiceClient,
          useValue: {
            createSchedule: jest.fn(),
            findScheduleById: jest.fn(),
            getAllSchedule: jest.fn(),
            updateSchedule: jest.fn(),
            getScheduleByStatus: jest.fn(),
            updateScheduleByStatus: jest.fn(),
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

    service = module.get<SchedulerService>(SchedulerService);
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    sftpService = module.get(SftpService) as jest.Mocked<SftpService>;
    adminServiceClient = module.get(
      AdminServiceClient,
    ) as jest.Mocked<AdminServiceClient>;
    notificationService = module.get(
      NotificationService,
    ) as jest.Mocked<NotificationService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createScheduleDto = {
      name: 'Test Schedule',
      cron: '0 0 * * *',
      id: 'test-schedule-id',
    };

    it('should create a schedule successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Schedule created successfully',
      };

      adminServiceClient.createSchedule.mockResolvedValue(expectedResult);

      const result = await service.create(
        createScheduleDto as CreateScheduleJobDto,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createScheduleDto.name,
          cron: createScheduleDto.cron,
          tenant_id: mockTenantId,
          status: JobStatus.INPROGRESS,
          id: createScheduleDto.id,
        }),
        mockToken,
      );
    });

    it('should create a schedule with custom status', async () => {
      const expectedResult = {
        success: true,
        message: 'Schedule created successfully',
      };

      adminServiceClient.createSchedule.mockResolvedValue(expectedResult);

      await service.create(
        createScheduleDto as CreateScheduleJobDto,
        mockTenantId,
        mockToken,
        JobStatus.APPROVED,
      );

      expect(adminServiceClient.createSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.APPROVED,
        }),
        mockToken,
      );
    });

    it('should throw BadRequestException for invalid cron expression', async () => {
      const invalidScheduleDto = {
        ...createScheduleDto,
        cron: 'invalid-cron',
      };

      await expect(
        service.create(
          invalidScheduleDto as CreateScheduleJobDto,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Admin service error';
      adminServiceClient.createSchedule.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.create(
          createScheduleDto as CreateScheduleJobDto,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });

  describe('findOne', () => {
    it('should find a schedule by id', async () => {
      adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);

      const result = await service.findOne(mockSchedule.id, mockToken);

      expect(result).toEqual(mockSchedule);
      expect(adminServiceClient.findScheduleById).toHaveBeenCalledWith(
        mockSchedule.id,
        mockToken,
      );
    });

    it('should return null if schedule not found', async () => {
      adminServiceClient.findScheduleById.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id', mockToken);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const offset = '0';
    const limit = '10';

    it('should return all schedules with pagination', async () => {
      const mockSchedules = { ...mockPaginated, data: [mockSchedule] };
      adminServiceClient.getAllSchedule.mockResolvedValue(mockSchedules);

      const result = await service.findAll(offset, limit, mockUser);

      expect(result).toEqual(mockSchedules);
      expect(adminServiceClient.getAllSchedule).toHaveBeenCalledWith(
        offset,
        limit,
        mockUser,
        undefined,
      );
    });

    it('should return schedules with filters', async () => {
      const mockSchedules = { ...mockPaginated, data: [mockSchedule] };
      const filters = { status: JobStatus.APPROVED };
      adminServiceClient.getAllSchedule.mockResolvedValue(mockSchedules);

      const result = await service.findAll(offset, limit, mockUser, filters);

      expect(result).toEqual(mockSchedules);
      expect(adminServiceClient.getAllSchedule).toHaveBeenCalledWith(
        offset,
        limit,
        mockUser,
        filters,
      );
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.getAllSchedule.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(service.findAll(offset, limit, mockUser)).rejects.toThrow();
    });
  });

  describe('update', () => {
    const scheduleId = 'test-schedule-id';
    const updateDto: UpdateScheduleJobDto = {
      name: 'Updated Schedule',
      cron: '0 1 * * *',
    };

    it('should update a schedule successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Schedule updated successfully',
      };

      adminServiceClient.findScheduleById.mockResolvedValue({
        ...mockSchedule,
        status: JobStatus.INPROGRESS,
      });
      adminServiceClient.updateSchedule.mockResolvedValue(expectedResult);

      const result = await service.update(scheduleId, updateDto, mockToken);

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateSchedule).toHaveBeenCalledWith(
        scheduleId,
        updateDto,
        mockToken,
      );
    });

    it('should allow update of rejected schedule', async () => {
      const expectedResult = {
        success: true,
        message: 'Schedule updated successfully',
      };

      adminServiceClient.findScheduleById.mockResolvedValue({
        ...mockSchedule,
        status: JobStatus.REJECTED,
      });
      adminServiceClient.updateSchedule.mockResolvedValue(expectedResult);

      const result = await service.update(scheduleId, updateDto, mockToken);

      expect(result).toEqual(expectedResult);
      expect(adminServiceClient.updateSchedule).toHaveBeenCalledWith(
        scheduleId,
        updateDto,
        mockToken,
      );
    });

    it('should throw ForbiddenException if schedule is APPROVED', async () => {
      adminServiceClient.findScheduleById.mockResolvedValue({
        ...mockSchedule,
        status: JobStatus.APPROVED,
      });

      await expect(
        service.update(scheduleId, updateDto, mockToken),
      ).rejects.toThrow(ForbiddenException);

      expect(adminServiceClient.updateSchedule).not.toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const errorMessage = 'Update failed';
      adminServiceClient.findScheduleById.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.update(scheduleId, updateDto, mockToken),
      ).rejects.toThrow();

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });

  describe('findByStatus', () => {
    const page = 1;
    const limit = 10;
    const status = JobStatus.APPROVED;

    it('should find schedules by status', async () => {
      const mockSchedules = [mockSchedule];
      adminServiceClient.getScheduleByStatus.mockResolvedValue(mockSchedules);

      const result = await service.findByStatus(
        status,
        page,
        limit,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(mockSchedules);
      expect(adminServiceClient.getScheduleByStatus).toHaveBeenCalledWith(
        status,
        page,
        limit,
        mockTenantId,
        mockToken,
      );
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(
        service.findByStatus(status, 0, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(
        service.findByStatus(status, page, -1, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle errors from admin service', async () => {
      const errorMessage = 'Service error';
      adminServiceClient.getScheduleByStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.findByStatus(status, page, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const scheduleId = 'test-schedule-id';

    describe('REVIEW status', () => {
      it('should update status to REVIEW and send notification', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.REVIEW,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
        expect(adminServiceClient.updateScheduleByStatus).toHaveBeenCalledWith(
          scheduleId,
          JobStatus.REVIEW,
          mockTenantId,
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

        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.APPROVED,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });
    });

    describe('REJECTED status', () => {
      it('should throw BadRequestException if reason is not provided', async () => {
        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);

        await expect(
          service.updateStatus(
            scheduleId,
            mockTenantId,
            JobStatus.REJECTED,
            mockUser,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update status to REJECTED with reason and send notification', async () => {
        const reason = 'Invalid configuration';
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.REJECTED,
          mockUser,
          reason,
        );

        expect(result).toEqual(expectedResult);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
        expect(adminServiceClient.updateScheduleByStatus).toHaveBeenCalledWith(
          scheduleId,
          JobStatus.REJECTED,
          mockTenantId,
          mockToken,
          reason,
        );
      });
    });

    describe('EXPORTED status', () => {
      it('should export schedule to SFTP and send notification', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        sftpService.createFile.mockResolvedValue(undefined);
        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.EXPORTED,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(adminServiceClient.findScheduleById).toHaveBeenCalledWith(
          scheduleId,
          mockToken,
        );
        expect(sftpService.createFile).toHaveBeenCalledWith(
          `cron_${mockTenantId}_${scheduleId}`,
          expect.objectContaining({
            ...mockSchedule,
            status: JobStatus.READY,
          }),
        );
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });
    });

    describe('DEPLOYED status', () => {
      it('should deploy schedule from SFTP and send notification', async () => {
        const fileName = `cron_${mockTenantId}_${scheduleId}`;
        const expectedResult = {
          success: true,
          message: `Schedule with id ${scheduleId} successfully deployed.`,
        };

        sftpService.readFile.mockResolvedValue(mockSchedule);
        adminServiceClient.createSchedule.mockResolvedValue({
          success: true,
          message: 'Schedule created',
        });
        sftpService.deleteFile.mockResolvedValue(undefined);
        notificationService.sendWorkflowNotification.mockResolvedValue(
          undefined,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.DEPLOYED,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
        expect(adminServiceClient.createSchedule).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockSchedule,
            id: mockSchedule.id,
            tenant_id: mockTenantId,
            status: JobStatus.DEPLOYED,
          }),
          mockToken,
        );
        expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
        expect(notificationService.sendWorkflowNotification).toHaveBeenCalled();
      });

      it('should handle SFTP read errors', async () => {
        const errorMessage = 'File not found';
        sftpService.readFile.mockRejectedValue(new Error(errorMessage));

        await expect(
          service.updateStatus(
            scheduleId,
            mockTenantId,
            JobStatus.DEPLOYED,
            mockUser,
          ),
        ).rejects.toThrow(BadRequestException);

        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    it('should handle errors and log them', async () => {
      const errorMessage = 'Update status failed';
      adminServiceClient.updateScheduleByStatus.mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.INPROGRESS,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });
});
