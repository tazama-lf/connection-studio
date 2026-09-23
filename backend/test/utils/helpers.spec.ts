jest.mock('dotenv', () => ({
  config: jest.fn().mockReturnValue({ parsed: {} }),
}));

import { validatePayloadContent } from '../../src/utils/helpers';

describe('utils/helpers - deferred key validation', () => {
  const originalKey = process.env.ENCRYPTION_KEY;
  const originalIv = process.env.IV_LENGTH;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalKey;
    }
    if (originalIv === undefined) {
      delete process.env.IV_LENGTH;
    } else {
      process.env.IV_LENGTH = originalIv;
    }
  });

  it('does not throw at import time when ENCRYPTION_KEY is unset', () => {
    delete process.env.ENCRYPTION_KEY;
    jest.isolateModules(() => {
      expect(() => require('../../src/utils/helpers')).not.toThrow();
    });
  });

  it('throws only when encrypt is called with no ENCRYPTION_KEY', () => {
    delete process.env.ENCRYPTION_KEY;
    process.env.IV_LENGTH = '16';
    jest.resetModules();
    const fresh = require('../../src/utils/helpers') as {
      encrypt: (t: string) => string;
    };
    expect(() => fresh.encrypt('hello')).toThrow(/ENCRYPTION_KEY is not set/);
  });

  it('round-trips a value with a 32-byte key', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    process.env.IV_LENGTH = '16';
    jest.resetModules();
    const fresh = require('../../src/utils/helpers') as {
      encrypt: (t: string) => string;
      decrypt: (t: string) => string;
    };
    const cipher = fresh.encrypt('hello');
    expect(fresh.decrypt(cipher)).toBe('hello');
  });
});

describe('utils/helpers - validatePayloadContent', () => {
  it('requires payload content', () => {
    expect(validatePayloadContent(undefined, 'application/json')).toEqual({
      isValid: false,
      message: 'Payload is required',
    });
    expect(validatePayloadContent(null, 'application/json')).toEqual({
      isValid: false,
      message: 'Payload is required',
    });
    expect(validatePayloadContent('', 'application/xml')).toEqual({
      isValid: false,
      message: 'Payload is required',
    });
  });

  it('accepts JSON object payloads as strings or objects', () => {
    expect(
      validatePayloadContent('{"name":"alice"}', 'application/json'),
    ).toEqual({
      isValid: true,
      message: 'Valid JSON format detected',
    });
    expect(
      validatePayloadContent({ name: 'alice' }, 'application/json'),
    ).toEqual({
      isValid: true,
      message: 'Valid JSON format detected',
    });
  });

  it('rejects invalid or non-object JSON payloads', () => {
    expect(validatePayloadContent('{bad json', 'application/json')).toEqual({
      isValid: false,
      message: 'Invalid JSON format',
    });
    expect(validatePayloadContent('[1,2]', 'application/json')).toEqual({
      isValid: false,
      message: 'Payload must be a valid JSON object',
    });
    expect(validatePayloadContent('123', 'application/json')).toEqual({
      isValid: false,
      message: 'Payload must be a valid JSON object',
    });
  });

  it('accepts simple XML payloads', () => {
    expect(
      validatePayloadContent(
        '<root><name>alice</name></root>',
        'application/xml',
      ),
    ).toEqual({
      isValid: true,
      message: 'Valid XML format detected',
    });
  });

  it('rejects unsafe or malformed XML payloads', () => {
    expect(validatePayloadContent({ root: true }, 'application/xml')).toEqual({
      isValid: false,
      message: 'XML payload must be a string',
    });
    expect(
      validatePayloadContent(
        '<?xml version="1.0"?><root />',
        'application/xml',
      ),
    ).toEqual({
      isValid: false,
      message: 'XML declarations and processing instructions are not allowed',
    });
    expect(
      validatePayloadContent('<!--x--><root />', 'application/xml'),
    ).toEqual({
      isValid: false,
      message: 'XML comments are not allowed',
    });
    expect(
      validatePayloadContent('<!DOCTYPE root><root />', 'application/xml'),
    ).toEqual({
      isValid: false,
      message: 'DOCTYPE declarations are not allowed',
    });
    expect(
      validatePayloadContent('<root><![CDATA[x]]></root>', 'application/xml'),
    ).toEqual({
      isValid: false,
      message: 'CDATA sections are not allowed',
    });
    expect(validatePayloadContent('<root>', 'application/xml')).toEqual({
      isValid: false,
      message: 'Invalid XML structure',
    });
  });

  it('rejects unsupported content types', () => {
    expect(validatePayloadContent('plain text', 'text/plain')).toEqual({
      isValid: false,
      message: 'Unsupported content type',
    });
  });
});
