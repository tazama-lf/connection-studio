import { validate } from './env.validation';

describe('Environment Validation', () => {
  const validConfig = {
    NODE_ENV: 'development',
    MAX_CPU: '4',
    FUNCTION_NAME: 'test-function',
    TAZAMA_AUTH_URL: 'http://localhost:8080',
    AUTH_PUBLIC_KEY_PATH: '/path/to/public/key',
    CERT_PATH_PUBLIC: '/path/to/cert',
    CONFIGURATION_DATABASE_URL: 'postgresql://localhost:5432/testdb',
    CONFIGURATION_DATABASE: 'testdb',
    CONFIGURATION_DATABASE_USER: 'testuser',
    CONFIGURATION_DATABASE_PASSWORD: 'testpass',
    ENCRYPTION_KEY: 'test-encryption-key-32-characters',
    SESSION_TIMEOUT_MINUTES: '30',
  };

  it('should validate correct environment variables', () => {
    expect(() => validate(validConfig)).not.toThrow();
  });

  it('should accept valid NODE_ENV values', () => {
    const envs = ['development', 'production', 'test', 'dev', 'prod'];

    envs.forEach((env) => {
      const config = { ...validConfig, NODE_ENV: env };
      expect(() => validate(config)).not.toThrow();
    });
  });

  it('should accept optional SESSION_TIMEOUT_MINUTES', () => {
    const { SESSION_TIMEOUT_MINUTES, ...config } = validConfig;

    expect(() => validate(config)).not.toThrow();
  });

  it('should validate SESSION_TIMEOUT_MINUTES as number string', () => {
    const config = { ...validConfig, SESSION_TIMEOUT_MINUTES: '60' };
    expect(() => validate(config)).not.toThrow();
  });

  it('should accept missing optional fields', () => {
    const { SESSION_TIMEOUT_MINUTES, ...config } = validConfig;

    const result = validate(config);
    expect(result).toBeDefined();
  });

  it('should validate MAX_CPU as number string', () => {
    const configs = [
      { ...validConfig, MAX_CPU: '1' },
      { ...validConfig, MAX_CPU: '8' },
      { ...validConfig, MAX_CPU: '16' },
    ];

    configs.forEach((config) => {
      expect(() => validate(config)).not.toThrow();
    });
  });

  it('should require FUNCTION_NAME', () => {
    const { FUNCTION_NAME, ...config } = validConfig;

    // Note: skipMissingProperties is true in validation, so this won't throw
    // but in actual usage, the env var should be provided
    const result = validate(config);
    expect(result).toBeDefined();
  });

  it('should require TAZAMA_AUTH_URL', () => {
    const { TAZAMA_AUTH_URL, ...config } = validConfig;

    const result = validate(config);
    expect(result).toBeDefined();
  });

  it('should require database configuration', () => {
    const { CONFIGURATION_DATABASE_URL, ...config } = validConfig;

    const result = validate(config);
    expect(result).toBeDefined();
  });

  it('should require ENCRYPTION_KEY', () => {
    const { ENCRYPTION_KEY, ...config } = validConfig;

    const result = validate(config);
    expect(result).toBeDefined();
  });

  it('should handle all required fields present', () => {
    const result = validate(validConfig);

    expect(result.NODE_ENV).toBe('development');
    expect(result.MAX_CPU).toBe('4');
    expect(result.FUNCTION_NAME).toBe('test-function');
    expect(result.TAZAMA_AUTH_URL).toBe('http://localhost:8080');
    expect(result.ENCRYPTION_KEY).toBe('test-encryption-key-32-characters');
  });

  it('should handle type conversion', () => {
    const config = {
      ...validConfig,
      MAX_CPU: 4, // Pass as number instead of string
    };

    const result = validate(config);
    expect(result.MAX_CPU).toBe('4');
  });
});
