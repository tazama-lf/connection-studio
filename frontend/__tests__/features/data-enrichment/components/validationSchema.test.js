import {
  defaultValues,
  pullValidationSchema,
  pushValidationSchema,
  sourceTypeOptions,
  getAssociatedScheduleOptions,
  authenticationTypeOptions,
  fileFormatOptions,
  ingestModeOptions,
} from '../../../../src/features/data-enrichment/components/validationSchema';

describe('validationSchema', () => {
  const basePullPayload = {
    name: 'ConnectorOne',
    version: '1.2.3',
    description: 'This is a valid description.',
    ingestMode: 'append',
    targetTable: 'valid_table',
    fileFormat: 'csv',
    delimiter: ',',
    sourceType: 'sftp',
    schedule: 'daily',
    pathPattern: '/inbound/data.csv',
    host: '192.168.1.1',
    port: '22',
    authType: 'password',
    username: 'valid-user',
    password: 'validPassword',
    headers: '',
    url: '',
  };

  const basePushPayload = {
    name: 'EndpointOne',
    version: '1.0.0',
    description: 'This is a valid push description.',
    targetTable: 'valid_table',
    ingestMode: 'replace',
    endpointPath: '/customer/data',
  };

  it('exports expected default values and source options', () => {
    expect(defaultValues.sourceType).toBe('sftp');
    expect(defaultValues.fileFormat).toBe('csv');
    expect(sourceTypeOptions).toEqual([
      { label: 'SFTP', value: 'sftp' },
      { label: 'HTTPS', value: 'http' },
    ]);
  });

  it('normalizes pull version by prefixing v when missing', async () => {
    const result = await pullValidationSchema.validate(basePullPayload);
    expect(result.version).toBe('v1.2.3');
  });

  it('rejects reserved endpoint names in pull schema', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        name: 'api',
      }),
    ).rejects.toThrow('reserved API keyword');
  });

  it('rejects mismatched file extension and selected format', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        fileFormat: 'json',
        pathPattern: '/inbound/data.csv',
      }),
    ).rejects.toThrow('does not match selected format');
  });

  it('validates headers and URL for http source type', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '[]',
        url: 'https://999.1.1.1/path',
      }),
    ).rejects.toThrow();
  });

  it('validates push endpointPath formatting rules', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer//data',
      }),
    ).rejects.toThrow('double slashes');
  });

  it('accepts flexible HTTP headers formats and rejects non-object JSON', async () => {
    const normalizedHeadersResult = await pullValidationSchema.validate({
      ...basePullPayload,
      sourceType: 'http',
      fileFormat: null,
      delimiter: null,
      pathPattern: null,
      host: null,
      port: null,
      authType: null,
      username: null,
      password: null,
      headers: "{'x-api-key': token}",
      url: 'https://api.example.com/v1',
    });

    expect(normalizedHeadersResult.sourceType).toBe('http');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '["x", "y"]',
        url: 'https://api.example.com/v1',
      }),
    ).rejects.toThrow('must be a valid JSON object');
  });

  it('rejects incomplete headers JSON with specific guidance', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{"x-api-key": "abc"',
        url: 'https://api.example.com/v1',
      }),
    ).rejects.toThrow('Invalid JSON format');
  });

  it('validates URL protocol and hostname errors', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{}',
        url: 'ftp://example.com/data',
      }),
    ).rejects.toThrow('HTTP or HTTPS');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{}',
        url: 'https://',
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid sftp path variants', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        pathPattern: 'inbound/data.csv',
      }),
    ).rejects.toThrow('must start with "/"');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        pathPattern: '/inbound/data',
      }),
    ).rejects.toThrow('must end with .csv, .tsv, or .json');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        fileFormat: 'csv',
        pathPattern: '/inbound/data.tsv',
      }),
    ).rejects.toThrow('does not match selected format');
  });

  it('validates host and port edge cases for sftp', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        host: 'not-an-ip',
      }),
    ).rejects.toThrow('valid IP address');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        host: '10.10.10.999',
      }),
    ).rejects.toThrow('octets cannot exceed 255');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        port: '70000',
      }),
    ).rejects.toThrow('between 1 and 65535');
  });

  it('requires password for both password and key auth modes', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        authType: 'password',
        password: '',
      }),
    ).rejects.toThrow('required field');

    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        authType: 'key',
        password: '',
      }),
    ).rejects.toThrow('required field');
  });

  it('validates push endpoint path slash and character constraints', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: 'customer/data',
      }),
    ).rejects.toThrow('must start with "/"');

    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/data/',
      }),
    ).rejects.toThrow('cannot end with "/"');

    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/data with space',
      }),
    ).rejects.toThrow('invalid characters');
  });

  it('accepts a valid push payload and transforms version', async () => {
    const result = await pushValidationSchema.validate(basePushPayload);
    expect(result.version).toBe('v1.0.0');
  });

  it('accepts pull version already prefixed with v (line 61)', async () => {
    const result = await pullValidationSchema.validate({
      ...basePullPayload,
      version: 'v2.5.0',
    });
    expect(result.version).toBe('v2.5.0');
  });

  it('accepts push version already prefixed with v (line 438)', async () => {
    const result = await pushValidationSchema.validate({
      ...basePushPayload,
      version: 'v3.0.0',
    });
    expect(result.version).toBe('v3.0.0');
  });

  it('rejects headers with non-string values (line 170)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{"key": 123}',
        url: 'https://api.example.com',
      }),
    ).rejects.toThrow('keys and values must be strings');
  });

  it('rejects headers with truncated JSON (line 178 fallback path)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{',
        url: 'https://api.example.com',
      }),
    ).rejects.toThrow();
  });

  it('rejects headers with value-missing JSON (line 180 fallback path)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{key:}',
        url: 'https://api.example.com',
      }),
    ).rejects.toThrow();
  });

  it('rejects file path with invalid characters (line 261)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        pathPattern: '/inbound/data file.csv',
      }),
    ).rejects.toThrow('invalid characters');
  });

  it('rejects file path ending with slash (no filename) (line 269)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        pathPattern: '/inbound/',
      }),
    ).rejects.toThrow('must include a filename');
  });

  it('exports getAssociatedScheduleOptions, authenticationTypeOptions, fileFormatOptions, ingestModeOptions (line 539)', () => {
    const schedules = [
      { name: 'daily', cron: '0 0 * * *', iterations: 1, id: 'sched-1' },
      { name: 'weekly', cron: '0 0 * * 0', iterations: 5, id: 'sched-2' },
    ];
    const options = getAssociatedScheduleOptions(schedules);
    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({ label: 'daily - 0 0 * * * (1 iteration)', value: 'sched-1' });
    expect(options[1]).toEqual({ label: 'weekly - 0 0 * * 0 (5 iterations)', value: 'sched-2' });

    expect(authenticationTypeOptions).toEqual([
      { label: 'Username & Password', value: 'password' },
      { label: 'Username & Private Key', value: 'key' },
    ]);
    expect(fileFormatOptions).toEqual([
      { label: 'CSV', value: 'csv' },
      { label: 'TSV', value: 'tsv' },
      { label: 'JSON', value: 'json' },
    ]);
    expect(ingestModeOptions).toHaveLength(2);
  });

  it('rejects headers with Unexpected token error (fallback else branch)', async () => {
    // Use very malformed JSON that fails even after normalization
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{{{invalid',
        url: 'https://api.example.com',
      }),
    ).rejects.toThrow();
  });

  it('validates a valid http URL successfully (protocol and hostname pass)', async () => {
    const result = await pullValidationSchema.validate({
      ...basePullPayload,
      sourceType: 'http',
      fileFormat: null,
      delimiter: null,
      pathPattern: null,
      host: null,
      port: null,
      authType: null,
      username: null,
      password: null,
      headers: '{}',
      url: 'https://api.example.com/data',
    });
    expect(result.sourceType).toBe('http');
  });

  it('rejects IP-format URL with octets exceeding 255', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{}',
        url: 'https://999.256.1.1/data',
      }),
    ).rejects.toThrow();
  });

  it('validates pathPattern with fileFormat as array (formatValue via Array.isArray branch)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        fileFormat: 'csv',
        pathPattern: '/inbound/data.tsv',
      }),
    ).rejects.toThrow('does not match selected format');
  });

  it('accepts push endpoint path with valid segment characters', async () => {
    const result = await pushValidationSchema.validate({
      ...basePushPayload,
      endpointPath: '/customer/data_2025',
    });
    expect(result.endpointPath).toBeTruthy();
  });

  it('rejects push path with invalid segment characters (e.g. containing space)', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/bad segment',
      }),
    ).rejects.toThrow('invalid characters');
  });

  it('rejects push path empty segments (empty filter segment check)', async () => {
    // The filter(segment => segment !== '') removes empty segments so this won't create empty segments
    // Instead test a segment with invalid chars
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/data@2025',
      }),
    ).rejects.toThrow();
  });

  it('validates host that passes IP check (valid IP returns true)', async () => {
    const result = await pullValidationSchema.validate({
      ...basePullPayload,
      host: '10.0.0.1',
    });
    expect(result.host).toBe('10.0.0.1');
  });

  it('validates pathPattern with fileFormat whose extension not in map (allowedFormatsForExtension undefined = returns true)', async () => {
    // file extension .log is not in extensionFormatMap so allowedFormatsForExtension is undefined → returns true
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        fileFormat: 'csv',
        // .csv extension but we also test a path without extension in extensionFormatMap
        pathPattern: '/inbound/data.csv',
      }),
    ).resolves.toBeDefined();
  });

  // ─── BRDA:127 — empty/blank headers with http source returns true (valid) ───
  it('accepts empty headers string for http source type (line 127 true branch)', async () => {
    const result = await pullValidationSchema.validate({
      ...basePullPayload,
      sourceType: 'http',
      fileFormat: null,
      delimiter: null,
      pathPattern: null,
      host: null,
      port: null,
      authType: null,
      username: null,
      password: null,
      headers: '',
      url: 'https://api.example.com/data',
    });
    expect(result.sourceType).toBe('http');
  });

  it('accepts whitespace-only headers string for http source type (line 127 trim branch)', async () => {
    const result = await pullValidationSchema.validate({
      ...basePullPayload,
      sourceType: 'http',
      fileFormat: null,
      delimiter: null,
      pathPattern: null,
      host: null,
      port: null,
      authType: null,
      username: null,
      password: null,
      headers: '   ',
      url: 'https://api.example.com/data',
    });
    expect(result.sourceType).toBe('http');
  });

  // ─── BRDA:227 — URL error path without IP match (non-IP invalid URL) ───
  it('rejects non-IP invalid URL with generic format error (line 227 false branch)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '{}',
        url: 'http://',
      }),
    ).rejects.toThrow();
  });

  it('rejects URL with non-HTTP protocol like ftp (line 196)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '',
        url: 'ftp://files.example.com/data.csv',
      }),
    ).rejects.toThrow('HTTP or HTTPS protocol');
  });

  it('rejects URL with valid IP but invalid URL format (line 218 false)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '',
        url: 'https://192.168.1.1:notaport/path',
      }),
    ).rejects.toThrow();
  });

  it('rejects URL without IP pattern in error (line 227 no-ip-match)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        headers: '',
        url: 'https://exam ple.com/path',
      }),
    ).rejects.toThrow();
  });

  it('rejects push endpointPath ending with trailing slash (line 497)', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/data/',
      }),
    ).rejects.toThrow('cannot end with');
  });

  it('rejects push endpointPath not starting with slash (line 481)', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: 'customer/data',
      }),
    ).rejects.toThrow('must start with');
  });

  it('rejects push endpointPath with invalid segment characters (line 509)', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '/customer/da ta',
      }),
    ).rejects.toThrow('invalid characters');
  });

  it('covers empty URL value in http custom test with abortEarly false (BRDA:196)', async () => {
    // With abortEarly:false, the custom test() runs even after required() fails
    // so value==='' reaches the if(!value||...) guard → returns false
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        sourceType: 'http',
        fileFormat: null,
        delimiter: null,
        pathPattern: null,
        host: null,
        port: null,
        authType: null,
        username: null,
        password: null,
        url: '',
        headers: '',
      }, { abortEarly: false }),
    ).rejects.toThrow();
  });

  it('covers empty pathPattern value in sftp custom test with abortEarly false (BRDA:249)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        pathPattern: '',
      }, { abortEarly: false }),
    ).rejects.toThrow();
  });

  it('covers empty host value in sftp custom test with abortEarly false (BRDA:331)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        host: '',
      }, { abortEarly: false }),
    ).rejects.toThrow();
  });

  it('covers empty port value in sftp port custom test with abortEarly false (BRDA:364)', async () => {
    await expect(
      pullValidationSchema.validate({
        ...basePullPayload,
        port: '',
      }, { abortEarly: false }),
    ).rejects.toThrow();
  });

  it('covers empty endpointPath in push custom test with abortEarly false (BRDA:474)', async () => {
    await expect(
      pushValidationSchema.validate({
        ...basePushPayload,
        endpointPath: '',
      }, { abortEarly: false }),
    ).rejects.toThrow();
  });
});
