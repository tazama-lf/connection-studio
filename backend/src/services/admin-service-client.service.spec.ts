import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AdminServiceClient } from './admin-service-client.service';
import { of, throwError } from 'rxjs';
import { JobStatus, ScheduleStatus, ConfigType } from '@tazama-lf/tcs-lib';

describe('AdminServiceClient', () => {
  let service: AdminServiceClient;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockToken = 'Bearer test-token';
  const mockAdminServiceUrl = 'http://localhost:3100';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminServiceClient,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            patch: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockAdminServiceUrl),
          },
        },
      ],
    }).compile();

    service = module.get<AdminServiceClient>(AdminServiceClient);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with admin service URL from config', () => {
    expect(configService.get).toHaveBeenCalledWith('ADMIN_SERVICE_URL');
  });

  it('should use default URL if config is not provided', () => {
    const customConfig = {
      get: jest.fn().mockReturnValue(null),
    };
    new AdminServiceClient(httpService, customConfig as any);
    expect(customConfig.get).toHaveBeenCalledWith('ADMIN_SERVICE_URL');
  });

  describe('forwardRequest', () => {
    it('should forward GET request successfully', async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      httpService.get.mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest('GET', '/test/path');

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test/path`,
        { headers: undefined },
      );
      expect(result).toEqual({ success: true });
    });

    it('should forward POST request with body', async () => {
      const mockBody = { data: 'test' };
      const mockResponse = { data: { id: 1 }, status: 201 };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest(
        'POST',
        '/test/create',
        mockBody,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test/create`,
        mockBody,
        { headers: undefined },
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should forward PUT request successfully', async () => {
      const mockBody = { update: 'data' };
      const mockResponse = { data: { updated: true }, status: 200 };
      httpService.put.mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest(
        'PUT',
        '/test/update/1',
        mockBody,
      );

      expect(httpService.put).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test/update/1`,
        mockBody,
        { headers: undefined },
      );
      expect(result).toEqual({ updated: true });
    });

    it('should forward DELETE request successfully', async () => {
      const mockResponse = { data: { deleted: true }, status: 200 };
      httpService.delete.mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest('DELETE', '/test/delete/1');

      expect(httpService.delete).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test/delete/1`,
        { headers: undefined, data: undefined },
      );
      expect(result).toEqual({ deleted: true });
    });

    it('should forward PATCH request successfully', async () => {
      const mockBody = { patch: 'data' };
      const mockResponse = { data: { patched: true }, status: 200 };
      httpService.patch.mockReturnValue(of(mockResponse) as any);

      const result = await service.forwardRequest(
        'PATCH',
        '/test/patch/1',
        mockBody,
      );

      expect(httpService.patch).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test/patch/1`,
        mockBody,
        { headers: undefined },
      );
      expect(result).toEqual({ patched: true });
    });

    it('should include headers in request', async () => {
      const headers = { Authorization: 'Bearer test' };
      const mockResponse = { data: {}, status: 200 };
      httpService.get.mockReturnValue(of(mockResponse) as any);

      await service.forwardRequest('GET', '/test', undefined, headers);

      expect(httpService.get).toHaveBeenCalledWith(
        `${mockAdminServiceUrl}/test`,
        { headers },
      );
    });

    it('should handle error response from server', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };
      httpService.get.mockReturnValue(throwError(() => errorResponse) as any);

      await expect(service.forwardRequest('GET', '/test')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.forwardRequest('GET', '/test');
      } catch (error) {
        expect(error.getStatus()).toBe(404);
        expect(error.message).toBe('Not found');
      }
    });

    it('should handle no response error', async () => {
      const errorRequest = {
        request: {},
        message: 'Network error',
      };
      httpService.get.mockReturnValue(throwError(() => errorRequest) as any);

      await expect(service.forwardRequest('GET', '/test')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.forwardRequest('GET', '/test');
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(error.message).toBe('Admin service is unavailable');
      }
    });

    it('should handle request setup error', async () => {
      const setupError = {
        message: 'Setup error',
      };
      httpService.get.mockReturnValue(throwError(() => setupError) as any);

      await expect(service.forwardRequest('GET', '/test')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.forwardRequest('GET', '/test');
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.message).toBe('Internal server error');
      }
    });
  });

  describe('Job Operations', () => {
    describe('createPushJob', () => {
      it('should create push job successfully', async () => {
        const job = { name: 'test-job' };
        const mockResponse = { data: { id: 'job-123' }, status: 201 };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.createPushJob(job, mockToken);

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/push/create`,
          job,
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockToken}`,
            }),
          }),
        );
        expect(result).toEqual({ id: 'job-123' });
      });

      it('should handle error when creating push job', async () => {
        const job = { name: 'test-job' };
        httpService.post.mockReturnValue(
          throwError(() => ({
            response: { status: 400, data: { message: 'Invalid job' } },
          })) as any,
        );

        await expect(service.createPushJob(job, mockToken)).rejects.toThrow(
          HttpException,
        );
      });
    });

    describe('createPullJob', () => {
      it('should create pull job successfully', async () => {
        const job = { name: 'pull-job' };
        const mockResponse = { data: { id: 'pull-123' }, status: 201 };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.createPullJob(job, mockToken);

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/pull/create`,
          job,
          expect.any(Object),
        );
        expect(result).toEqual({ id: 'pull-123' });
      });
    });

    describe('getAllJobs', () => {
      it('should get all jobs successfully', async () => {
        const mockJobs = [{ id: '1' }, { id: '2' }];
        const mockResponse = { data: mockJobs, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getAllJobs(1, 10, 'tenant-1', mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/get/all`,
          expect.objectContaining({
            params: {
              tenantId: 'tenant-1',
              page: 1,
              limit: 10,
            },
          }),
        );
        expect(result).toEqual(mockJobs);
      });
    });

    describe('findJobById', () => {
      it('should find job by id successfully', async () => {
        const mockJob = { id: 'job-1', name: 'Test Job' };
        const mockResponse = { data: mockJob, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.findJobById(
          'job-1',
          'push_jobs',
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/get/job-1`,
          expect.objectContaining({
            params: { tableName: 'push_jobs' },
          }),
        );
        expect(result).toEqual(mockJob);
      });
    });

    describe('findJobByStatus', () => {
      it('should find jobs by status successfully', async () => {
        const mockJobs = [{ id: '1', status: 'APPROVED' }];
        const mockResponse = { data: mockJobs, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.findJobByStatus(
          'tenant-1',
          JobStatus.APPROVED,
          1,
          10,
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/get/status`,
          expect.objectContaining({
            params: expect.objectContaining({
              tenantId: 'tenant-1',
              status: JobStatus.APPROVED,
            }),
          }),
        );
        expect(result).toEqual(mockJobs);
      });
    });

    describe('updateJobActivation', () => {
      it('should update job activation successfully', async () => {
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.updateJobActivation(
          'job-1',
          ScheduleStatus.ACTIVE,
          'push_jobs',
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/update/activation/job-1`,
          { status: ScheduleStatus.ACTIVE, tableName: 'push_jobs' },
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, message: 'Updated' });
      });
    });

    describe('updateJobByStatus', () => {
      it('should update job by status without reason', async () => {
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.updateJobByStatus(
          'job-1',
          JobStatus.DEPLOYED,
          'tenant-1',
          ConfigType.PUSH,
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/update/status/job-1`,
          {},
          expect.objectContaining({
            params: {
              tenantId: 'tenant-1',
              type: ConfigType.PUSH,
              status: JobStatus.DEPLOYED,
            },
          }),
        );
        expect(result).toEqual({ success: true, message: 'Updated' });
      });

      it('should update job by status with reason', async () => {
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        await service.updateJobByStatus(
          'job-1',
          JobStatus.REJECTED,
          'tenant-1',
          ConfigType.PUSH,
          mockToken,
          'Job failed due to error',
        );

        expect(httpService.put).toHaveBeenCalledWith(
          expect.any(String),
          { reason: 'Job failed due to error' },
          expect.any(Object),
        );
      });
    });

    describe('updateJob', () => {
      it('should update job successfully', async () => {
        const updateDto = { name: 'Updated Job' };
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.updateJob(
          'job-1',
          updateDto as any,
          ConfigType.PUSH,
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/update/job-1`,
          { job: updateDto, type: ConfigType.PUSH },
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, message: 'Updated' });
      });
    });

    describe('validateExisting', () => {
      it('should validate existing table successfully', async () => {
        const mockResponse = {
          data: { success: true },
          status: 200,
        };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.validateExisting('push_jobs', mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/job/table`,
          expect.objectContaining({
            params: { tableName: 'push_jobs' },
          }),
        );
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('Schedule Operations', () => {
    describe('createSchedule', () => {
      it('should create schedule successfully', async () => {
        const schedule = { name: 'test-schedule' };
        const mockResponse = {
          data: { success: true, message: 'Created' },
          status: 201,
        };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.createSchedule(schedule, mockToken);

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/create`,
          schedule,
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, message: 'Created' });
      });
    });

    describe('findScheduleById', () => {
      it('should find schedule by id successfully', async () => {
        const mockSchedule = { id: 'sched-1', name: 'Test Schedule' };
        const mockResponse = { data: mockSchedule, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.findScheduleById('sched-1', mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/sched-1`,
          expect.any(Object),
        );
        expect(result).toEqual(mockSchedule);
      });
    });

    describe('updateSchedule', () => {
      it('should update schedule successfully', async () => {
        const updateDto = { name: 'Updated Schedule' };
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.updateSchedule(
          'sched-1',
          updateDto as any,
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/update/sched-1`,
          updateDto,
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, message: 'Updated' });
      });
    });

    describe('getAllSchedule', () => {
      it('should get all schedules successfully', async () => {
        const mockSchedules = [{ id: '1' }, { id: '2' }];
        const mockResponse = { data: mockSchedules, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getAllSchedule(
          1,
          10,
          'tenant-1',
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/get/all`,
          expect.objectContaining({
            params: {
              tenantId: 'tenant-1',
              page: 1,
              limit: 10,
            },
          }),
        );
        expect(result).toEqual(mockSchedules);
      });
    });

    describe('getScheduleByStatus', () => {
      it('should get schedules by status successfully', async () => {
        const mockSchedules = [{ id: '1', status: 'APPROVED' }];
        const mockResponse = { data: mockSchedules, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getScheduleByStatus(
          JobStatus.APPROVED,
          1,
          10,
          'tenant-1',
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/get/status`,
          expect.objectContaining({
            params: expect.objectContaining({
              status: JobStatus.APPROVED,
              tenantId: 'tenant-1',
            }),
          }),
        );
        expect(result).toEqual(mockSchedules);
      });
    });

    describe('updateScheduleByStatus', () => {
      it('should update schedule by status without reason', async () => {
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.updateScheduleByStatus(
          'sched-1',
          JobStatus.INPROGRESS,
          'tenant-1',
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/schedule/update/status/sched-1`,
          { tenantId: 'tenant-1' },
          expect.objectContaining({
            params: { status: JobStatus.INPROGRESS },
          }),
        );
        expect(result).toEqual({ success: true, message: 'Updated' });
      });

      it('should update schedule by status with reason', async () => {
        const mockResponse = {
          data: { success: true, message: 'Updated' },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        await service.updateScheduleByStatus(
          'sched-1',
          JobStatus.REJECTED,
          'tenant-1',
          mockToken,
          'Cancelled by admin',
        );

        expect(httpService.put).toHaveBeenCalledWith(
          expect.any(String),
          { tenantId: 'tenant-1', reason: 'Cancelled by admin' },
          expect.any(Object),
        );
      });
    });
  });

  describe('TCS Config Operations', () => {
    describe('validateConfigCreation', () => {
      it('should validate config creation successfully', async () => {
        const mockResponse = {
          data: { success: true, validated: true },
          status: 200,
        };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.validateConfigCreation(
          'pain.001',
          'pacs.008',
          '1.0',
          mockToken,
        );

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config`,
          { msgFam: 'pain.001', transactionType: 'pacs.008', version: '1.0' },
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, validated: true });
      });
    });

    describe('validateConfigUpdate', () => {
      it('should validate config update successfully', async () => {
        const updates = { version: '2.0' };
        const mockResponse = {
          data: { success: true, validated: true },
          status: 200,
        };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.validateConfigUpdate(
          1,
          updates,
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1`,
          updates,
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, validated: true });
      });
    });

    describe('validateConfigClone', () => {
      it('should validate config clone successfully', async () => {
        const mockResponse = {
          data: { success: true, validated: true },
          status: 200,
        };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.validateConfigClone(
          1,
          'pain.002',
          '2.0',
          'pacs.009',
          mockToken,
        );

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/clone`,
          {
            sourceConfigId: 1,
            newMsgFam: 'pain.002',
            newVersion: '2.0',
            newTransactionType: 'pacs.009',
          },
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, validated: true });
      });
    });

    describe('validateConfigDeletion', () => {
      it('should validate config deletion successfully', async () => {
        const mockResponse = {
          data: { success: true, validated: true },
          status: 200,
        };
        httpService.delete.mockReturnValue(of(mockResponse) as any);

        const result = await service.validateConfigDeletion(1, mockToken);

        expect(httpService.delete).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1`,
          expect.any(Object),
        );
        expect(result).toEqual({ success: true, validated: true });
      });
    });

    describe('getConfigById', () => {
      it('should get config by id successfully', async () => {
        const mockConfig = { id: 1, name: 'Test Config' };
        const mockResponse = { data: { config: mockConfig }, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getConfigById(1, mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1`,
          expect.any(Object),
        );
        expect(result).toEqual(mockConfig);
      });
    });

    describe('getAllConfigs', () => {
      it('should get all configs with default pagination', async () => {
        const mockConfigs = [{ id: 1 }, { id: 2 }];
        const mockPagination = { total: 2, limit: 10, offset: 0, pages: 1 };
        const mockResponse = {
          data: { configs: mockConfigs, pagination: mockPagination },
          status: 200,
        };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getAllConfigs(mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/0/10`,
          expect.any(Object),
        );
        expect(result).toEqual({
          configs: mockConfigs,
          pagination: mockPagination,
        });
      });

      it('should get all configs with custom pagination', async () => {
        const mockResponse = {
          data: {
            configs: [],
            pagination: { total: 0, limit: 20, offset: 10, pages: 0 },
          },
          status: 200,
        };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        await service.getAllConfigs(mockToken, 20, 10);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/10/20`,
          expect.any(Object),
        );
      });

      it('should return empty arrays if response missing data', async () => {
        const mockResponse = { data: {}, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getAllConfigs(mockToken);

        expect(result.configs).toEqual([]);
        expect(result.pagination.total).toBe(0);
      });
    });

    describe('writeConfig', () => {
      it('should write config successfully', async () => {
        const configData = { name: 'Test Config' };
        const mockConfig = { id: 1, ...configData };
        const mockResponse = { data: { config: mockConfig }, status: 201 };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.writeConfig(configData, mockToken);

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/write`,
          configData,
          expect.any(Object),
        );
        expect(result).toEqual(mockConfig);
      });
    });

    describe('writeConfigUpdate', () => {
      it('should write config update successfully', async () => {
        const updateData = { name: 'Updated Config' };
        const mockConfig = { id: 1, ...updateData };
        const mockResponse = { data: { config: mockConfig }, status: 200 };
        httpService.put.mockReturnValue(of(mockResponse) as any);

        const result = await service.writeConfigUpdate(
          1,
          updateData,
          mockToken,
        );

        expect(httpService.put).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1/write`,
          updateData,
          expect.any(Object),
        );
        expect(result).toEqual(mockConfig);
      });
    });

    describe('writeConfigDelete', () => {
      it('should write config deletion successfully', async () => {
        const mockResponse = { data: {}, status: 204 };
        httpService.delete.mockReturnValue(of(mockResponse) as any);

        await service.writeConfigDelete(1, mockToken);

        expect(httpService.delete).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1/write`,
          expect.any(Object),
        );
      });
    });

    describe('getConfigByEndpoint', () => {
      it('should get config by endpoint successfully', async () => {
        const mockConfigs = [{ id: 1 }];
        const mockPagination = { total: 1, limit: 10, offset: 0, pages: 1 };
        const mockResponse = {
          data: { configs: mockConfigs, pagination: mockPagination },
          status: 200,
        };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getConfigByEndpoint(
          '/api/payment',
          '1.0',
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/endpoint//api/payment/1.0/0/10`,
          expect.any(Object),
        );
        expect(result).toEqual({
          configs: mockConfigs,
          pagination: mockPagination,
        });
      });
    });

    describe('getConfigsByTransactionType', () => {
      it('should get configs by transaction type successfully', async () => {
        const mockConfigs = [{ id: 1 }];
        const mockPagination = { total: 1, limit: 10, offset: 0, pages: 1 };
        const mockResponse = {
          data: { configs: mockConfigs, pagination: mockPagination },
          status: 200,
        };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getConfigsByTransactionType(
          'pacs.008',
          mockToken,
        );

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/transaction/pacs.008/0/10`,
          expect.any(Object),
        );
        expect(result).toEqual({
          configs: mockConfigs,
          pagination: mockPagination,
        });
      });
    });

    describe('getPendingApprovals', () => {
      it('should get pending approvals successfully', async () => {
        const mockConfigs = [{ id: 1, status: 'pending' }];
        const mockResponse = { data: { configs: mockConfigs }, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getPendingApprovals(mockToken);

        expect(httpService.get).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/pending-approvals`,
          expect.any(Object),
        );
        expect(result).toEqual(mockConfigs);
      });

      it('should return empty array if no configs in response', async () => {
        const mockResponse = { data: {}, status: 200 };
        httpService.get.mockReturnValue(of(mockResponse) as any);

        const result = await service.getPendingApprovals(mockToken);

        expect(result).toEqual([]);
      });
    });

    describe('runRawQuery', () => {
      it('should run raw query successfully', async () => {
        const query = 'SELECT * FROM configs';
        const mockResult = { rows: [{ id: 1 }] };
        const mockResponse = { data: mockResult, status: 200 };
        httpService.post.mockReturnValue(of(mockResponse) as any);

        const result = await service.runRawQuery(query, mockToken);

        expect(httpService.post).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/raw-query`,
          { query },
          expect.any(Object),
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('updatePublishingStatus', () => {
      it('should update publishing status to active', async () => {
        const mockResponse = { data: { success: true }, status: 200 };
        httpService.patch.mockReturnValue(of(mockResponse) as any);

        const result = await service.updatePublishingStatus(
          1,
          'active',
          mockToken,
        );

        expect(httpService.patch).toHaveBeenCalledWith(
          `${mockAdminServiceUrl}/v1/admin/tcs/config/1/publishing-status`,
          { publishing_status: 'active' },
          expect.any(Object),
        );
        expect(result).toEqual({ success: true });
      });

      it('should update publishing status to inactive', async () => {
        const mockResponse = { data: { success: true }, status: 200 };
        httpService.patch.mockReturnValue(of(mockResponse) as any);

        await service.updatePublishingStatus(1, 'inactive', mockToken);

        expect(httpService.patch).toHaveBeenCalledWith(
          expect.any(String),
          { publishing_status: 'inactive' },
          expect.any(Object),
        );
      });
    });
  });

  describe('handleError', () => {
    it('should handle response error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };
      httpService.get.mockReturnValue(throwError(() => errorResponse) as any);

      await expect(service.getConfigById(1, mockToken)).rejects.toThrow(
        HttpException,
      );

      try {
        await service.getConfigById(1, mockToken);
      } catch (error) {
        expect(error.getStatus()).toBe(400);
        expect(error.message).toBe('Bad request');
      }
    });

    it('should handle response error without message', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: 'Internal error',
        },
      };
      httpService.get.mockReturnValue(throwError(() => errorResponse) as any);

      await expect(service.getConfigById(1, mockToken)).rejects.toThrow(
        HttpException,
      );

      try {
        await service.getConfigById(1, mockToken);
      } catch (error) {
        expect(error.getStatus()).toBe(500);
      }
    });

    it('should handle no response error', async () => {
      const errorRequest = {
        request: {},
        message: 'Network timeout',
      };
      httpService.get.mockReturnValue(throwError(() => errorRequest) as any);

      await expect(service.getConfigById(1, mockToken)).rejects.toThrow(
        HttpException,
      );

      try {
        await service.getConfigById(1, mockToken);
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(error.message).toBe('Admin service is unavailable');
      }
    });

    it('should handle generic error', async () => {
      const genericError = {
        message: 'Unknown error',
      };
      httpService.get.mockReturnValue(throwError(() => genericError) as any);

      await expect(service.getConfigById(1, mockToken)).rejects.toThrow(
        HttpException,
      );

      try {
        await service.getConfigById(1, mockToken);
      } catch (error) {
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.message).toBe('Internal server error');
      }
    });
  });
});
