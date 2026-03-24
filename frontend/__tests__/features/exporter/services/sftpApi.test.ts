import { SftpApiService, SftpError, sftpApi } from '../../../../src/features/exporter/services/sftpApi';

const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('SftpError', () => {
  it('should create an SftpError with the correct properties', () => {
    const error = new SftpError('test message', 'CORRUPTED_FILE', { extra: 'data' });
    expect(error.name).toBe('SftpError');
    expect(error.message).toBe('test message');
    expect(error.errorType).toBe('CORRUPTED_FILE');
    expect(error.originalError).toEqual({ extra: 'data' });
    expect(error).toBeInstanceOf(Error);
  });

  it('should create SftpError without originalError', () => {
    const error = new SftpError('msg', 'NOT_FOUND');
    expect(error.errorType).toBe('NOT_FOUND');
    expect(error.originalError).toBeUndefined();
  });

  it('should create SftpError with UNAUTHORIZED type', () => {
    const error = new SftpError('auth failed', 'UNAUTHORIZED');
    expect(error.errorType).toBe('UNAUTHORIZED');
  });

  it('should create SftpError with GENERAL type', () => {
    const error = new SftpError('generic', 'GENERAL');
    expect(error.errorType).toBe('GENERAL');
  });
});

describe('SftpApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('sftp-token');
  });

  describe('getAllFiles', () => {
    it('should fetch all files for a format successfully', async () => {
      const mockFiles = [
        { name: 'file1_cron_abc.json', type: '-', size: 100 },
        { name: 'file2_cron_def.json', type: '-', size: 200 },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFiles,
      });

      const result = await sftpApi.getAllFiles('cron');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sftp/all?format=cron'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockFiles);
    });

    it('should throw SftpError with UNAUTHORIZED on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toThrow(SftpError);
      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'UNAUTHORIZED',
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('should throw SftpError with CORRUPTED_FILE when file integrity message received', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'File or its integrity file not found' }),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'CORRUPTED_FILE',
      });
    });

    it('should throw SftpError with NOT_FOUND on 404 without corruption message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Resource not found' }),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'NOT_FOUND',
      });
    });

    it('should throw SftpError with GENERAL for other errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'GENERAL',
        message: 'Internal Server Error',
      });
    });

    it('should throw SftpError with GENERAL and generic message when no error message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'GENERAL',
        message: 'HTTP error! status: 503',
      });
    });
  });

  describe('readFile', () => {
    it('should read a file by name with .json extension stripped', async () => {
      const mockContent = { id: '123', name: 'test', status: 'active', created_at: '2024-01-01', updated_at: '2024-01-01', tenant_id: 't1' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockContent,
      });

      const result = await sftpApi.readFile('myfile.json');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sftp/read?name=myfile'),
        expect.anything(),
      );
      expect(result).toEqual(mockContent);
    });

    it('should read a file by name without .json extension', async () => {
      const mockContent = { id: '456', name: 'other', status: 'active', created_at: '2024-01-01', updated_at: '2024-01-01', tenant_id: 't2' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockContent,
      });

      await sftpApi.readFile('myfile');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sftp/read?name=myfile'),
        expect.anything(),
      );
    });
  });

  describe('extractIdFromFilename (static)', () => {
    it('should extract UUID from filename', () => {
      const filename = 'export_cron_550e8400-e29b-41d4-a716-446655440000.json';
      const id = SftpApiService.extractIdFromFilename(filename);
      expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null if no UUID pattern found', () => {
      const id = SftpApiService.extractIdFromFilename('no-uuid-here.txt');
      expect(id).toBeNull();
    });
  });

  describe('extractFormatFromFilename (static)', () => {
    it('should return "cron" for _cron_ filenames', () => {
      expect(SftpApiService.extractFormatFromFilename('file_cron_abc.json')).toBe('cron');
    });

    it('should return "de" for _de_ filenames', () => {
      expect(SftpApiService.extractFormatFromFilename('file_de_abc.json')).toBe('de');
    });

    it('should return "dems" for _dems_ filenames', () => {
      expect(SftpApiService.extractFormatFromFilename('file_dems_abc.json')).toBe('dems');
    });

    it('should return null if no format pattern found', () => {
      expect(SftpApiService.extractFormatFromFilename('random_file.json')).toBeNull();
    });
  });

  describe('publishItem', () => {
    it('should call scheduler status update for cron format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await sftpApi.publishItem('cron-id-123', 'cron');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/scheduler/update/status/cron-id-123'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('should call config workflow deploy for dems format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await sftpApi.publishItem('123', 'dems');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/123/workflow?action=deploy'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should call job status update for de format with type', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await sftpApi.publishItem('job-id-456', 'de', 'PULL');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/job/update/status/job-id-456'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('should throw error for de format without type', async () => {
      await expect(sftpApi.publishItem('job-id-456', 'de')).rejects.toThrow(
        'Job type (PULL/PUSH) is required for data enrichment jobs',
      );
    });

    it('should throw on 401 in apiRequest', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      await expect(sftpApi.publishItem('id', 'cron')).rejects.toThrow(
        'Authentication failed',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('should throw on non-ok response in apiRequest', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(sftpApi.publishItem('id', 'cron')).rejects.toThrow('Server error');
    });

    it('should handle PUSH type for de format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await sftpApi.publishItem('push-id', 'de', 'PUSH');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=push'),
        expect.anything(),
      );
    });
  });

  describe('constructor', () => {
    it('should create an instance of SftpApiService', () => {
      const service = new SftpApiService();
      expect(service).toBeInstanceOf(SftpApiService);
    });
  });

  describe('json parse failure branches', () => {
    it('apiRequest .catch(() => ({})) when response.json() rejects on error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('invalid json')),
      });

      await expect(sftpApi.publishItem('id', 'cron')).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });

    it('handleResponse .catch(() => ({})) when response.json() rejects on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('invalid json')),
      });

      await expect(sftpApi.getAllFiles('cron')).rejects.toMatchObject({
        errorType: 'GENERAL',
        message: 'HTTP error! status: 500',
      });
    });

    it('apiRequest merges caller headers into auth headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await (SftpApiService as any).apiRequest('https://example.test/files', {
        method: 'POST',
        headers: {
          'X-Test': 'abc',
          Accept: 'text/plain',
        },
      });

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const headers = options.headers as Headers;

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Accept')).toBe('text/plain');
      expect(headers.get('Authorization')).toBe('Bearer sftp-token');
      expect(headers.get('X-Test')).toBe('abc');
    });
  });

  it('getAuthHeaders omits Authorization when no token in localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    await sftpApi.getAllFiles('cron');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('apiRequest default options parameter branch (BRDA:71,1,0) — called without options arg', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    // Call apiRequest without the options argument — triggers the default `= {}` branch
    await (SftpApiService as any).apiRequest('https://example.test/default-opts');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/default-opts',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });
});
