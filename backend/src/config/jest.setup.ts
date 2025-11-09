/**
 * Jest setup for config folder tests
 * Mocks required environment variables
 */

// Mock required environment variables
process.env.STARTUP_TYPE = 'nats';
process.env.NODE_ENV = 'test';
process.env.FUNCTION_NAME = 'test-function';
process.env.MAX_CPU = '4';
process.env.TAZAMA_AUTH_URL = 'http://localhost:8080';
process.env.AUTH_PUBLIC_KEY_PATH = '/path/to/public/key';
process.env.CERT_PATH_PUBLIC = '/path/to/cert';
process.env.CONFIGURATION_DATABASE_URL = 'postgresql://localhost:5432/testdb';
process.env.CONFIGURATION_DATABASE = 'testdb';
process.env.CONFIGURATION_DATABASE_USER = 'testuser';
process.env.CONFIGURATION_DATABASE_PASSWORD = 'testpass';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long';
process.env.SESSION_TIMEOUT_MINUTES = '30';
process.env.SERVER_URL = '10.10.80.37:4222';
process.env.PRODUCER_STREAM = 'config.notification';
process.env.CONSUMER_STREAM = 'config.notification';
process.env.STREAM_SUBJECT = 'config.notification';
process.env.ACK_POLICY = 'Explicit';
process.env.PRODUCER_STORAGE = 'Memory';
process.env.PRODUCER_RETENTION_POLICY = 'Workqueue';
process.env.ENV = 'dev';
process.env.ADMIN_SERVICE_URL = 'http://localhost:3100';
