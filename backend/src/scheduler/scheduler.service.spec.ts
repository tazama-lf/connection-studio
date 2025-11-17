import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DatabaseService } from '../database/database.service';
import { SftpService } from '../sftp/sftp.service';
import { SchedulerService } from './scheduler.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { JobStatus, Schedule } from '@tazama-lf/tcs-lib';
import { CreateScheduleJobDto } from './dto/create-schedule.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UpdateScheduleJobDto } from './dto/update-schedule-dto';
import { AuthenticatedUser } from 'src/auth/auth.types';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let loggerService: jest.Mocked<LoggerService>;
  let sftpService: jest.Mocked<SftpService>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  const mockSchedule: Schedule = {
    id: 'test-schedule-id',
    name: 'Test Schedule',
    cron: '0 0 * * *',
    iterations: 1,
    comments: null,
    start_date: new Date('2025-01-01'),
    end_date: new Date('2025-12-31'),
    tenant_id: 'tenant_abc',
    status: JobStatus.INPROGRESS,
  };

  const mockTenantId = 'tenant_abc';

  const mockUser = {
    tenantId: mockTenantId,
    validClaims: ['EDITOR'],
  };

  const mockToken = 'mock-jwt-token';

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
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
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
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    sftpService = module.get(SftpService) as jest.Mocked<SftpService>;
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

  describe('create', () => {
    const createScheduleDto = {
      name: 'Test Schedule',
      cron: '0 0 * * *',
      start_date: new Date('2025-01-01'),
      end_date: new Date('2025-12-31'),
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
          id: expect.any(String),
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
      const mockSchedules = [mockSchedule];
      adminServiceClient.getAllSchedule.mockResolvedValue(mockSchedules);

      const result = await service.findAll(
        offset,
        limit,
        mockUser as AuthenticatedUser,
      );

      expect(result).toEqual(mockSchedules);
      expect(adminServiceClient.getAllSchedule).toHaveBeenCalledWith(
        offset,
        limit,
        mockUser,
        undefined,
      );
    });

    it('should return schedules with filters', async () => {
      const mockSchedules = [mockSchedule];
      const filters = { status: JobStatus.APPROVED };
      adminServiceClient.getAllSchedule.mockResolvedValue(mockSchedules);

      const result = await service.findAll(
        offset,
        limit,
        mockUser as AuthenticatedUser,
        filters,
      );

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

      await expect(
        service.findAll(offset, limit, mockUser as AuthenticatedUser),
      ).rejects.toThrow();
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

    it('should throw ForbiddenException if schedule is not in INPROGRESS status', async () => {
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

    it('should throw BadRequestException if status is missing', async () => {
      await expect(
        service.findByStatus(null as any, page, limit, mockTenantId, mockToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if page is missing', async () => {
      await expect(
        service.findByStatus(
          status,
          null as any,
          limit,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if limit is missing', async () => {
      await expect(
        service.findByStatus(
          status,
          page,
          null as any,
          mockTenantId,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);
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

    describe('REJECTED status', () => {
      it('should throw BadRequestException if reason is not provided', async () => {
        await expect(
          service.updateStatus(
            scheduleId,
            mockTenantId,
            JobStatus.REJECTED,
            mockToken,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should update status to REJECTED with reason', async () => {
        const reason = 'Invalid configuration';
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.REJECTED,
          mockToken,
          reason,
        );

        expect(result).toEqual(expectedResult);
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
      it('should export schedule to SFTP', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.findScheduleById.mockResolvedValue(mockSchedule);
        sftpService.createFile.mockResolvedValue(undefined);
        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.EXPORTED,
          mockToken,
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
        expect(loggerService.log).toHaveBeenCalledWith(
          expect.stringContaining('Successfully uploaded config file'),
        );
      });
    });

    describe('DEPLOYED status', () => {
      it('should deploy schedule from SFTP', async () => {
        const fileName = `cron_${mockTenantId}_${scheduleId}`;
        const expectedResult = {
          success: true,
          message: `Job with id ${scheduleId} successfully deployed.`,
        };

        sftpService.readFile.mockResolvedValue(mockSchedule);
        adminServiceClient.createSchedule.mockResolvedValue({
          success: true,
          message: 'Schedule created',
        });
        sftpService.deleteFile.mockResolvedValue(undefined);

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.DEPLOYED,
          mockToken,
        );

        expect(result).toEqual(expectedResult);
        expect(sftpService.readFile).toHaveBeenCalledWith(fileName);
        expect(adminServiceClient.createSchedule).toHaveBeenCalledWith(
          { ...mockSchedule, status: JobStatus.DEPLOYED },
          mockToken,
        );
        expect(sftpService.deleteFile).toHaveBeenCalledWith(fileName);
      });

      it('should handle SFTP read errors', async () => {
        const errorMessage = 'File not found';
        sftpService.readFile.mockRejectedValue(new Error(errorMessage));

        await expect(
          service.updateStatus(
            scheduleId,
            mockTenantId,
            JobStatus.DEPLOYED,
            mockToken,
          ),
        ).rejects.toThrow(BadRequestException);

        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe('Other statuses', () => {
      it('should update status for APPROVED', async () => {
        const expectedResult = {
          success: true,
          message: 'Status updated successfully',
        };

        adminServiceClient.updateScheduleByStatus.mockResolvedValue(
          expectedResult,
        );

        const result = await service.updateStatus(
          scheduleId,
          mockTenantId,
          JobStatus.APPROVED,
          mockToken,
        );

        expect(result).toEqual(expectedResult);
        expect(adminServiceClient.updateScheduleByStatus).toHaveBeenCalledWith(
          scheduleId,
          JobStatus.APPROVED,
          mockTenantId,
          mockToken,
          undefined,
        );
      });
    });

    it('should throw BadRequestException if status is missing', async () => {
      await expect(
        service.updateStatus(scheduleId, mockTenantId, null as any, mockToken),
      ).rejects.toThrow(BadRequestException);
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
          JobStatus.APPROVED,
          mockToken,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage),
      );
    });
  });
});
