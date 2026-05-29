import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';
import { NotifyService } from '../../src/notify/notify.service';
import { of, throwError } from 'rxjs';

describe('NotifyService', () => {
  let service: NotifyService;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyService,
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            patch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotifyService>(NotifyService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyEnrichment', () => {
    const mockId = 'endpoint-123';
    const mockType = ConfigType.PUSH;
    const mockToken = 'mock-jwt-token';
    const deapiUrl = 'http://deapi:3001';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'DEAPI_URL') return deapiUrl;
        return undefined;
      });
      httpService.post.mockReturnValue(of({ data: {}, status: 200 } as any));
    });

    it('should POST to the correct URL with type query param', async () => {
      await service.notifyEnrichment(mockId, mockType, mockToken);

      expect(httpService.post).toHaveBeenCalledWith(
        `${deapiUrl}/job-notify/${mockId}?type=${mockType}`,
        null,
        { headers: { Authorization: `Bearer ${mockToken}` } },
      );
    });

    it('should not double-prefix Bearer if token already has it', async () => {
      await service.notifyEnrichment(mockId, mockType, `Bearer ${mockToken}`);

      expect(httpService.post).toHaveBeenCalledWith(expect.any(String), null, {
        headers: { Authorization: `Bearer ${mockToken}` },
      });
    });

    it('should send notification for PULL config type', async () => {
      await service.notifyEnrichment(mockId, ConfigType.PULL, mockToken);

      expect(httpService.post).toHaveBeenCalledWith(
        `${deapiUrl}/job-notify/${mockId}?type=${ConfigType.PULL}`,
        null,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });

    it('should handle HTTP errors without throwing', async () => {
      httpService.post.mockReturnValue(
        throwError(() => new Error('HTTP request failed')),
      );

      await expect(
        service.notifyEnrichment(mockId, mockType, mockToken),
      ).resolves.not.toThrow();

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('HTTP request failed'),
        }),
        'NotifyService',
      );
    });

    it('should handle non-Error thrown in notifyEnrichment', async () => {
      httpService.post.mockReturnValue(throwError(() => 'plain string error'));

      await service.notifyEnrichment(mockId, mockType, mockToken);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'NotifyService',
      );
    });

    it('should fall back to empty base URL when DEAPI_URL is not set', async () => {
      configService.get.mockReturnValue(undefined);

      await service.notifyEnrichment(mockId, mockType, mockToken);

      expect(httpService.post).toHaveBeenCalledWith(
        `/job-notify/${mockId}?type=${mockType}`,
        null,
        expect.any(Object),
      );
    });
  });

  describe('notifyDems', () => {
    const mockConfigId = 'config-123';
    const mockTenantId = 'tenant-456';
    const demsUrl = 'http://dems:3002';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'DEMS_URL') return demsUrl;
        return undefined;
      });
      httpService.patch.mockReturnValue(of({ data: {}, status: 200 } as any));
    });

    it('should PATCH to the correct URL with active status', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(httpService.patch).toHaveBeenCalledWith(
        `${demsUrl}/config-notify/${mockConfigId}`,
        { publishing_status: 'active' },
      );
    });

    it('should PATCH to the correct URL with inactive status', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'inactive');

      expect(httpService.patch).toHaveBeenCalledWith(
        `${demsUrl}/config-notify/${mockConfigId}`,
        { publishing_status: 'inactive' },
      );
    });

    it('should log success after patching', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(mockConfigId),
        'NotifyService',
      );
    });

    it('should handle HTTP errors without throwing', async () => {
      httpService.patch.mockReturnValue(
        throwError(() => new Error('HTTP request failed')),
      );

      await expect(
        service.notifyDems(mockConfigId, mockTenantId, 'active'),
      ).resolves.not.toThrow();

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('HTTP request failed'),
        }),
        'NotifyService',
      );
    });

    it('should handle non-Error HTTP failures', async () => {
      httpService.patch.mockReturnValue(throwError(() => 'plain string error'));

      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'NotifyService',
      );
    });

    it('should fall back to empty string when DEMS_URL is not set', async () => {
      configService.get.mockReturnValue(undefined);

      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(httpService.patch).toHaveBeenCalledWith(
        `/config-notify/${mockConfigId}`,
        { publishing_status: 'active' },
      );
    });
  });

  describe('Error Handling', () => {
    it('should not throw errors in notifyEnrichment even if HTTP fails', async () => {
      configService.get.mockReturnValue('http://deapi:3001');
      httpService.post.mockReturnValue(
        throwError(() => new Error('HTTP failed')),
      );

      await expect(
        service.notifyEnrichment('test-id', ConfigType.PUSH, 'mock-token'),
      ).resolves.not.toThrow();
    });

    it('should not throw errors in notifyDems even if HTTP fails', async () => {
      configService.get.mockReturnValue('http://dems:3002');
      httpService.patch.mockReturnValue(
        throwError(() => new Error('HTTP failed')),
      );

      await expect(
        service.notifyDems('config-id', 'tenant-id', 'active'),
      ).resolves.not.toThrow();
    });
  });
});
