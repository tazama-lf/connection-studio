import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import SFTPClient from 'ssh2-sftp-client';
import * as utils from '../../src/utils/helpers';
import { SftpService } from '../../src/sftp/sftp.service';
import { Config } from '@tazama-lf/tcs-lib';

jest.mock('ssh2-sftp-client');
jest.mock('../../src/utils/helpers');

describe('SftpService', () => {
  let service: SftpService;
  let configService: jest.Mocked<ConfigService>;
  let loggerService: jest.Mocked<LoggerService>;
  let mockConsumerSftp: jest.Mocked<SFTPClient>;
  let mockProducerSftp: jest.Mocked<SFTPClient>;

  const mockFileName = 'test-file';
  const mockTenantId = 'tenant-123';
  const mockData = { id: '123', name: 'Test Data' } as unknown as Config;
  const mockBuffer = Buffer.from(JSON.stringify(mockData, null, 2));
  const mockHash = 'mock-sha256-hash';

  beforeEach(async () => {
    mockConsumerSftp = {
      connect: jest.fn(),
      end: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    } as any;

    mockProducerSftp = {
      connect: jest.fn(),
      end: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    } as any;

    (SFTPClient as jest.MockedClass<typeof SFTPClient>).mockImplementation(
      () => {
        const instance = jest.fn().mockReturnValue(mockConsumerSftp);
        return instance() as any;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SftpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SftpService>(SftpService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;

    (service as any).consumerSftp = mockConsumerSftp;
    (service as any).producerSftp = mockProducerSftp;

    (utils.decrypt as jest.Mock).mockImplementation((val) => val);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to consumer and producer SFTP on initialization', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          SFTP_HOST_CONSUMER: 'consumer.sftp.com',
          SFTP_PORT_CONSUMER: 22,
          SFTP_USERNAME_CONSUMER: 'consumer-user',
          SFTP_PASSWORD_CONSUMER: 'consumer-pass',
          SFTP_HOST_PRODUCER: 'producer.sftp.com',
          SFTP_PORT_PRODUCER: 22,
          SFTP_USERNAME_PRODUCER: 'producer-user',
          SFTP_PASSWORD_PRODUCER: 'producer-pass',
        };
        return config[key];
      });

      mockConsumerSftp.connect.mockResolvedValue(undefined);
      mockProducerSftp.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConsumerSftp.connect).toHaveBeenCalledWith({
        host: 'consumer.sftp.com',
        port: 22,
        username: 'consumer-user',
        password: 'consumer-pass',
      });
      expect(mockProducerSftp.connect).toHaveBeenCalledWith({
        host: 'producer.sftp.com',
        port: 22,
        username: 'producer-user',
        password: 'producer-pass',
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Connected to CONSUMER SFTP'),
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Connected to PRODUCER SFTP'),
      );
    });

    it('should skip consumer connection if credentials are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          SFTP_HOST_CONSUMER: undefined,
          SFTP_HOST_PRODUCER: 'producer.sftp.com',
          SFTP_PORT_PRODUCER: 22,
          SFTP_USERNAME_PRODUCER: 'producer-user',
          SFTP_PASSWORD_PRODUCER: 'producer-pass',
        };
        return config[key];
      });

      mockProducerSftp.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockConsumerSftp.connect).not.toHaveBeenCalled();
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Consumer SFTP credentials not provided'),
      );
    });

    it('should skip producer connection if credentials are missing', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          SFTP_HOST_CONSUMER: 'consumer.sftp.com',
          SFTP_PORT_CONSUMER: 22,
          SFTP_USERNAME_CONSUMER: 'consumer-user',
          SFTP_PASSWORD_CONSUMER: 'consumer-pass',
          SFTP_HOST_PRODUCER: undefined,
        };
        return config[key];
      });

      mockConsumerSftp.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockProducerSftp.connect).not.toHaveBeenCalled();
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Producer SFTP credentials not provided'),
      );
    });

    it('should handle consumer connection errors', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          SFTP_HOST_CONSUMER: 'consumer.sftp.com',
          SFTP_PORT_CONSUMER: 22,
          SFTP_USERNAME_CONSUMER: 'consumer-user',
          SFTP_PASSWORD_CONSUMER: 'consumer-pass',
          SFTP_HOST_PRODUCER: 'producer.sftp.com',
          SFTP_PORT_PRODUCER: 22,
          SFTP_USERNAME_PRODUCER: 'producer-user',
          SFTP_PASSWORD_PRODUCER: 'producer-pass',
        };
        return config[key];
      });

      const error = new Error('Connection failed');
      mockConsumerSftp.connect.mockRejectedValue(error);
      mockProducerSftp.connect.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to connect to CONSUMER SFTP',
        error,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all SFTP connections', async () => {
      mockConsumerSftp.end.mockResolvedValue(undefined);
      mockProducerSftp.end.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockConsumerSftp.end).toHaveBeenCalled();
      expect(mockProducerSftp.end).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'SFTP connections closed.',
      );
    });

    it('should handle connection close errors gracefully', async () => {
      mockConsumerSftp.end.mockRejectedValue(new Error('Close failed'));
      mockProducerSftp.end.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockConsumerSftp.end).toHaveBeenCalled();
      expect(mockProducerSftp.end).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        'SFTP connections closed.',
      );
    });
  });

  describe('createFile', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'dev',
          SFTP_HOST_CONSUMER: 'consumer.sftp.com',
        };
        return config[key];
      });
    });

    it('should create a file with integrity hash', async () => {
      mockConsumerSftp.put.mockResolvedValue(undefined);

      jest.spyOn(service as any, 'computeSHA256').mockReturnValue(mockHash);

      await service.createFile(mockFileName, mockData);

      expect(mockConsumerSftp.put).toHaveBeenCalledTimes(2);
      expect(mockConsumerSftp.put).toHaveBeenCalledWith(
        expect.any(Buffer),
        `/upload/${mockFileName}.json`,
      );
      expect(mockConsumerSftp.put).toHaveBeenCalledWith(
        Buffer.from(mockHash, 'utf8'),
        `/upload/${mockFileName}.hash`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `File uploaded ${mockFileName}`,
      );
    });

    it('should throw BadRequestException if not in dev environment', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'production',
          SFTP_HOST_CONSUMER: 'consumer.sftp.com',
        };
        return config[key];
      });

      await expect(service.createFile(mockFileName, mockData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createFile(mockFileName, mockData)).rejects.toThrow(
        'Exported status can only be set in the dev environment',
      );
    });

    it('should throw BadRequestException if SFTP host is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'dev',
          SFTP_HOST_CONSUMER: undefined,
        };
        return config[key];
      });

      await expect(service.createFile(mockFileName, mockData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createFile(mockFileName, mockData)).rejects.toThrow(
        'Consumer SFTP server credentials not provided',
      );
    });

    it('should handle SFTP upload errors', async () => {
      const error = new Error('Upload failed');
      mockConsumerSftp.put.mockRejectedValue(error);

      await expect(service.createFile(mockFileName, mockData)).rejects.toThrow(
        error,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload file'),
      );
    });
  });

  describe('createFileForPublisher', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'dev',
          SFTP_HOST_PRODUCER: 'producer.sftp.com',
        };
        return config[key];
      });
    });

    it('should create a file for publisher with integrity hash', async () => {
      mockProducerSftp.put.mockResolvedValue(undefined);

      jest.spyOn(service as any, 'computeSHA256').mockReturnValue(mockHash);

      await service.createFileForPublisher(mockFileName, mockData);

      expect(mockProducerSftp.put).toHaveBeenCalledTimes(2);
      expect(mockProducerSftp.put).toHaveBeenCalledWith(
        expect.any(Buffer),
        `/upload/${mockFileName}.json`,
      );
      expect(mockProducerSftp.put).toHaveBeenCalledWith(
        Buffer.from(mockHash, 'utf8'),
        `/upload/${mockFileName}.hash`,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'File uploaded to producer SFTP for publishers',
        ),
      );
    });

    it('should throw BadRequestException if not in dev environment', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'production',
          SFTP_HOST_PRODUCER: 'producer.sftp.com',
        };
        return config[key];
      });

      await expect(
        service.createFileForPublisher(mockFileName, mockData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if producer SFTP host is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, any> = {
          NODE_ENV: 'dev',
          SFTP_HOST_PRODUCER: undefined,
        };
        return config[key];
      });

      await expect(
        service.createFileForPublisher(mockFileName, mockData),
      ).rejects.toThrow('Producer SFTP server credentials not provided');
    });
  });

  describe('readFile', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('producer.sftp.com');
    });

    it('should read and verify file with integrity check', async () => {
      mockProducerSftp.exists.mockResolvedValue(true);
      mockProducerSftp.get
        .mockResolvedValueOnce(mockBuffer)
        .mockResolvedValueOnce(Buffer.from(mockHash, 'utf8'));

      jest.spyOn(service as any, 'computeSHA256').mockReturnValue(mockHash);

      const result = await service.readFile(mockFileName);

      expect(result).toEqual(mockData);
      expect(mockProducerSftp.exists).toHaveBeenCalledTimes(2);
      expect(mockProducerSftp.get).toHaveBeenCalledWith(
        `/upload/${mockFileName}.json`,
      );
      expect(mockProducerSftp.get).toHaveBeenCalledWith(
        `/upload/${mockFileName}.hash`,
      );
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockProducerSftp.exists.mockResolvedValueOnce(false);

      await expect(service.readFile(mockFileName)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.readFile(mockFileName)).rejects.toThrow(
        'File or its integrity file not found',
      );
    });

    it('should throw NotFoundException if integrity file does not exist', async () => {
      mockProducerSftp.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(service.readFile(mockFileName)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if SFTP host is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.readFile(mockFileName)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      mockProducerSftp.exists.mockResolvedValue(true);
      mockProducerSftp.get.mockRejectedValue(new Error('Unexpected error'));

      await expect(service.readFile(mockFileName)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('producer.sftp.com');
    });

    it('should delete file and its integrity hash', async () => {
      mockProducerSftp.exists.mockResolvedValue(true);
      mockProducerSftp.delete.mockResolvedValue(undefined);

      await service.deleteFile(mockFileName);

      expect(mockProducerSftp.delete).toHaveBeenCalledTimes(2);
      expect(mockProducerSftp.delete).toHaveBeenCalledWith(
        `/upload/${mockFileName}.json`,
      );
      expect(mockProducerSftp.delete).toHaveBeenCalledWith(
        `/upload/${mockFileName}.hash`,
      );
      expect(loggerService.log).toHaveBeenCalledWith('File(s) deleted.');
    });

    it('should throw NotFoundException if no files exist', async () => {
      mockProducerSftp.exists.mockResolvedValue(false);

      await expect(service.deleteFile(mockFileName)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteFile(mockFileName)).rejects.toThrow(
        'File or its integrity file not found',
      );
    });

    it('should delete only existing files', async () => {
      mockProducerSftp.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockProducerSftp.delete.mockResolvedValue(undefined);

      await service.deleteFile(mockFileName);

      expect(mockProducerSftp.delete).toHaveBeenCalledTimes(1);
      expect(mockProducerSftp.delete).toHaveBeenCalledWith(
        `/upload/${mockFileName}.json`,
      );
    });

    it('should throw BadRequestException if SFTP host is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.deleteFile(mockFileName)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listFiles', () => {
    const mockFiles = [
      {
        name: 'de_tenant-123_file1.json',
        size: 100,
        modifyTime: 0,
        accessTime: 0,
        rights: { user: '', group: '', other: '' },
        owner: 0,
        group: 0,
        type: '-' as const,
      },
      {
        name: 'de_tenant-123_file2.json',
        size: 200,
        modifyTime: 0,
        accessTime: 0,
        rights: { user: '', group: '', other: '' },
        owner: 0,
        group: 0,
        type: '-' as const,
      },
      {
        name: 'de_tenant-456_file3.json',
        size: 300,
        modifyTime: 0,
        accessTime: 0,
        rights: { user: '', group: '', other: '' },
        owner: 0,
        group: 0,
        type: '-' as const,
      },
      {
        name: 'cron_tenant-123_file4.json',
        size: 400,
        modifyTime: 0,
        accessTime: 0,
        rights: { user: '', group: '', other: '' },
        owner: 0,
        group: 0,
        type: '-' as const,
      },
    ];

    it('should list files matching pattern', async () => {
      mockProducerSftp.list
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce(
          mockFiles.filter((f) => f.name.startsWith('de_tenant-123')),
        );

      const result = await service.listFiles('/upload', 'de', mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('de_tenant-123_file1.json');
      expect(result[1].name).toBe('de_tenant-123_file2.json');
    });

    it('should list cron files', async () => {
      mockProducerSftp.list
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce(
          mockFiles.filter((f) => f.name.startsWith('cron_tenant-123')),
        );

      const result = await service.listFiles('/upload', 'cron', mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cron_tenant-123_file4.json');
    });

    it('should return empty array if no files match', async () => {
      mockProducerSftp.list
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce([]);

      const result = await service.listFiles('/upload', 'dems', mockTenantId);

      expect(result).toHaveLength(0);
    });

    it('should handle errors when listing files', async () => {
      const error = new Error('List failed');
      mockProducerSftp.list.mockRejectedValue(error);

      await expect(
        service.listFiles('/upload', 'de', mockTenantId),
      ).rejects.toThrow(error);

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to list files'),
      );
    });
  });

  describe('computeSHA256', () => {
    it('should compute SHA256 hash correctly', () => {
      const testData = Buffer.from('test data');
      const hash = (service as any).computeSHA256(testData);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
    });
  });
});
