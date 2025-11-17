import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  AuthType,
  FileType,
  IngestMode,
  ScheduleStatus,
  SourceType,
} from '@tazama-lf/tcs-lib';
import { of, throwError } from 'rxjs';
import SFTPClient from 'ssh2-sftp-client';
import * as iconv from 'iconv-lite';
import { CreatePullJobDto } from '../job/dto/create-pull-job.dto';
import { DryRunService } from './dry-run.service';
import * as helpers from '../utils/helpers';

jest.mock('ssh2-sftp-client');
jest.mock('iconv-lite');
jest.mock('../utils/helpers');

describe('DryRunService', () => {
  let service: DryRunService;
  let httpService: jest.Mocked<HttpService>;
  let loggerService: jest.Mocked<LoggerService>;
  let mockSftpClient: jest.Mocked<SFTPClient>;

  const mockHttpJob: CreatePullJobDto = {
    endpoint_name: 'Test HTTP Job',
    schedule_id: 'schedule-123',
    source_type: SourceType.HTTP,
    description: 'Test description',
    connection: {
      url: 'https://api.example.com/data',
      headers: { 'Content-Type': 'application/json' },
    },
    file: null as any,
    table_name: 'test_table',
    mode: IngestMode.APPEND,
    version: 'v1',
    publishing_status: ScheduleStatus.INACTIVE,
  };

  const mockSftpJob: CreatePullJobDto = {
    endpoint_name: 'Test SFTP Job',
    schedule_id: 'schedule-123',
    source_type: SourceType.SFTP,
    description: 'Test description',
    connection: {
      host: 'sftp.example.com',
      port: 22,
      user_name: 'testuser',
      password: 'testpass',
      auth_type: AuthType.USERNAME_PASSWORD,
    },
    file: {
      path: '/data/test.csv',
      file_type: FileType.CSV,
      delimiter: ',',
    },
    table_name: 'test_table',
    mode: IngestMode.APPEND,
    version: 'v1',
    publishing_status: ScheduleStatus.INACTIVE,
  };

  const mockCsvData = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
  const mockJsonData = [
    { name: 'John', age: 30, city: 'NYC' },
    { name: 'Jane', age: 25, city: 'LA' },
  ];

  beforeEach(async () => {
    mockSftpClient = {
      connect: jest.fn(),
      end: jest.fn(),
      exists: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    } as any;

    (SFTPClient as jest.MockedClass<typeof SFTPClient>).mockImplementation(
      () => mockSftpClient as any,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DryRunService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
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

    service = module.get<DryRunService>(DryRunService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
    loggerService = module.get(LoggerService) as jest.Mocked<LoggerService>;

    (helpers.isValidText as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dryRun', () => {
    it('should execute HTTP dry run for HTTP source type', async () => {
      httpService.get.mockReturnValue(
        of({
          data: mockJsonData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await service.dryRun(mockHttpJob);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 3000,
        }),
      );
    });

    it('should execute SFTP dry run for SFTP source type', async () => {
      mockSftpClient.connect.mockResolvedValue(undefined);
      mockSftpClient.exists.mockResolvedValue(true);
      mockSftpClient.get.mockResolvedValue(Buffer.from(mockCsvData));
      mockSftpClient.end.mockResolvedValue(undefined);
      (iconv.decode as jest.Mock).mockReturnValue(mockCsvData);

      await service.dryRun(mockSftpJob);

      expect(mockSftpClient.connect).toHaveBeenCalled();
      expect(mockSftpClient.exists).toHaveBeenCalledWith('/data/test.csv');
      expect(mockSftpClient.end).toHaveBeenCalled();
    });

    it('should handle dry run errors', async () => {
      const error = new Error('Connection failed');
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(service.dryRun(mockHttpJob)).rejects.toThrow(
        'Dry run failed',
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Dry run failed'),
      );
    });
  });

  describe('dryRunHttpJob', () => {
    it('should successfully validate HTTP job with array response', async () => {
      httpService.get.mockReturnValue(
        of({
          data: mockJsonData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await (service as any).dryRunHttpJob(mockHttpJob);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.example.com/data',
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 3000,
        },
      );
    });

    it('should successfully validate HTTP job with object response', async () => {
      const singleObject = { name: 'John', age: 30 };
      httpService.get.mockReturnValue(
        of({
          data: singleObject,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await expect(
        (service as any).dryRunHttpJob(mockHttpJob),
      ).resolves.not.toThrow();
    });

    it('should warn when receiving empty array', async () => {
      httpService.get.mockReturnValue(
        of({
          data: [],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await (service as any).dryRunHttpJob(mockHttpJob);

      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Empty array received from HTTP source'),
      );
    });

    it('should throw error for invalid data type', async () => {
      httpService.get.mockReturnValue(
        of({
          data: 'invalid string data',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await expect((service as any).dryRunHttpJob(mockHttpJob)).rejects.toThrow(
        'Invalid data type received from HTTP source',
      );
    });

    it('should handle HTTP request errors', async () => {
      const error = new Error('Network error');
      httpService.get.mockReturnValue(throwError(() => error));

      await expect((service as any).dryRunHttpJob(mockHttpJob)).rejects.toThrow(
        error,
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      httpService.get.mockReturnValue(throwError(() => timeoutError));

      await expect((service as any).dryRunHttpJob(mockHttpJob)).rejects.toThrow(
        timeoutError,
      );
    });
  });

  describe('createSftpConnection', () => {
    it('should create SFTP connection with username/password', async () => {
      const sftpConnection = {
        host: 'sftp.example.com',
        port: 22,
        user_name: 'testuser',
        password: 'testpass',
        auth_type: AuthType.USERNAME_PASSWORD,
      };

      mockSftpClient.connect.mockResolvedValue(undefined);

      const result = await service.createSftpConnection(sftpConnection);

      expect(result).toBe(mockSftpClient);
      expect(mockSftpClient.connect).toHaveBeenCalledWith({
        host: 'sftp.example.com',
        port: 22,
        username: 'testuser',
        password: 'testpass',
      });
    });

    it('should create SFTP connection with private key', async () => {
      const sftpConnection = {
        host: 'sftp.example.com',
        port: 22,
        user_name: 'testuser',
        private_key: 'private-key-content',
        auth_type: AuthType.PRIVATE_KEY,
      };

      mockSftpClient.connect.mockResolvedValue(undefined);

      const result = await service.createSftpConnection(sftpConnection);

      expect(result).toBe(mockSftpClient);
      expect(mockSftpClient.connect).toHaveBeenCalledWith({
        host: 'sftp.example.com',
        port: 22,
        username: 'testuser',
        privateKey: 'private-key-content',
      });
    });

    it('should handle SFTP connection errors', async () => {
      const sftpConnection = {
        host: 'sftp.example.com',
        port: 22,
        user_name: 'testuser',
        password: 'wrongpass',
        auth_type: AuthType.USERNAME_PASSWORD,
      };

      mockSftpClient.connect.mockRejectedValue(
        new Error('Authentication failed'),
      );

      await expect(
        service.createSftpConnection(sftpConnection),
      ).rejects.toThrow('SFTP connection failed: Authentication failed');
    });
  });

  describe('dryRunSftpJob', () => {
    beforeEach(() => {
      mockSftpClient.connect.mockResolvedValue(undefined);
      mockSftpClient.end.mockResolvedValue(undefined);
      (iconv.decode as jest.Mock).mockReturnValue(mockCsvData);
    });

    it('should successfully validate SFTP job with CSV file', async () => {
      mockSftpClient.exists.mockResolvedValue(true);
      mockSftpClient.get.mockResolvedValue(Buffer.from(mockCsvData));

      await (service as any).dryRunSftpJob(mockSftpJob);

      expect(mockSftpClient.exists).toHaveBeenCalledWith('/data/test.csv');
      expect(mockSftpClient.get).toHaveBeenCalledWith('/data/test.csv');
      expect(mockSftpClient.end).toHaveBeenCalled();
    });

    it('should throw error if file path is not provided', async () => {
      const jobWithoutPath = {
        ...mockSftpJob,
        file: { ...mockSftpJob.file, path: '' },
      };

      await expect(
        (service as any).dryRunSftpJob(jobWithoutPath),
      ).rejects.toThrow('File path not provided in job config');
      expect(mockSftpClient.end).toHaveBeenCalled();
    });

    it('should throw error if file does not exist on SFTP server', async () => {
      mockSftpClient.exists.mockResolvedValue(false);

      await expect((service as any).dryRunSftpJob(mockSftpJob)).rejects.toThrow(
        'File /data/test.csv not found on SFTP server',
      );
      expect(mockSftpClient.end).toHaveBeenCalled();
    });

    it('should throw error if no data found in file', async () => {
      mockSftpClient.exists.mockResolvedValue(true);
      mockSftpClient.get.mockResolvedValue(Buffer.from(''));
      (iconv.decode as jest.Mock).mockReturnValue('');

      await expect((service as any).dryRunSftpJob(mockSftpJob)).rejects.toThrow(
        'No data found in provided file',
      );
      expect(loggerService.warn).toHaveBeenCalled();
      expect(mockSftpClient.end).toHaveBeenCalled();
    });

    it('should always close SFTP connection even on error', async () => {
      mockSftpClient.exists.mockRejectedValue(new Error('SFTP error'));

      await expect(
        (service as any).dryRunSftpJob(mockSftpJob),
      ).rejects.toThrow();

      expect(mockSftpClient.end).toHaveBeenCalled();
    });
  });

  describe('transformFileToJSON', () => {
    it('should transform CSV file to JSON', async () => {
      mockSftpClient.get.mockResolvedValue(Buffer.from(mockCsvData));
      (iconv.decode as jest.Mock).mockReturnValue(mockCsvData);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.csv',
        file_type: FileType.CSV,
        delimiter: ',',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('age');
      expect(result[0]).toHaveProperty('city');
    });

    it('should transform TSV file to JSON', async () => {
      const tsvData = 'name\tage\tcity\nJohn\t30\tNYC';
      mockSftpClient.get.mockResolvedValue(Buffer.from(tsvData));
      (iconv.decode as jest.Mock).mockReturnValue(tsvData);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.tsv',
        file_type: FileType.TSV,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'John');
    });

    it('should transform JSON file with array', async () => {
      const jsonString = JSON.stringify(mockJsonData);
      mockSftpClient.get.mockResolvedValue(Buffer.from(jsonString));
      (iconv.decode as jest.Mock).mockReturnValue(jsonString);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.json',
        file_type: FileType.JSON,
      });

      expect(result).toEqual(mockJsonData);
    });

    it('should transform JSON file with single object', async () => {
      const singleObject = { name: 'John', age: 30 };
      const jsonString = JSON.stringify(singleObject);
      mockSftpClient.get.mockResolvedValue(Buffer.from(jsonString));
      (iconv.decode as jest.Mock).mockReturnValue(jsonString);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.json',
        file_type: FileType.JSON,
      });

      expect(result).toEqual([singleObject]);
    });

    it('should handle decoding errors', async () => {
      mockSftpClient.get.mockResolvedValue(Buffer.from(mockCsvData));
      (iconv.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Decoding error');
      });

      await expect(
        service.transformFileToJSON(mockSftpClient, {
          path: '/data/test.csv',
          file_type: FileType.CSV,
          delimiter: ',',
        }),
      ).rejects.toThrow();

      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Decoding failed'),
      );
    });

    it('should handle invalid text after decoding', async () => {
      mockSftpClient.get.mockResolvedValue(Buffer.from(mockCsvData));
      (iconv.decode as jest.Mock).mockReturnValue('invalid���text');
      (helpers.isValidText as jest.Mock).mockReturnValue(false);

      await expect(
        service.transformFileToJSON(mockSftpClient, {
          path: '/data/test.csv',
          file_type: FileType.CSV,
          delimiter: ',',
        }),
      ).rejects.toThrow();

      expect(loggerService.warn).toHaveBeenCalled();
    });

    it('should throw error for unsupported file type', async () => {
      mockSftpClient.get.mockResolvedValue(Buffer.from('data'));
      (iconv.decode as jest.Mock).mockReturnValue('data');

      await expect(
        service.transformFileToJSON(mockSftpClient, {
          path: '/data/test.xml',
          file_type: 'XML' as FileType,
          delimiter: '',
        }),
      ).rejects.toThrow('Unsupported file type');
    });

    it('should handle file read errors', async () => {
      mockSftpClient.get.mockRejectedValue(new Error('File read error'));

      await expect(
        service.transformFileToJSON(mockSftpClient, {
          path: '/data/test.csv',
          file_type: FileType.CSV,
          delimiter: ',',
        }),
      ).rejects.toThrow('File read error');

      expect(loggerService.error).toHaveBeenCalledWith(
        'Error transforming file:',
        expect.any(Error),
      );
    });

    it('should use custom delimiter for CSV', async () => {
      const customCsvData = 'name;age;city\nJohn;30;NYC';
      mockSftpClient.get.mockResolvedValue(Buffer.from(customCsvData));
      (iconv.decode as jest.Mock).mockReturnValue(customCsvData);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.csv',
        file_type: FileType.CSV,
        delimiter: ';',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'John');
    });

    it('should normalize column headers', async () => {
      const csvWithSpaces =
        'First Name,Last Name,Email Address\nJohn,Doe,john@example.com';
      mockSftpClient.get.mockResolvedValue(Buffer.from(csvWithSpaces));
      (iconv.decode as jest.Mock).mockReturnValue(csvWithSpaces);

      const result = await service.transformFileToJSON(mockSftpClient, {
        path: '/data/test.csv',
        file_type: FileType.CSV,
        delimiter: ',',
      });

      expect(result[0]).toHaveProperty('first_name');
      expect(result[0]).toHaveProperty('last_name');
      expect(result[0]).toHaveProperty('email_address');
    });
  });
});
