import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';
import { NotifyService } from './notify.service';
import { StartupFactory } from '@tazama-lf/frms-coe-startup-lib';

jest.mock('@tazama-lf/frms-coe-startup-lib');

describe('NotifyService', () => {
  let service: NotifyService;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let mockNatsService: any;
  let mockDemsNatsService: any;
  let mockAckService: any;

  beforeEach(async () => {
    mockNatsService = {
      initProducer: jest.fn().mockResolvedValue(undefined),
      handleResponse: jest.fn().mockResolvedValue(undefined),
    };

    mockDemsNatsService = {
      initProducer: jest.fn().mockResolvedValue(undefined),
      handleResponse: jest.fn().mockResolvedValue(undefined),
    };

    mockAckService = {
      init: jest.fn().mockResolvedValue(undefined),
    };

    (StartupFactory as jest.MockedClass<typeof StartupFactory>).mockImplementation(
      () => {
        const instances = [mockNatsService, mockDemsNatsService, mockAckService];
        const instance = instances.shift();
        return instance as any;
      },
    );

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
      ],
    }).compile();

    service = module.get<NotifyService>(NotifyService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;

    (service as any).natsService = mockNatsService;
    (service as any).demsNatsService = mockDemsNatsService;
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
      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          CONSUMER_STREAM: 'config.notification.response',
          PRODUCER_STREAM: 'config.notification',
          DEMS_STREAM: 'dems.notify',
        };
        return config[key] || defaultValue;
      });
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
      expect(configService.get).toHaveBeenCalledWith('DEMS_STREAM', 'dems.notify');
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

    it('should handle DEMS NATS producer initialization errors', async () => {
      const error = new Error('DEMS NATS connection failed');
      mockDemsNatsService.initProducer.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);

    });

    it('should handle ACK service initialization errors', async () => {
      const error = new Error('ACK service failed');
      mockAckService.init.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow(error);
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
          endpoint_id: mockId,
          config_type: mockType,
        }),
      });
    });

    it('should send notification for PULL config type', async () => {
      await service.notifyEnrichment(mockId, ConfigType.PULL);

      expect(mockNatsService.handleResponse).toHaveBeenCalledWith({
        dataPayload: JSON.stringify({
          endpoint_id: mockId,
          config_type: ConfigType.PULL,
        }),
      });
    });

    it('should handle NATS service errors', async () => {
      const error = new Error('NATS publish failed');
      mockNatsService.handleResponse.mockRejectedValue(error);

      await service.notifyEnrichment(mockId, mockType);

    });

    it('should stringify payload correctly', async () => {
      await service.notifyEnrichment(mockId, mockType);

      const callArg = mockNatsService.handleResponse.mock.calls[0][0];
      expect(callArg.dataPayload).toBe(
        JSON.stringify({
          endpoint_id: mockId,
          config_type: mockType,
        }),
      );
    });

    it('should handle special characters in ID', async () => {
      const specialId = 'endpoint-123-with_special.chars';

      await service.notifyEnrichment(specialId, mockType);

      const callArg = mockNatsService.handleResponse.mock.calls[0][0];
      const parsed = JSON.parse(callArg.dataPayload);
      expect(parsed.endpoint_id).toBe(specialId);
    });
  });

  describe('notifyDems', () => {
    const mockConfigId = 'config-123';
    const mockTenantId = 'tenant-456';

    beforeEach(() => {
      (service as any).demsStream = 'dems.notify';
    });

    it('should send notification to DEMS', async () => {
      await service.notifyDems(mockConfigId, mockTenantId);

      expect(mockDemsNatsService.handleResponse).toHaveBeenCalledWith({
        transactionID: mockConfigId,
      });
    });

    it('should handle DEMS NATS service errors', async () => {
      const error = new Error('DEMS NATS publish failed');
      mockDemsNatsService.handleResponse.mockRejectedValue(error);

      await service.notifyDems(mockConfigId, mockTenantId);
    });

    it('should handle unknown DEMS errors', async () => {
      mockDemsNatsService.handleResponse.mockRejectedValue('Unknown error');

      await service.notifyDems(mockConfigId, mockTenantId);
    });

    it('should send correct payload structure', async () => {
      await service.notifyDems(mockConfigId, mockTenantId);

      expect(mockDemsNatsService.handleResponse).toHaveBeenCalledWith({
        transactionID: mockConfigId,
      });
    });
  });

  describe('Stream Configuration', () => {
    it('should use configured stream values', async () => {
      const customStreams = {
        CONSUMER_STREAM: 'custom.consumer.stream',
        PRODUCER_STREAM: 'custom.producer.stream',
        DEMS_STREAM: 'custom.dems.stream',
      };

      configService.get.mockImplementation((key: string, defaultValue?: string) => {
        return customStreams[key as keyof typeof customStreams] || defaultValue;
      });

      await service.onModuleInit();
      expect(mockAckService.init).toHaveBeenCalledWith(
        expect.any(Function),
        loggerService,
        ['custom.consumer.stream', 'custom.dems.stream'],
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

    it('should not throw errors in notifyDems even if NATS fails', async () => {
      mockDemsNatsService.handleResponse.mockRejectedValue(
        new Error('DEMS NATS failed'),
      );

      await expect(
        service.notifyDems('config-id', 'tenant-id'),
      ).resolves.not.toThrow();

    });
  });
});