import * as yup from 'yup';
import type { ScheduleResponse } from '../types';

// Named constants to avoid magic numbers
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 200;
const MIN_TABLE_NAME_LENGTH = 1;
const MAX_TABLE_NAME_LENGTH = 49;
const DELIMITER_EXACT_LENGTH = 1;
const MIN_SCHEDULE_LENGTH = 1;
const MAX_IP_OCTET = 255;
const NO_INVALID_OCTETS = 0;
const MAX_URL_LENGTH = 500;
const LAST_ITEM_OFFSET = 1;
const FIRST_ARRAY_INDEX = 0;
const MAX_PATH_LENGTH = 100;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const MIN_USERNAME_LENGTH = 1;
const MAX_USERNAME_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 5;
const MAX_PASSWORD_LENGTH = 500;
const MIN_ENDPOINT_PATH_LENGTH = 1;
const MAX_ENDPOINT_PATH_LENGTH = 100;
const PATH_ROOT_MIN_LENGTH = 1;
const SINGLE_ITERATION = 1;

export const defaultValues = {
    name: '',
    version: '',
    sourceType: 'sftp',
    description: '',
    schedule: '',
    host: '',
    port: '',
    authType: 'password',
    username: '',
    password: '',
    privateKey: '',
    pathPattern: '',
    fileFormat: 'csv',
    delimiter: '',
    httpMethod: 'GET',
    httpHeaders: '',
    endpointPath: '',
    endpointVersion: '',
    ingestMode: 'append',
    targetTable: '',
    targetCollection: '',
    headers: '',
    url: ''
};

export const pullValidationSchema = yup.object({
    name: yup
        .string()
        .required('Connector name is required')
        .min(MIN_NAME_LENGTH, 'Connector name must be at least 3 characters')
        .max(MAX_NAME_LENGTH, 'Connector name cannot exceed 50 characters')
        .matches(
            /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
            'Must start with a letter and end with letter/number (only a-z, 0-9, _, - are allowed)'
        )
        .matches(
            /^(?!.*[-_]{2,})/,
            'Endpoint name cannot contain consecutive underscores or hyphens'
        )
        .test('no-reserved-names', 'Endpoint name cannot be a reserved API keyword', (value) => {
            const reservedNames = ['api', 'admin', 'root', 'system', 'config', 'health', 'status', 'ping', 'test', 'debug', 'log', 'logs', 'metrics', 'swagger', 'docs', 'documentation', 'auth', 'login', 'logout', 'register', 'user', 'users', 'account', 'accounts'];
            return !reservedNames.includes(value.toLowerCase());
        })
        .trim(),

    version: yup
        .string()
        .required('Version is required')
        .matches(
            /^v?\d+\.\d+\.\d+$/,
            'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)'
        )
        .transform((value: string | undefined) => {

            if (value && !value.startsWith('v')) {
                return `v${value}`;
            }
            return value;
        }),

    description: yup
        .string()
        .required('Description is required')
        .min(MIN_DESCRIPTION_LENGTH, 'Description must be at least 10 characters')
        .max(MAX_DESCRIPTION_LENGTH, 'Description cannot exceed 200 characters')
        .trim(),

    ingestMode: yup
        .string()
        .required('Ingest mode is required')
        .oneOf(['append', 'replace'], 'Invalid ingest mode'),

    targetTable: yup
        .string()
        .required('Table Name is required')
        .min(MIN_TABLE_NAME_LENGTH, 'Table name must be at least 1 character')
        .max(MAX_TABLE_NAME_LENGTH, 'Table name cannot exceed 50 characters')
        .matches(
            /^[a-z][a-z0-9_]*$/,
            'Table name must start with a letter and contain only lowercase letters, numbers, and underscores'
        )
        .test('no-reserved-words', 'Table name cannot be a reserved SQL keyword', (value) => {
            const reservedWords = ['user', 'table', 'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'index', 'view', 'schema', 'database', 'order', 'group', 'where', 'having', 'join', 'inner', 'outer', 'left', 'right', 'union', 'exists', 'null', 'true', 'false'];
            return !reservedWords.includes(value.toLowerCase());
        })
        .trim(),

    fileFormat: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('File format is required')
                .oneOf(['csv', 'tsv', 'json'], 'Invalid file format'),
            otherwise: (schema) => schema.nullable()
        }),

    delimiter: yup
        .string()
        .when(['sourceType', 'fileFormat'], {
            is: (sourceType, fileFormat) => sourceType === 'sftp' && fileFormat === 'csv',
            then: (schema) => schema
                .required('Delimiter is required for CSV files')
                .length(DELIMITER_EXACT_LENGTH, 'Delimiter must be exactly 1 character'),
            otherwise: (schema) => schema.nullable()
        }),

    sourceType: yup
        .string()
        .required('Source type is required')
        .oneOf(['sftp', 'http'], 'Invalid source type'),

    schedule: yup
        .string()
        .required('Schedule is required')
        .min(MIN_SCHEDULE_LENGTH, 'Please select a schedule'),

    headers: yup
        .string()
        .when('sourceType', {
            is: 'http',
            then: (schema) => schema
                .test('valid-json', 'Headers must be valid JSON format', function (value) {
                    if (!value || value.trim() === '') return true;

                    const trimmedValue = value.trim();

                    const normalizeJSON = (str: string): string => {
                        let normalized = str.trim();


                        normalized = normalized.replace(/\\'/g, '___ESCAPED_SINGLE___').replace(/\\"/g, '___ESCAPED_DOUBLE___');



                        normalized = normalized.replace(/(?<key>\w+)\s*:/g, '"$<key>":');
                        normalized = normalized.replace(/:\s*(?<val>[^",{}[\]\s][^",{}[\]]*?)(?<end>\s*[,}])/g, ': "$<val>"$<end>');


                        normalized = normalized.replace(/'/g, '"');


                        // eslint-disable-next-line @stylistic/quotes -- backslash+single-quote sequence requires double-quoted string literal
                        normalized = normalized.replace(/___ESCAPED_SINGLE___/g, "\\'").replace(/___ESCAPED_DOUBLE___/g, '\\"');

                        return normalized;
                    };

                    try {

                        let parsed: unknown;
                        try {
                            parsed = JSON.parse(trimmedValue) as unknown;
                        } catch (initialError) {
                            const normalizedValue = normalizeJSON(trimmedValue);
                            parsed = JSON.parse(normalizedValue) as unknown;
                        }


                        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
                            return this.createError({ message: 'Headers must be a valid JSON object, not an array or primitive value' });
                        }


                        for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
                            if (typeof key !== 'string' || typeof val !== 'string') {
                                return this.createError({ message: 'All header keys and values must be strings' });
                            }
                        }

                        return true;
                    } catch (error) {
                        const err = error as Error;
                        if (err.message.includes('Unexpected end of JSON input') || err.message.includes('Unterminated string')) {
                            return this.createError({ message: 'Incomplete JSON - missing closing brackets or quotes' });
                        } else if (err.message.includes('Unexpected token')) {
                            return this.createError({ message: 'Invalid JSON syntax. Examples: {"key": "value"} or {key: value} or {\'key\': \'value\'}' });
                        } else {
                            return this.createError({ message: 'Invalid JSON format. Try: {"content-type": "application/json"} or {key: value}' });
                        }
                    }
                }),
            otherwise: (schema) => schema.nullable()
        }),

    url: yup
        .string()
        .when('sourceType', {
            is: 'http',
            then: (schema) => schema
                .required('URL is required for HTTP connections')
                .test('valid-url', 'Please enter a valid URL', function (value) {
                    if (!value || value.trim() === '') return false;

                    const trimmedValue = value.trim();

                    try {
                        const url = new URL(trimmedValue);


                        if (!['http:', 'https:'].includes(url.protocol)) {
                            return this.createError({ message: 'URL must use HTTP or HTTPS protocol' });
                        }

                        return true;
                    } catch (error) {

                        const ipPattern = /^https?:\/\/(?<oct1>\d{1,3})\.(?<oct2>\d{1,3})\.(?<oct3>\d{1,3})\.(?<oct4>\d{1,3})/;
                        const ipMatch = ipPattern.exec(trimmedValue);

                        if (ipMatch?.groups) {
                            const { oct1, oct2, oct3, oct4 } = ipMatch.groups;
                            const octets = [oct1, oct2, oct3, oct4];
                            const invalidOctets = octets.filter(octet => parseInt(octet, 10) > MAX_IP_OCTET);

                            if (invalidOctets.length > NO_INVALID_OCTETS) {
                                return this.createError({ message: `Invalid IP address: ${invalidOctets.join(', ')} exceed 255. Valid range is 0-255 for each part.` });
                            }
                        }

                        return this.createError({ message: 'Invalid URL format. Examples: https://api.example.com' });
                    }
                })
                .max(MAX_URL_LENGTH, 'URL cannot exceed 500 characters'),
            otherwise: (schema) => schema.nullable()
        }),

    pathPattern: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('File path is required')
                .test('valid-path-format', 'Please enter a valid file path', function (value) {
                    if (!value || value.trim() === '') return false;

                    const trimmedValue = value.trim();


                    if (!trimmedValue.startsWith('/')) {
                        return this.createError({ message: 'File path must start with "/" (e.g: /inbound/data_*.csv)' });
                    }


                    const validPathPattern = /^[/a-zA-Z0-9_\-.*]+$/;
                    if (!validPathPattern.test(trimmedValue)) {
                        return this.createError({ message: 'File path contains invalid characters. Only letters, numbers, /, _, -, ., * are allowed' });
                    }


                    const pathParts = trimmedValue.split('/');
                    const fileName = pathParts[pathParts.length - LAST_ITEM_OFFSET];

                    if (!fileName) {
                        return this.createError({ message: 'File path must include a filename (e.g: /inbound/data_*.csv)' });
                    }


                    const lowerFileName = fileName.toLowerCase();
                    const validExtensions = ['.csv', '.tsv', '.json'];
                    const hasValidExtension = validExtensions.some(ext => lowerFileName.endsWith(ext));

                    if (!hasValidExtension) {
                        return this.createError({ message: 'Filename must end with .csv, .tsv, or .json extension' });
                    }

                    return true;
                })
                .when('fileFormat', (fileFormat, schema) =>
                    schema.test('extension-format-match', 'File extension must match selected format', function (value) {
                        if (!value) return true;

                        const trimmedValue = value.trim();
                        const pathParts = trimmedValue.split('/');
                        const fileName = pathParts[pathParts.length - LAST_ITEM_OFFSET];

                        if (!fileName.includes('.')) return true;

                        const fileExtension = fileName.split('.').pop()?.toLowerCase();


                        const extensionFormatMap: Record<string, string[]> = {
                            csv: ['csv'],
                            tsv: ['tsv'],
                            json: ['json'],
                        };

                        const allowedFormats = fileExtension === undefined ? undefined : extensionFormatMap[fileExtension];


                        const formatValue = (Array.isArray(fileFormat) ? String(fileFormat[FIRST_ARRAY_INDEX] as unknown) : String(fileFormat as unknown));

                        if (allowedFormats && !allowedFormats.includes(formatValue.toLowerCase())) {
                            const formatName = formatValue.toUpperCase();
                            const extensionName = (fileExtension ?? '').toUpperCase();
                            return this.createError({
                                message: `File extension .${extensionName} does not match selected format ${formatName}. Please select ${allowedFormats.map(f => f.toUpperCase()).join(' or ')} format or change the file extension.`
                            });
                        }

                        return true;
                    })
                )
                .max(MAX_PATH_LENGTH, 'File path cannot exceed 100 characters'),
            otherwise: (schema) => schema.nullable()
        }),

    host: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('Host is required for SFTP connections'),
            otherwise: (schema) => schema.nullable()
        }),

    port: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('Port is required for SFTP connections')
                .matches(/^\d+$/, 'Port must be a valid number')
                .test('valid-port-range', 'Port must be between 1 and 65535', (value) => {
                    if (!value) return false;
                    const port = parseInt(value, 10);
                    return port >= MIN_PORT && port <= MAX_PORT;
                }),
            otherwise: (schema) => schema.nullable()
        }),

    authType: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('Authentication type is required for SFTP connections')
                .oneOf(['password', 'key'], 'Authentication type must be either password or key'),
            otherwise: (schema) => schema.nullable()
        }),

    username: yup
        .string()
        .when('sourceType', {
            is: 'sftp',
            then: (schema) => schema
                .required('Username is required for SFTP connections')
                .min(MIN_USERNAME_LENGTH, 'Username must be at least 1 character')
                .max(MAX_USERNAME_LENGTH, 'Username cannot exceed 50 characters'),
            otherwise: (schema) => schema.nullable()
        }),

    password: yup
        .string()
        .when(['sourceType', 'authType'], {
            is: (sourceType, authType) => sourceType === 'sftp' && (authType === 'password' || authType === 'key'),
            then: (schema) => schema
                .required('This is a required field')
                .min(MIN_PASSWORD_LENGTH, 'there must be at least 5 characters')
                .max(MAX_PASSWORD_LENGTH, 'this field cannot exceed 500 characters'),
            otherwise: (schema) => schema.nullable()
        }),
});


export const pushValidationSchema = yup.object({
    name: yup
        .string()
        .required('Endpoint name is required')
        .min(MIN_NAME_LENGTH, 'Endpoint name must be at least 3 characters')
        .max(MAX_NAME_LENGTH, 'Endpoint name cannot exceed 50 characters')
        .matches(
            /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z]$/,
            'Must start with a letter and end with letter/number (only a-z, 0-9, _, - are allowed)'
        )
        .matches(
            /^(?!.*[-_]{2,})/,
            'Endpoint name cannot contain consecutive underscores or hyphens'
        )
        .test('no-reserved-names', 'Endpoint name cannot be a reserved API keyword', (value) => {
            const reservedNames = ['api', 'admin', 'root', 'system', 'config', 'health', 'status', 'ping', 'test', 'debug', 'log', 'logs', 'metrics', 'swagger', 'docs', 'documentation', 'auth', 'login', 'logout', 'register', 'user', 'users', 'account', 'accounts'];
            return !reservedNames.includes(value.toLowerCase());
        })
        .trim(),

    version: yup
        .string()
        .required('Version is required')
        .matches(
            /^v?\d+\.\d+\.\d+$/,
            'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)'
        )
        .transform((value: string | undefined) => {

            if (value && !value.startsWith('v')) {
                return `v${value}`;
            }
            return value;
        }),

    description: yup
        .string()
        .required('Description is required')
        .min(MIN_DESCRIPTION_LENGTH, 'Description must be at least 10 characters')
        .max(MAX_DESCRIPTION_LENGTH, 'Description cannot exceed 200 characters')
        .trim(),

    targetTable: yup
        .string()
        .required('Table Name is required')
        .min(MIN_TABLE_NAME_LENGTH, 'Table name must be at least 1 character')
        .max(MAX_TABLE_NAME_LENGTH, 'Table name cannot exceed 50 characters')
        .matches(
            /^[a-z][a-z0-9_]*$/,
            'Table name must start with a letter and contain only lowercase letters, numbers, and underscores'
        )
        .test('no-reserved-words', 'Table name cannot be a reserved SQL keyword', (value) => {
            const reservedWords = ['user', 'table', 'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'index', 'view', 'schema', 'database', 'order', 'group', 'where', 'having', 'join', 'inner', 'outer', 'left', 'right', 'union', 'exists', 'null', 'true', 'false'];
            return !reservedWords.includes(value.toLowerCase());
        })
        .trim(),

    ingestMode: yup
        .string()
        .required('Ingest mode is required')
        .oneOf(['append', 'replace'], 'Invalid ingest mode'),

    endpointPath: yup
        .string()
        .required('API path is required')
        .min(MIN_ENDPOINT_PATH_LENGTH, 'API path must be at least 1 character')
        .max(MAX_ENDPOINT_PATH_LENGTH, 'API path cannot exceed 100 characters')
        .test('valid-api-path', 'Please enter a valid API path', function (value) {
            if (!value || value.trim() === '') return false;

            const trimmedValue = value.trim();


            if (!trimmedValue.startsWith('/')) {
                return this.createError({ message: 'API path must start with "/" (e.g: /customer/data_2025)' });
            }


            const validPathPattern = /^[/a-zA-Z0-9_.-]+$/;
            if (!validPathPattern.test(trimmedValue)) {
                return this.createError({ message: 'API path contains invalid characters. Only letters, numbers, /, _, -, . are allowed (no spaces)' });
            }


            if (trimmedValue.includes('//')) {
                return this.createError({ message: 'API path cannot contain double slashes (//)' });
            }


            if (trimmedValue.length > PATH_ROOT_MIN_LENGTH && trimmedValue.endsWith('/')) {
                return this.createError({ message: 'API path cannot end with "/" (e.g: use /customer/data instead of /customer/data/)' });
            }


            return true;
        })
        .trim(),
});



export const sourceTypeOptions = [
    { label: 'SFTP', value: 'sftp' },
    { label: 'HTTPS', value: 'http' },
];

export const authenticationTypeOptions = [
    { label: 'Username & Password', value: 'password' },
    { label: 'Username & Private Key', value: 'key' },
];

export const fileFormatOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'TSV', value: 'tsv' },
    { label: 'JSON', value: 'json' },
];

export const ingestModeOptions = [
    { label: 'Append - Add new records to existing data', value: 'append' },
    { label: 'Replace - Archive existing data and append new data', value: 'replace' },
];

export const getAssociatedScheduleOptions = (schedules: ScheduleResponse[]): Array<{ label: string; value: string }> =>
    schedules.map((schedule) => ({
        label: `${schedule.name} - ${schedule.cron} (${schedule.iterations === SINGLE_ITERATION ? '1 iteration' : `${schedule.iterations} iterations`})`,
        value: schedule.id,
    }));

