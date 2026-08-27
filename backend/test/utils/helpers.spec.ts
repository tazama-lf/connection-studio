jest.mock('dotenv', () => ({
  config: jest.fn().mockReturnValue({ parsed: {} }),
}));

describe('utils/helpers — deferred key validation', () => {
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
    // Prevent the module-level dotenv.config() from re-populating
    // ENCRYPTION_KEY from .env when the module re-executes.
    jest.doMock('dotenv', () => ({
      ...jest.requireActual('dotenv'),
      config: () => ({ parsed: {} }),
    }));
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
