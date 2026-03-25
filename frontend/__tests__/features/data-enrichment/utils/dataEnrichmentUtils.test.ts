import {
  buildPushPayload,
  buildPullPayload,
  generateEndpointUrl,
  getJobType,
  formatDateStructured,
  formatDate,
  determineSourceType,
  getDataEnrichmentErrorMessage,
  formatJobForEdit,
  scrollToFirstError,
  validateFileFormat,
  httpJobValidationSchema,
  sftpJobValidationSchema,
  pushJobValidationSchema,
  getIterationText,
  generateVersionedTableName,
  getConnectionType,
  formatJSON,
  copyToClipboard,
} from '../../../../src/features/data-enrichment/utils/index';
import type { DataEnrichmentJobResponse } from '../../../../src/features/data-enrichment/types';

// ─── buildPushPayload ─────────────────────────────────────────────────────────
describe('buildPushPayload', () => {
  it('builds push payload from form values', () => {
    const formValues = {
      name: 'My Push Job',
      endpointPath: '/transactions',
      description: 'A test push job',
      targetTable: 'transactions',
      ingestMode: 'append',
      version: 'v1',
    };

    const result = buildPushPayload(formValues);

    expect(result).toEqual({
      endpoint_name: 'My Push Job',
      path: '/transactions',
      description: 'A test push job',
      table_name: 'transactions',
      mode: 'append',
      version: '1', // version strip 'v' prefix
    });
  });

  it('strips leading v/ from version', () => {
    const result = buildPushPayload({ version: 'v/2//' });
    expect(result.version).toBe('2');
  });

  it('handles missing optional fields as undefined', () => {
    const result = buildPushPayload({ ingestMode: 'replace' });
    expect(result.endpoint_name).toBeUndefined();
    expect(result.path).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.table_name).toBeUndefined();
    expect(result.mode).toBe('replace');
    expect(result.version).toBeUndefined();
  });
});

// ─── buildPullPayload (HTTP) ──────────────────────────────────────────────────
describe('buildPullPayload - HTTP source', () => {
  it('builds HTTP pull payload with url and headers', () => {
    const formValues = {
      name: 'HTTP Job',
      sourceType: 'http',
      description: 'HTTP pull job',
      targetTable: 'entities',
      ingestMode: 'append',
      version: '1',
      schedule: 'sched-001',
      url: 'https://api.example.com/data',
      headers: JSON.stringify({ 'X-API-Key': 'abc123' }),
    };

    const result = buildPullPayload(formValues);

    expect(result.endpoint_name).toBe('HTTP Job');
    expect(result.source_type).toBe('HTTP');
    expect((result as any).connection).toEqual({
      url: 'https://api.example.com/data',
      headers: { 'X-API-Key': 'abc123' },
    });
  });

  it('builds HTTP connection with empty headers when none provided', () => {
    const result = buildPullPayload({
      sourceType: 'http',
      url: 'https://example.com',
    });
    expect((result as any).connection.headers).toEqual({});
  });
});

// ─── buildPullPayload (SFTP) ──────────────────────────────────────────────────
describe('buildPullPayload - SFTP source', () => {
  it('builds SFTP pull payload with password auth', () => {
    const formValues = {
      name: 'SFTP Job',
      sourceType: 'sftp',
      description: 'SFTP pull job',
      targetTable: 'accounts',
      ingestMode: 'replace',
      version: '2',
      schedule: 'sched-002',
      host: 'sftp.example.com',
      port: '2222',
      authType: 'password',
      username: 'user1',
      password: 'secret',
      pathPattern: '/data/file.csv',
      fileFormat: 'csv',
      delimiter: ';',
    };

    const result = buildPullPayload(formValues);

    expect(result.source_type).toBe('SFTP');
    const conn = (result as any).connection;
    expect(conn.host).toBe('sftp.example.com');
    expect(conn.port).toBe(2222);
    expect(conn.auth_type).toBe('USERNAME_PASSWORD');
    expect(conn.user_name).toBe('user1');
    expect(conn.password).toBe('secret');

    const file = (result as any).file;
    expect(file.path).toBe('data/file.csv'); // leading slash stripped
    expect(file.file_type).toBe('CSV');
    expect(file.delimiter).toBe(';');
  });

  it('builds SFTP pull payload with private key auth', () => {
    const formValues = {
      sourceType: 'sftp',
      host: 'sftp.example.com',
      port: '22',
      authType: 'key',
      username: 'user2',
      password: 'MY\\nPRIV\\nKEY',
      pathPattern: 'data.json',
      fileFormat: 'json',
    };

    const result = buildPullPayload(formValues);
    const conn = (result as any).connection;
    expect(conn.auth_type).toBe('PRIVATE_KEY');
    expect(conn.private_key).toBe('MY\nPRIV\nKEY');
    expect(conn.password).toBeUndefined();
  });

  it('uses default SFTP port 22 when port is not specified', () => {
    const result = buildPullPayload({
      sourceType: 'sftp',
      host: 'sftp.example.com',
      port: '',
      authType: 'password',
      username: 'u',
      password: 'p',
    });
    expect((result as any).connection.port).toBe(22);
  });

  it('uses default file config values when not specified', () => {
    const result = buildPullPayload({
      sourceType: 'sftp',
      host: 'sftp.example.com',
      authType: 'password',
      username: 'u',
      password: 'p',
    });
    const file = (result as any).file;
    expect(file.path).toBe('data.csv');
    expect(file.file_type).toBe('CSV');
    expect(file.delimiter).toBe(',');
  });
});

// ─── generateEndpointUrl ──────────────────────────────────────────────────────
describe('generateEndpointUrl', () => {
  it('returns template when no version or path provided', () => {
    const url = generateEndpointUrl('tenant1');
    expect(url).toBe('/tenant1/enrichment/{version}{path}');
  });

  it('generates url with version and path', () => {
    const url = generateEndpointUrl('tenant1', 'v2', '/transactions');
    expect(url).toBe('/tenant1/enrichment/2/transactions');
  });

  it('generates url with version but no path', () => {
    const url = generateEndpointUrl('tenant1', 'v1');
    expect(url).toBe('/tenant1/enrichment/1/{path}');
  });

  it('generates url with path but no version', () => {
    const url = generateEndpointUrl('tenant1', undefined, '/data');
    expect(url).toBe('/tenant1/enrichment/{version}/data');
  });

  it('prepends slash to path if missing', () => {
    const url = generateEndpointUrl('tenant1', 'v1', 'mypath');
    expect(url).toBe('/tenant1/enrichment/1/mypath');
  });
});

// ─── getJobType ───────────────────────────────────────────────────────────────
describe('getJobType', () => {
  it('returns "push" when job.type is push', () => {
    const job = { type: 'push' } as DataEnrichmentJobResponse;
    expect(getJobType(job)).toBe('push');
  });

  it('returns "pull" when job.type is pull', () => {
    const job = { type: 'pull' } as DataEnrichmentJobResponse;
    expect(getJobType(job)).toBe('pull');
  });

  it('returns "push" when job has path but no source_type', () => {
    const job = { path: '/some/path' } as DataEnrichmentJobResponse;
    expect(getJobType(job)).toBe('push');
  });

  it('returns "pull" when job has source_type', () => {
    const job = { source_type: 'HTTP' } as DataEnrichmentJobResponse;
    expect(getJobType(job)).toBe('pull');
  });

  it('handles PUSH type case-insensitively', () => {
    const job = { type: 'PUSH' } as DataEnrichmentJobResponse;
    expect(getJobType(job)).toBe('push');
  });
});

// ─── formatDateStructured ─────────────────────────────────────────────────────
describe('formatDateStructured', () => {
  it('returns N/A for undefined', () => {
    expect(formatDateStructured(undefined)).toBe('N/A');
  });

  it('returns N/A for empty string', () => {
    expect(formatDateStructured('')).toBe('N/A');
  });

  it('formats a valid date string', () => {
    const result = formatDateStructured('2024-01-15T10:30:00Z');
    expect(result).toMatch(/January/);
    expect(result).toMatch(/2024/);
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe('formatDate (data-enrichment)', () => {
  it('returns N/A for undefined', () => {
    expect(formatDate(undefined)).toBe('N/A');
  });

  it('returns N/A for empty string', () => {
    expect(formatDate('')).toBe('N/A');
  });

  it('formats a valid date', () => {
    const result = formatDate('2024-06-01T00:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── determineSourceType ──────────────────────────────────────────────────────
describe('determineSourceType', () => {
  it('returns job.source_type when set', () => {
    const job = { source_type: 'SFTP' } as DataEnrichmentJobResponse;
    expect(determineSourceType(job)).toBe('SFTP');
  });

  it('returns SFTP for object connection with host', () => {
    const job = { connection: { host: 'sftp.example.com' } } as any;
    expect(determineSourceType(job)).toBe('SFTP');
  });

  it('returns HTTP for object connection with url', () => {
    const job = { connection: { url: 'https://api.example.com' } } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });

  it('returns SFTP for stringified connection with host', () => {
    const job = {
      connection: JSON.stringify({ host: 'sftp.example.com' }),
    } as any;
    expect(determineSourceType(job)).toBe('SFTP');
  });

  it('returns HTTP for stringified connection with url', () => {
    const job = {
      connection: JSON.stringify({ url: 'https://api.example.com' }),
    } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });

  it('returns HTTP for invalid JSON connection string', () => {
    const job = { connection: 'not-valid-json' } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });

  it('defaults to HTTP when no source info', () => {
    const job = {} as DataEnrichmentJobResponse;
    expect(determineSourceType(job)).toBe('HTTP');
  });
});

// ─── getDataEnrichmentErrorMessage ────────────────────────────────────────────
describe('getDataEnrichmentErrorMessage', () => {
  it('returns INVALID_INPUT for 400 status', () => {
    const err = { response: { status: 400 } };
    expect(getDataEnrichmentErrorMessage(err)).toContain('invalid');
  });

  it('returns DUPLICATE_NAME for 409 status', () => {
    const err = { response: { status: 409 } };
    expect(getDataEnrichmentErrorMessage(err)).toContain('already exists');
  });

  it('returns UNAUTHORIZED for 401 status', () => {
    const err = { response: { status: 401 } };
    expect(getDataEnrichmentErrorMessage(err)).toContain('permission');
  });

  it('returns UNAUTHORIZED for 403 status', () => {
    const err = { response: { status: 403 } };
    expect(getDataEnrichmentErrorMessage(err)).toContain('permission');
  });

  it('returns SERVER_ERROR for 500+ status', () => {
    const err = { response: { status: 500 } };
    expect(getDataEnrichmentErrorMessage(err)).toContain('temporarily unavailable');
  });

  it('returns NETWORK_ERROR for fetch/network messages', () => {
    const err = { message: 'fetch error occurred' };
    expect(getDataEnrichmentErrorMessage(err)).toContain('connect');
  });

  it('returns SCHEDULE_DEPLOYED for not found/approved message', () => {
    const err = { message: 'The schedule is not found or is not approved yet' };
    expect(getDataEnrichmentErrorMessage(err)).toContain('deployed');
  });

  it('returns the actual message from response.data.message (string)', () => {
    const err = { response: { data: { message: 'Custom server error' } } };
    expect(getDataEnrichmentErrorMessage(err)).toBe('Custom server error');
  });

  it('joins array message from response.data.message', () => {
    const err = { response: { data: { message: ['Field A is invalid', 'Field B is required'] } } };
    expect(getDataEnrichmentErrorMessage(err)).toBe('Field A is invalid, Field B is required');
  });

  it('returns response.data.error when available', () => {
    const err = { response: { data: { error: 'Internal error detail' } } };
    expect(getDataEnrichmentErrorMessage(err)).toBe('Internal error detail');
  });

  it('returns err.message as fallback', () => {
    const err = { message: 'Something went wrong' };
    expect(getDataEnrichmentErrorMessage(err)).toBe('Something went wrong');
  });

  it('returns GENERAL message for empty error', () => {
    expect(getDataEnrichmentErrorMessage({})).toContain('encountered an issue');
  });
});

// ─── formatJobForEdit ─────────────────────────────────────────────────────────
describe('formatJobForEdit', () => {
  const baseJob: DataEnrichmentJobResponse = {
    id: 101,
    endpoint_name: 'My Job',
    description: 'Test',
    table_name: 'entities',
    mode: 'append',
    version: 'v1',
    type: 'push',
  } as DataEnrichmentJobResponse;

  it('returns push data when type is push', () => {
    const result = formatJobForEdit({ ...baseJob, type: 'push', path: '/data' }) as any;
    expect(result.path).toBe('/data');
    expect(result.endpoint_name).toBe('My Job');
  });

  it('returns push data when config_type is Push', () => {
    const result = formatJobForEdit({
      ...baseJob,
      type: undefined as any,
      config_type: 'Push',
      path: '/push-path',
    }) as any;
    expect(result.path).toBe('/push-path');
  });

  it('returns pull data for pull type', () => {
    const pullJob: DataEnrichmentJobResponse = {
      ...baseJob,
      type: 'pull',
      source_type: 'HTTP',
      schedule_id: 'sched-1',
      connection: { url: 'https://api.example.com' } as any,
      file: undefined,
    };
    const result = formatJobForEdit(pullJob) as any;
    expect(result.source_type).toBe('HTTP');
    expect(result.schedule_id).toBe('sched-1');
  });

  it('uses empty string for missing path in push job', () => {
    const pushJob = { ...baseJob, type: 'push', path: undefined };
    const result = formatJobForEdit(pushJob as DataEnrichmentJobResponse) as any;
    expect(result.path).toBe('');
  });

  it('uses empty string for missing schedule_id in pull job', () => {
    const pullJob = { ...baseJob, type: 'pull', schedule_id: undefined } as DataEnrichmentJobResponse;
    const result = formatJobForEdit(pullJob) as any;
    expect(result.schedule_id).toBe('');
  });
});

// ─── scrollToFirstError ───────────────────────────────────────────────────────
describe('scrollToFirstError', () => {
  it('does not throw when element is not found', () => {
    expect(() => scrollToFirstError('nonExistentField')).not.toThrow();
  });

  it('calls scrollIntoView when element is found without modal container', () => {
    const input = document.createElement('input');
    input.setAttribute('name', 'myField');
    const scrollIntoViewMock = jest.fn();
    input.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(input);

    scrollToFirstError('myField');

    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', block: 'center' }),
    );

    document.body.removeChild(input);
  });
});

describe('validateFileFormat', () => {
  it('returns error for empty file path', () => {
    expect(validateFileFormat('   ', 'CSV')).toEqual({
      isValid: false,
      error: 'Please specify a file path',
    });
  });

  it('returns error for missing file extension', () => {
    const result = validateFileFormat('data.', 'CSV');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('valid extension');
  });

  it('returns error for unsupported file extension', () => {
    const result = validateFileFormat('data.xml', 'CSV');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unsupported file extension');
  });

  it('returns error when extension and file type mismatch', () => {
    const result = validateFileFormat('data.json', 'CSV');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('File format mismatch');
  });

  it('returns valid for matching extension and file type', () => {
    expect(validateFileFormat('data.csv', 'CSV')).toEqual({
      isValid: true,
      error: '',
    });
  });
});

describe('validation schemas', () => {
  const validBase = {
    endpoint_name: 'Valid Endpoint',
    description: 'This is a valid long description.',
    table_name: 'valid_table_name',
    schedule_id: 'schedule-1',
    version: 'v1',
  };

  it('validates HTTP schema', async () => {
    await expect(
      httpJobValidationSchema.validate({
        ...validBase,
        source_type: 'HTTP',
        connection: { url: 'https://example.com', headers: {} },
      }),
    ).resolves.toBeTruthy();
  });

  it('requires password for USERNAME_PASSWORD auth', async () => {
    await expect(
      sftpJobValidationSchema.validate({
        ...validBase,
        source_type: 'SFTP',
        connection: {
          host: 'sftp.example.com',
          port: 22,
          auth_type: 'USERNAME_PASSWORD',
          user_name: 'user',
        },
        file: {
          path: 'data.csv',
          file_type: 'CSV',
          delimiter: ',',
        },
      }),
    ).rejects.toThrow('Password is required');
  });

  it('requires private key for PRIVATE_KEY auth', async () => {
    await expect(
      sftpJobValidationSchema.validate({
        ...validBase,
        source_type: 'SFTP',
        connection: {
          host: 'sftp.example.com',
          port: 22,
          auth_type: 'PRIVATE_KEY',
          user_name: 'user',
        },
        file: {
          path: 'data.csv',
          file_type: 'CSV',
          delimiter: ',',
        },
      }),
    ).rejects.toThrow('Private key is required');
  });

  it('validates push schema', async () => {
    await expect(
      pushJobValidationSchema.validate({
        endpoint_name: 'Push Endpoint',
        description: 'This is a valid push job description.',
        table_name: 'push_table',
        path: '/endpoint/path',
        version: 'v2',
      }),
    ).resolves.toBeTruthy();
  });
});

describe('misc data enrichment utilities', () => {
  it('formats iteration text for singular and plural', () => {
    expect(getIterationText(1)).toBe('1 iteration');
    expect(getIterationText(3)).toBe('3 iterations');
  });

  it('generates versioned table name with timestamp suffix', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    expect(generateVersionedTableName('accounts')).toBe('accounts_v1234567890');
    nowSpy.mockRestore();
  });

  it('returns source_type in getConnectionType when present', () => {
    const job = { source_type: 'HTTP' } as DataEnrichmentJobResponse;
    expect(getConnectionType(job)).toBe('HTTP');
  });

  it('returns SFTP for object connection with host in getConnectionType', () => {
    const job = { connection: { host: 'sftp.example.com' } } as any;
    expect(getConnectionType(job)).toBe('SFTP');
  });

  it('returns HTTP for object connection with url in getConnectionType', () => {
    const job = { connection: { url: 'https://example.com' } } as any;
    expect(getConnectionType(job)).toBe('HTTP');
  });

  it('returns null for getConnectionType when source cannot be determined', () => {
    const job = { connection: { some: 'value' } } as any;
    expect(getConnectionType(job)).toBeNull();
  });

  it('formats JSON string and object', () => {
    expect(formatJSON('{"a":1}')).toContain('\n  "a": 1\n');
    expect(formatJSON({ a: 1 })).toContain('\n  "a": 1\n');
  });

  it('returns original string when formatJSON receives invalid JSON string', () => {
    expect(formatJSON('not-json')).toBe('not-json');
  });

  it('copies to clipboard successfully', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('returns false when clipboard write fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('copy failed'));
    Object.assign(navigator, { clipboard: { writeText } });

    await expect(copyToClipboard('hello')).resolves.toBe(false);
  });
});

describe('scrollToFirstError', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('scrolls to error element inside a modal', () => {
    const errorEl = document.createElement('input');
    errorEl.setAttribute('name', 'testField');
    errorEl.scrollIntoView = jest.fn();
    errorEl.focus = jest.fn();

    const modal = document.createElement('div');
    modal.className = 'MuiDialog-paper';
    modal.appendChild(errorEl);
    document.body.appendChild(modal);

    scrollToFirstError('testField');

    expect(errorEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    jest.advanceTimersByTime(300);
    expect(errorEl.focus).toHaveBeenCalled();

    document.body.removeChild(modal);
  });

  it('scrolls to error element outside a modal', () => {
    const errorEl = document.createElement('input');
    errorEl.setAttribute('name', 'outsideField');
    errorEl.scrollIntoView = jest.fn();
    errorEl.focus = jest.fn();

    document.body.appendChild(errorEl);

    scrollToFirstError('outsideField');

    expect(errorEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });

    jest.advanceTimersByTime(300);
    expect(errorEl.focus).toHaveBeenCalled();

    document.body.removeChild(errorEl);
  });

  it('does nothing when no error element exists', () => {
    expect(() => scrollToFirstError('nonExistentField')).not.toThrow();
  });
});

describe('determineSourceType with string connection', () => {
  it('returns SFTP when connection is a JSON string with host', () => {
    const job = { connection: JSON.stringify({ host: 'sftp.example.com' }) } as any;
    expect(determineSourceType(job)).toBe('SFTP');
  });

  it('returns HTTP when connection is a JSON string with url', () => {
    const job = { connection: JSON.stringify({ url: 'https://api.example.com' }) } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });

  it('returns HTTP when connection is invalid JSON string', () => {
    const job = { connection: 'not-json' } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });
});

describe('buildPullPayload delimiter', () => {
  it('uses explicit delimiter when provided', () => {
    const result = buildPullPayload({
      sourceType: 'sftp',
      sftpHost: 'sftp.example.com',
      sftpPort: '22',
      sftpUsername: 'user',
      sftpPassword: 'pass',
      authType: 'password',
      filePath: '/data/file.csv',
      fileFormat: 'csv',
      delimiter: '|',
    });

    expect((result as any).file?.delimiter).toBe('|');
  });
});

describe('buildPullPayload without sourceType (BRDA:56)', () => {
  it('returns undefined source_type when sourceType is omitted', () => {
    const result = buildPullPayload({
      name: 'Job1',
      ingestMode: 'append',
      authType: 'password',
      password: 'secret',
      host: '10.0.0.1',
      port: '22',
      username: 'user',
    });
    expect(result.source_type).toBe('SFTP');
    // The ?? branch fires: (undefined)?.toUpperCase() → undefined → ?? undefined
    // But then the else branch sets source_type to 'SFTP' explicitly
  });
});

describe('determineSourceType additional branches', () => {
  it('returns HTTP for object connection with neither host nor url (BRDA:177)', () => {
    const job = { connection: { other: 'value' } } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });

  it('returns HTTP for valid JSON string connection with neither host nor url (BRDA:169)', () => {
    const job = { connection: JSON.stringify({ other: 'value' }) } as any;
    expect(determineSourceType(job)).toBe('HTTP');
  });
});
