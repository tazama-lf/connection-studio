import * as yup from 'yup';

export const pullValidationSchema = yup.object({
  name: yup
    .string()
    .required('Connector name is required')
    .min(3, 'Connector name must be at least 3 characters')
    .max(50, 'Connector name cannot exceed 50 characters')
    .matches(
      /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
      'Must start with a letter and end with letter/number (only a-z, 0-9, _, - are allowed)',
    )
    .matches(
      /^(?!.*[-_]{2,})/,
      'Endpoint name cannot contain consecutive underscores or hyphens',
    )
    .test(
      'no-reserved-names',
      'Endpoint name cannot be a reserved API keyword',
      function (value) {
        const reservedNames = [
          'api',
          'admin',
          'root',
          'system',
          'config',
          'health',
          'status',
          'ping',
          'test',
          'debug',
          'log',
          'logs',
          'metrics',
          'swagger',
          'docs',
          'documentation',
          'auth',
          'login',
          'logout',
          'register',
          'user',
          'users',
          'account',
          'accounts',
        ];
        return !reservedNames.includes(value?.toLowerCase());
      },
    )
    .trim(),

  version: yup
    .string()
    .required('Version is required')
    .matches(
      /^v?\d+\.\d+\.\d+$/,
      'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)',
    )
    .transform((value) => {
      if (value && !value.startsWith('v')) {
        return `v${value}`;
      }
      return value;
    }),

  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description cannot exceed 200 characters')
    .trim(),

  ingestMode: yup
    .string()
    .required('Ingest mode is required')
    .oneOf(['append', 'replace'], 'Invalid ingest mode'),

  targetTable: yup
    .string()
    .required('Table Name is required')
    .min(1, 'Table name must be at least 1 character')
    .max(49, 'Table name cannot exceed 50 characters')
    .matches(
      /^[a-z][a-z0-9_]*$/,
      'Table name must start with a letter and contain only lowercase letters, numbers, and underscores',
    )
    .test(
      'no-reserved-words',
      'Table name cannot be a reserved SQL keyword',
      function (value) {
        const reservedWords = [
          'user',
          'table',
          'select',
          'insert',
          'update',
          'delete',
          'create',
          'drop',
          'alter',
          'index',
          'view',
          'schema',
          'database',
          'order',
          'group',
          'where',
          'having',
          'join',
          'inner',
          'outer',
          'left',
          'right',
          'union',
          'exists',
          'null',
          'true',
          'false',
        ];
        return !reservedWords.includes(value?.toLowerCase());
      },
    )
    .trim(),

  fileFormat: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('File format is required')
        .oneOf(['csv', 'tsv', 'json'], 'Invalid file format'),
    otherwise: (schema) => schema.nullable(),
  }),

  delimiter: yup.string().when(['sourceType', 'fileFormat'], {
    is: (sourceType: string, fileFormat: string) =>
      sourceType === 'sftp' && fileFormat === 'csv',
    then: (schema) =>
      schema
        .required('Delimiter is required for CSV files')
        .length(1, 'Delimiter must be exactly 1 character'),
    otherwise: (schema) => schema.nullable(),
  }),

  sourceType: yup
    .string()
    .required('Source type is required')
    .oneOf(['sftp', 'http'], 'Invalid source type'),

  schedule: yup
    .string()
    .required('Schedule is required')
    .min(1, 'Please select a schedule'),

  headers: yup.string().when('sourceType', {
    is: 'http',
    then: (schema) =>
      schema.test(
        'valid-json',
        'Headers must be valid JSON format',
        function (value) {
          if (!value || value.trim() === '') return true;

          let trimmedValue = value.trim();

          const normalizeJSON = (str: string) => {
            let normalized = str.trim();

            normalized = normalized
              .replace(/\\'/g, '___ESCAPED_SINGLE___')
              .replace(/\\"/g, '___ESCAPED_DOUBLE___');

            normalized = normalized.replace(/(\w+)\s*:/g, '"$1":');
            normalized = normalized.replace(
              /:\s*([^",\{\}\[\]\s][^",\{\}\[\]]*?)(\s*[,\}])/g,
              ': "$1"$2',
            );

            normalized = normalized.replace(/'/g, '"');

            normalized = normalized
              .replace(/___ESCAPED_SINGLE___/g, "\\'")
              .replace(/___ESCAPED_DOUBLE___/g, '\\"');

            return normalized;
          };

          try {
            let parsed;
            try {
              parsed = JSON.parse(trimmedValue);
            } catch {
              const normalizedValue = normalizeJSON(trimmedValue);
              parsed = JSON.parse(normalizedValue);
            }

            if (
              typeof parsed !== 'object' ||
              Array.isArray(parsed) ||
              parsed === null
            ) {
              return this.createError({
                message:
                  'Headers must be a valid JSON object, not an array or primitive value',
              });
            }

            for (const [key, val] of Object.entries(parsed)) {
              if (typeof key !== 'string' || typeof val !== 'string') {
                return this.createError({
                  message: 'All header keys and values must be strings',
                });
              }
            }

            return true;
          } catch (error: any) {
            if (error.message.includes('Unexpected end of JSON input')) {
              return this.createError({
                message: 'Incomplete JSON - missing closing brackets or quotes',
              });
            } else if (error.message.includes('Unexpected token')) {
              return this.createError({
                message:
                  "Invalid JSON syntax. Examples: {\"key\": \"value\"} or {key: value} or {'key': 'value'}",
              });
            } else {
              return this.createError({
                message: `Invalid JSON format. Try: {"content-type": "application/json"} or {key: value}`,
              });
            }
          }
        },
      ),
    otherwise: (schema) => schema.nullable(),
  }),

  url: yup.string().when('sourceType', {
    is: 'http',
    then: (schema) =>
      schema
        .required('URL is required for HTTP connections')
        .test('valid-url', 'Please enter a valid URL', function (value) {
          if (!value || value.trim() === '') return false;

          const trimmedValue = value.trim();

          try {
            const url = new URL(trimmedValue);

            if (!['http:', 'https:'].includes(url.protocol)) {
              return this.createError({
                message: 'URL must use HTTP or HTTPS protocol',
              });
            }

            if (!url.hostname) {
              return this.createError({
                message: 'URL must have a valid hostname',
              });
            }

            return true;
          } catch (error: any) {
            const errorMsg = error.message.toLowerCase();

            if (errorMsg.includes('invalid url')) {
              const ipPattern =
                /^https?:\/\/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})/;
              const ipMatch = trimmedValue.match(ipPattern);

              if (ipMatch) {
                const octets = [ipMatch[1], ipMatch[2], ipMatch[3], ipMatch[4]];
                const invalidOctets = octets.filter(
                  (octet) => parseInt(octet) > 255,
                );

                if (invalidOctets.length > 0) {
                  return this.createError({
                    message: `Invalid IP address: ${invalidOctets.join(', ')} exceed 255. Valid range is 0-255 for each part.`,
                  });
                }
              }

              return this.createError({
                message:
                  'Invalid URL format. Examples: https://api.example.com',
              });
            }

            return this.createError({
              message: `Invalid URL: ${error.message}`,
            });
          }
        })
        .max(500, 'URL cannot exceed 500 characters'),
    otherwise: (schema) => schema.nullable(),
  }),

  pathPattern: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('File path is required')
        .test(
          'valid-path-format',
          'Please enter a valid file path',
          function (value) {
            if (!value || value.trim() === '') return false;

            const trimmedValue = value.trim();

            if (!trimmedValue.startsWith('/')) {
              return this.createError({
                message:
                  'File path must start with "/" (e.g: /inbound/data_*.csv)',
              });
            }

            const validPathPattern = /^[\/a-zA-Z0-9_\-\.\*]+$/;
            if (!validPathPattern.test(trimmedValue)) {
              return this.createError({
                message:
                  'File path contains invalid characters. Only letters, numbers, /, _, -, ., * are allowed',
              });
            }

            const pathParts = trimmedValue.split('/');
            const fileName = pathParts[pathParts.length - 1];

            if (!fileName || fileName === '') {
              return this.createError({
                message:
                  'File path must include a filename (e.g: /inbound/data_*.csv)',
              });
            }

            const lowerFileName = fileName.toLowerCase();
            const validExtensions = ['.csv', '.tsv', '.json'];
            const hasValidExtension = validExtensions.some((ext) =>
              lowerFileName.endsWith(ext),
            );

            if (!hasValidExtension) {
              return this.createError({
                message:
                  'Filename must end with .csv, .tsv, or .json extension',
              });
            }

            return true;
          },
        )
        .when('fileFormat', (fileFormat: any, schema) =>
          schema.test(
            'extension-format-match',
            'File extension must match selected format',
            function (value) {
              if (!value) return true;

              if (!fileFormat) return true;

              const trimmedValue = value.trim();
              const pathParts = trimmedValue.split('/');
              const fileName = pathParts[pathParts.length - 1];

              if (!fileName || !fileName.includes('.')) return true;

              const fileExtension = fileName.split('.').pop()?.toLowerCase();

              const extensionFormatMap: Record<string, string[]> = {
                csv: ['csv'],
                tsv: ['tsv'],
                json: ['json'],
              };

              const allowedFormatsForExtension =
                extensionFormatMap[fileExtension!];

              const formatValue = Array.isArray(fileFormat)
                ? fileFormat[0]
                : fileFormat;

              if (
                allowedFormatsForExtension &&
                !allowedFormatsForExtension.includes(formatValue?.toLowerCase())
              ) {
                const formatName = formatValue?.toUpperCase();
                const extensionName = fileExtension!.toUpperCase();
                return this.createError({
                  message: `File extension .${extensionName} does not match selected format ${formatName}. Please select ${allowedFormatsForExtension.map((f) => f.toUpperCase()).join(' or ')} format or change the file extension.`,
                });
              }

              return true;
            },
          ),
        )
        .max(100, 'File path cannot exceed 100 characters'),
    otherwise: (schema) => schema.nullable(),
  }),

  host: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('Host is required for SFTP connections')
        .test('valid-ip', 'Please enter a valid IP address', function (value) {
          if (!value || value.trim() === '') return false;

          const trimmedValue = value.trim();

          const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

          if (!ipPattern.test(trimmedValue)) {
            return this.createError({
              message: 'Host must be a valid IP address (e.g: 192.168.1.1)',
            });
          }

          const octets = trimmedValue.split('.').map(Number);
          const invalidOctets = octets.filter((octet) => octet > 255);

          if (invalidOctets.length > 0) {
            return this.createError({
              message: `Invalid IP address: octets cannot exceed 255`,
            });
          }

          return true;
        })
        .max(15, 'IP address cannot exceed 15 characters'),
    otherwise: (schema) => schema.nullable(),
  }),

  port: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('Port is required for SFTP connections')
        .matches(/^\d+$/, 'Port must be a valid number')
        .test(
          'valid-port-range',
          'Port must be between 1 and 65535',
          function (value) {
            if (!value) return false;
            const port = parseInt(value, 10);
            return port >= 1 && port <= 65535;
          },
        ),
    otherwise: (schema) => schema.nullable(),
  }),

  authType: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('Authentication type is required for SFTP connections')
        .oneOf(
          ['password', 'key'],
          'Authentication type must be either password or key',
        ),
    otherwise: (schema) => schema.nullable(),
  }),

  username: yup.string().when('sourceType', {
    is: 'sftp',
    then: (schema) =>
      schema
        .required('Username is required for SFTP connections')
        .min(1, 'Username must be at least 1 character')
        .max(50, 'Username cannot exceed 50 characters')
        .matches(
          /^[a-zA-Z0-9._\s-]+$/,
          'Invalid Username (alphanumeric, ., _, -, and space are allowed)',
        ),
    otherwise: (schema) => schema.nullable(),
  }),

  password: yup.string().when(['sourceType', 'authType'], {
    is: (sourceType: string, authType: string) =>
      sourceType === 'sftp' && (authType === 'password' || authType === 'key'),
    then: (schema) =>
      schema
        .required('This is a required field')
        .min(5, 'there must be at least 5 characters')
        .max(500, 'this field cannot exceed 500 characters'),
    otherwise: (schema) => schema.nullable(),
  }),
});

export const pushValidationSchema = yup.object({
  name: yup
    .string()
    .required('Endpoint name is required')
    .min(3, 'Endpoint name must be at least 3 characters')
    .max(50, 'Endpoint name cannot exceed 50 characters')
    .matches(
      /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
      'Must start with a letter and end with letter/number (only a-z, 0-9, _, - are allowed)',
    )
    .matches(
      /^(?!.*[-_]{2,})/,
      'Endpoint name cannot contain consecutive underscores or hyphens',
    )
    .test(
      'no-reserved-names',
      'Endpoint name cannot be a reserved API keyword',
      function (value) {
        const reservedNames = [
          'api',
          'admin',
          'root',
          'system',
          'config',
          'health',
          'status',
          'ping',
          'test',
          'debug',
          'log',
          'logs',
          'metrics',
          'swagger',
          'docs',
          'documentation',
          'auth',
          'login',
          'logout',
          'register',
          'user',
          'users',
          'account',
          'accounts',
        ];
        return !reservedNames.includes(value?.toLowerCase());
      },
    )
    .trim(),

  version: yup
    .string()
    .required('Version is required')
    .matches(
      /^v?\d+\.\d+\.\d+$/,
      'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)',
    )
    .transform((value) => {
      if (value && !value.startsWith('v')) {
        return `v${value}`;
      }
      return value;
    }),

  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description cannot exceed 200 characters')
    .trim(),

  targetTable: yup
    .string()
    .required('Table Name is required')
    .min(1, 'Table name must be at least 1 character')
    .max(49, 'Table name cannot exceed 50 characters')
    .matches(
      /^[a-z][a-z0-9_]*$/,
      'Table name must start with a letter and contain only lowercase letters, numbers, and underscores',
    )
    .test(
      'no-reserved-words',
      'Table name cannot be a reserved SQL keyword',
      function (value) {
        const reservedWords = [
          'user',
          'table',
          'select',
          'insert',
          'update',
          'delete',
          'create',
          'drop',
          'alter',
          'index',
          'view',
          'schema',
          'database',
          'order',
          'group',
          'where',
          'having',
          'join',
          'inner',
          'outer',
          'left',
          'right',
          'union',
          'exists',
          'null',
          'true',
          'false',
        ];
        return !reservedWords.includes(value?.toLowerCase());
      },
    )
    .trim(),

  ingestMode: yup
    .string()
    .required('Ingest mode is required')
    .oneOf(['append', 'replace'], 'Invalid ingest mode'),

  endpointPath: yup
    .string()
    .required('API path is required')
    .min(1, 'API path must be at least 1 character')
    .max(100, 'API path cannot exceed 100 characters')
    .test(
      'valid-api-path',
      'Please enter a valid API path',
      function (value) {
        if (!value || value.trim() === '') return false;

        const trimmedValue = value.trim();

        if (!trimmedValue.startsWith('/')) {
          return this.createError({
            message: 'API path must start with "/" (e.g: /customer/data_2025)',
          });
        }

        const validPathPattern = /^[\/a-zA-Z0-9_.-]+$/;
        if (!validPathPattern.test(trimmedValue)) {
          return this.createError({
            message:
              'API path contains invalid characters. Only letters, numbers, /, _, -, . are allowed (no spaces)',
          });
        }

        if (trimmedValue.includes('//')) {
          return this.createError({
            message: 'API path cannot contain double slashes (//)',
          });
        }

        if (trimmedValue.length > 1 && trimmedValue.endsWith('/')) {
          return this.createError({
            message:
              'API path cannot end with "/" (e.g: use /customer/data instead of /customer/data/)',
          });
        }

        const segments = trimmedValue
          .split('/')
          .filter((segment) => segment !== '');
        for (const segment of segments) {
          if (segment.length === 0) {
            return this.createError({
              message: 'API path cannot have empty segments',
            });
          }
          if (!/^[a-zA-Z0-9_.-]+$/.test(segment)) {
            return this.createError({
              message: `Invalid path segment "${segment}". Use only letters, numbers, _, -, .`,
            });
          }
        }

        return true;
      },
    )
    .trim(),
});