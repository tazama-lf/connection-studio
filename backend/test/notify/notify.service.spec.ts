import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';
import { NotifyService } from '../../src/notify/notify.service';
import { StartupFactory } from '@tazama-lf/frms-coe-startup-lib';
import { of, throwError } from 'rxjs';

jest.mock('@tazama-lf/frms-coe-startup-lib');

describe('NotifyService', () => {
  let service: NotifyService;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let httpService: jest.Mocked<HttpService>;
  let mockNatsService: any;
  let mockAckService: any;

  beforeEach(async () => {
    mockNatsService = {
      initProducer: jest.fn().mockResolvedValue(undefined),
      handleResponse: jest.fn().mockResolvedValue(undefined),
    };

    mockAckService = {
      init: jest.fn().mockResolvedValue(undefined),
    };

    (
      StartupFactory as jest.MockedClass<typeof StartupFactory>
    ).mockImplementation(() => {
      const instances = [mockNatsService, mockAckService];
      const instance = instances.shift();
      return instance as any;
    });

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
          },
        },
      ],
    }).compile();

    service = module.get<NotifyService>(NotifyService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;

    (service as any).natsService = mockNatsService;
    (service as any).ackService = mockAckService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: string) => {
          const config: Record<string, string> = {
            CONSUMER_STREAM: 'config.notification.response',
            PRODUCER_STREAM: 'config.notification',
          };
          return config[key] || defaultValue;
        },
      );
    });

    it('should initialize all services successfully', async () => {
      await service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith(
        'CONSUMER_STREAM',
        'config.notification.response',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'PRODUCER_STREAM',
        'config.notification',
      );
    });

    it('should use default values if config is not provided', async () => {
      configService.get.mockReturnValue(undefined);

      await service.onModuleInit();
    });

    it('should handle NATS producer initialization errors', async () => {
      const error = new Error('NATS connection failed');
      mockNatsService.initProducer.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);
    });

    it('should handle ACK service initialization errors', async () => {
      const error = new Error('ACK service failed');
      mockAckService.init.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);
    });

    it('should handle non-Error thrown during initialization', async () => {
      mockNatsService.initProducer.mockRejectedValue('plain string error');

      await expect(service.onModuleInit()).rejects.toBe('plain string error');

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'NotificationController',
      );
    });
  });

  describe('handleAckMessage', () => {
    it('should handle ACK message and log it', async () => {
      const mockReqObj = { transactionId: '123', status: 'SUCCESS' };
      const mockHandleResponse = jest.fn().mockResolvedValue(undefined);

      await (service as any).handleAckMessage(mockReqObj, mockHandleResponse);

      expect(mockHandleResponse).toHaveBeenCalledWith({
        status: 'ACK_RECEIVED',
        timestamp: expect.any(String),
      });
    });

    it('should handle empty ACK message', async () => {
      const mockHandleResponse = jest.fn().mockResolvedValue(undefined);

      await (service as any).handleAckMessage({}, mockHandleResponse);

      expect(mockHandleResponse).toHaveBeenCalled();
    });

    it('should include valid ISO timestamp in response', async () => {
      const mockHandleResponse = jest.fn().mockResolvedValue(undefined);

      await (service as any).handleAckMessage({}, mockHandleResponse);

      const responseArg = mockHandleResponse.mock.calls[0][0];
      expect(responseArg.timestamp).toBeDefined();
      expect(() => new Date(responseArg.timestamp)).not.toThrow();
    });
  });

  describe('notifyEnrichment', () => {
    const mockId = 'endpoint-123';
    const mockType = ConfigType.PUSH;

    it('should send notification to data enrichment service', async () => {
      await service.notifyEnrichment(mockId, mockType);

      expect(mockNatsService.handleResponse).toHaveBeenCalledWith({
        dataPayload: JSON.stringify({
          endpointId: mockId,
          configType: mockType,
        }),
      });
    });

    it('should send notification for PULL config type', async () => {
      await service.notifyEnrichment(mockId, ConfigType.PULL);

      expect(mockNatsService.handleResponse).toHaveBeenCalledWith({
        dataPayload: JSON.stringify({
          endpointId: mockId,
          configType: ConfigType.PULL,
        }),
      });
    });

    it('should handle NATS service errors', async () => {
      const error = new Error('NATS publish failed');
      mockNatsService.handleResponse.mockRejectedValue(error);

      await service.notifyEnrichment(mockId, mockType);
    });

    it('should handle non-Error thrown in notifyEnrichment', async () => {
      mockNatsService.handleResponse.mockRejectedValue('plain string error');

      await service.notifyEnrichment(mockId, mockType);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'NotificationController',
      );
    });

    it('should stringify payload correctly', async () => {
      await service.notifyEnrichment(mockId, mockType);

      const callArg = mockNatsService.handleResponse.mock.calls[0][0];
      expect(callArg.dataPayload).toBe(
        JSON.stringify({
          endpointId: mockId,
          configType: mockType,
        }),
      );
    });
  });

  describe('notifyDems', () => {
    const mockConfigId = 'config-123';
    const mockTenantId = 'tenant-456';
    const adminServiceUrl = 'http://admin-service:3000';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ADMIN_SERVICE_URL') return adminServiceUrl;
        return undefined;
      });
      httpService.post.mockReturnValue(of({ data: {}, status: 200 } as any));
    });

    it('should POST to the correct URL with active status', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(httpService.post).toHaveBeenCalledWith(
        `${adminServiceUrl}/config-notify/${mockConfigId}`,
        { publishing_status: 'active' },
      );
    });

    it('should POST to the correct URL with inactive status', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'inactive');

      expect(httpService.post).toHaveBeenCalledWith(
        `${adminServiceUrl}/config-notify/${mockConfigId}`,
        { publishing_status: 'inactive' },
      );
    });

    it('should log success after posting', async () => {
      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(mockConfigId),
        'NotifyService',
      );
    });

    it('should handle HTTP errors without throwing', async () => {
      httpService.post.mockReturnValue(
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
      httpService.post.mockReturnValue(
        throwError(() => 'plain string error'),
      );

      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unknown error'),
        }),
        'NotifyService',
      );
    });

    it('should fall back to empty string when ADMIN_SERVICE_URL is not set', async () => {
      configService.get.mockReturnValue(undefined);

      await service.notifyDems(mockConfigId, mockTenantId, 'active');

      expect(httpService.post).toHaveBeenCalledWith(
        `/config-notify/${mockConfigId}`,
        { publishing_status: 'active' },
      );
    });
  });

  describe('Stream Configuration', () => {
    it('should use configured stream values', async () => {
      const customStreams = {
        CONSUMER_STREAM: 'custom.consumer.stream',
        PRODUCER_STREAM: 'custom.producer.stream',
      };

      configService.get.mockImplementation(
        (key: string, defaultValue?: string) => {
          return (
            customStreams[key as keyof typeof customStreams] || defaultValue
          );
        },
      );

      await service.onModuleInit();
      expect(mockAckService.init).toHaveBeenCalledWith(
        expect.any(Function),
        loggerService,
        ['custom.consumer.stream'],
        'tcs.ack.response',
      );
    });
  });

  describe('Error Handling', () => {
    it('should not throw errors in notifyEnrichment even if NATS fails', async () => {
      mockNatsService.handleResponse.mockRejectedValue(
        new Error('NATS failed'),
      );

      await expect(
        service.notifyEnrichment('test-id', ConfigType.PUSH),
      ).resolves.not.toThrow();
    });

    it('should not throw errors in notifyDems even if HTTP fails', async () => {
      configService.get.mockReturnValue('http://admin-service:3000');
      httpService.post.mockReturnValue(
        throwError(() => new Error('HTTP failed')),
      );

      await expect(
        service.notifyDems('config-id', 'tenant-id', 'active'),
      ).resolves.not.toThrow();
    });
  });
});
