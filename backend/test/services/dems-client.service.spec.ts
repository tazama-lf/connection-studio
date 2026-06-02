import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DemsClient } from '../../src/services/dems-client.service';
import { of, throwError } from 'rxjs';

describe('DemsClient', () => {
  let service: DemsClient;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemsClient,
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

    service = module.get<DemsClient>(DemsClient);
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
        'DemsClient',
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
        'DemsClient',
      );
    });

    it('should handle non-Error HTTP failures', async () => {
      httpService.patch.mockReturnValue(throwError(() => 'plain string error'));

      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'DemsClient',
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
