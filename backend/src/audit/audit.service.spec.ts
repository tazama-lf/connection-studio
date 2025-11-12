import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditService } from './audit.service';
import { DatabaseService } from '@tazama-lf/tcs-lib';

// Mock DatabaseService
jest.mock('@tazama-lf/tcs-lib', () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => ({
      logAction: jest.fn().mockResolvedValue(undefined),
      getAuditLogs: jest.fn().mockResolvedValue([]),
      getAuditLogsByName: jest.fn().mockResolvedValue([]),
    })),
  };
});

describe('AuditService', () => {
  let service: AuditService;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    // Create mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          DB_HOST: 'localhost',
          DB_PORT: 5432,
          DB_NAME: 'test_db',
          DB_USER: 'test_user',
          DB_PASS: 'test_password',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    // Access the private dbService through reflection
    mockDbService = (service as any).dbService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize DatabaseService with config from environment', () => {
    expect(DatabaseService).toHaveBeenCalledWith({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    });
  });

  describe('log', () => {
    it('should be a no-op method for compatibility', () => {
      expect(() => service.log()).not.toThrow();
    });
  });

  describe('logAction', () => {
    it('should call dbService.logAction with the provided entry', async () => {
      const entry = {
        action: 'TEST_ACTION',
        entityType: 'TEST_ENTITY',
        actor: 'test@example.com',
        tenantId: 'tenant-001',
      };

      await service.logAction(entry);

      expect(mockDbService.logAction).toHaveBeenCalledWith(entry);
      expect(mockDbService.logAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('logEndpointCreated', () => {
    it('should log endpoint creation with all parameters', async () => {
      await service.logEndpointCreated(
        'editor@example.com',
        '/api/test',
        'tenant-001',
        '1.0',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'ENDPOINT_CREATED',
        entityType: 'ENDPOINT',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: '1.0',
      });
    });

    it('should log endpoint creation without version', async () => {
      await service.logEndpointCreated(
        'editor@example.com',
        '/api/test',
        'tenant-001',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'ENDPOINT_CREATED',
        entityType: 'ENDPOINT',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: undefined,
      });
    });
  });

  describe('logSchemaInferred', () => {
    it('should log schema inference with version', async () => {
      await service.logSchemaInferred(
        'editor@example.com',
        '/api/test',
        'tenant-001',
        '2.0',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'SCHEMA_INFERRED',
        entityType: 'SCHEMA',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: '2.0',
      });
    });

    it('should log schema inference without version', async () => {
      await service.logSchemaInferred(
        'editor@example.com',
        '/api/test',
        'tenant-001',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'SCHEMA_INFERRED',
        entityType: 'SCHEMA',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: undefined,
      });
    });
  });

  describe('logDraftSaved', () => {
    it('should log draft saved with version', async () => {
      await service.logDraftSaved(
        'editor@example.com',
        '/api/test',
        'tenant-001',
        '1.0',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'DRAFT_SAVED',
        entityType: 'ENDPOINT',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: '1.0',
      });
    });

    it('should log draft saved without version', async () => {
      await service.logDraftSaved(
        'editor@example.com',
        '/api/test',
        'tenant-001',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'DRAFT_SAVED',
        entityType: 'ENDPOINT',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: undefined,
      });
    });
  });

  describe('logSchemaValidated', () => {
    it('should log schema validation with all parameters', async () => {
      await service.logSchemaValidated(
        'editor@example.com',
        '/api/test',
        'tenant-001',
        '1.0',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'SCHEMA_VALIDATED',
        entityType: 'SCHEMA',
        actor: 'editor@example.com',
        endpointName: '/api/test',
        tenantId: 'tenant-001',
        version: '1.0',
      });
    });
  });

  describe('logConfigCreated', () => {
    it('should log config creation with details', async () => {
      await service.logConfigCreated(
        'editor@example.com',
        '123',
        'tenant-001',
        'New payment configuration',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_CREATED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        details: 'New payment configuration',
        severity: 'MEDIUM',
      });
    });

    it('should log config creation without details', async () => {
      await service.logConfigCreated('editor@example.com', '123', 'tenant-001');

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_CREATED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        details: undefined,
        severity: 'MEDIUM',
      });
    });
  });

  describe('logConfigUpdated', () => {
    it('should log config update with old and new values', async () => {
      const oldValues = { status: 'IN_PROGRESS', version: '1.0' };
      const newValues = { status: 'UNDER_REVIEW', version: '1.0' };

      await service.logConfigUpdated(
        'editor@example.com',
        '123',
        'tenant-001',
        oldValues,
        newValues,
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_UPDATED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        oldValues,
        newValues,
        severity: 'MEDIUM',
      });
    });

    it('should log config update without old/new values', async () => {
      await service.logConfigUpdated('editor@example.com', '123', 'tenant-001');

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_UPDATED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        oldValues: undefined,
        newValues: undefined,
        severity: 'MEDIUM',
      });
    });
  });

  describe('logConfigDeleted', () => {
    it('should log config deletion with HIGH severity and details', async () => {
      await service.logConfigDeleted(
        'admin@example.com',
        '123',
        'tenant-001',
        'Obsolete configuration removed',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_DELETED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        details: 'Obsolete configuration removed',
        severity: 'HIGH',
      });
    });

    it('should log config deletion without details', async () => {
      await service.logConfigDeleted('admin@example.com', '123', 'tenant-001');

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_DELETED',
        entityType: 'CONFIG',
        entityId: '123',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        details: undefined,
        severity: 'HIGH',
      });
    });
  });

  describe('logConfigCloned', () => {
    it('should log config cloning with source reference', async () => {
      await service.logConfigCloned(
        'editor@example.com',
        '123',
        '456',
        'tenant-001',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CONFIG_CLONED',
        entityType: 'CONFIG',
        entityId: '456',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        details: 'Cloned from config 123',
        severity: 'MEDIUM',
      });
    });
  });

  describe('logMappingCreated', () => {
    it('should log mapping creation with details', async () => {
      const mappingDetails = {
        sourceField: 'payment.amount',
        targetField: 'transaction.value',
      };

      await service.logMappingCreated(
        'editor@example.com',
        '123',
        'tenant-001',
        mappingDetails,
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'MAPPING_CREATED',
        entityType: 'MAPPING',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        newValues: mappingDetails,
        severity: 'MEDIUM',
      });
    });
  });

  describe('logMappingUpdated', () => {
    it('should log mapping update with old and new mappings', async () => {
      const oldMapping = { sourceField: 'old.path', targetField: 'old.target' };
      const newMapping = { sourceField: 'new.path', targetField: 'new.target' };

      await service.logMappingUpdated(
        'editor@example.com',
        '123',
        'tenant-001',
        oldMapping,
        newMapping,
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'MAPPING_UPDATED',
        entityType: 'MAPPING',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        oldValues: oldMapping,
        newValues: newMapping,
        severity: 'MEDIUM',
      });
    });
  });

  describe('logMappingDeleted', () => {
    it('should log mapping deletion with details', async () => {
      const mappingDetails = {
        sourceField: 'payment.amount',
        targetField: 'transaction.value',
      };

      await service.logMappingDeleted(
        'editor@example.com',
        '123',
        'tenant-001',
        mappingDetails,
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'MAPPING_DELETED',
        entityType: 'MAPPING',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        oldValues: mappingDetails,
        severity: 'MEDIUM',
      });
    });
  });

  describe('logFieldAdjustment', () => {
    it('should log field adjustment with path and values', async () => {
      await service.logFieldAdjustment(
        'editor@example.com',
        '123',
        'tenant-001',
        'payment.currency',
        'USD',
        'EUR',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'FIELD_ADJUSTED',
        entityType: 'FIELD',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        details: 'Field: payment.currency',
        oldValues: { 'payment.currency': 'USD' },
        newValues: { 'payment.currency': 'EUR' },
        severity: 'MEDIUM',
      });
    });

    it('should log field adjustment with complex values', async () => {
      const oldValue = { nested: { value: 100 } };
      const newValue = { nested: { value: 200 } };

      await service.logFieldAdjustment(
        'editor@example.com',
        '123',
        'tenant-001',
        'config.settings',
        oldValue,
        newValue,
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'FIELD_ADJUSTED',
        entityType: 'FIELD',
        entityId: '123',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        details: 'Field: config.settings',
        oldValues: { 'config.settings': oldValue },
        newValues: { 'config.settings': newValue },
        severity: 'MEDIUM',
      });
    });
  });

  describe('logAuthentication', () => {
    it('should log successful authentication with LOW severity', async () => {
      await service.logAuthentication(
        'user@example.com',
        'tenant-001',
        true,
        '192.168.1.100',
        'Mozilla/5.0',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'AUTH_SUCCESS',
        entityType: 'AUTH',
        actor: 'user@example.com',
        tenantId: 'tenant-001',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        status: 'SUCCESS',
        severity: 'LOW',
      });
    });

    it('should log failed authentication with HIGH severity', async () => {
      await service.logAuthentication(
        'attacker@example.com',
        'tenant-001',
        false,
        '1.2.3.4',
        'Malicious Bot',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'AUTH_FAILURE',
        entityType: 'AUTH',
        actor: 'attacker@example.com',
        tenantId: 'tenant-001',
        ipAddress: '1.2.3.4',
        userAgent: 'Malicious Bot',
        status: 'FAILURE',
        severity: 'HIGH',
      });
    });

    it('should log authentication without IP and user agent', async () => {
      await service.logAuthentication('user@example.com', 'tenant-001', true);

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'AUTH_SUCCESS',
        entityType: 'AUTH',
        actor: 'user@example.com',
        tenantId: 'tenant-001',
        ipAddress: undefined,
        userAgent: undefined,
        status: 'SUCCESS',
        severity: 'LOW',
      });
    });
  });

  describe('logError', () => {
    it('should log error with HIGH severity and details', async () => {
      await service.logError(
        'system@example.com',
        'tenant-001',
        'Database connection failed',
        'Connection timeout after 30s',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'ERROR_OCCURRED',
        entityType: 'SYSTEM',
        actor: 'system@example.com',
        tenantId: 'tenant-001',
        details: 'Connection timeout after 30s',
        errorMessage: 'Database connection failed',
        status: 'FAILURE',
        severity: 'HIGH',
      });
    });

    it('should log error without details', async () => {
      await service.logError(
        'system@example.com',
        'tenant-001',
        'Unexpected error occurred',
      );

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'ERROR_OCCURRED',
        entityType: 'SYSTEM',
        actor: 'system@example.com',
        tenantId: 'tenant-001',
        details: undefined,
        errorMessage: 'Unexpected error occurred',
        status: 'FAILURE',
        severity: 'HIGH',
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should call dbService.getAuditLogs with all parameters', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const mockLogs = [{ id: 1, action: 'TEST' }];

      mockDbService.getAuditLogs.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs(
        'tenant-001',
        'CONFIG',
        'editor@example.com',
        startDate,
        endDate,
        50,
      );

      expect(mockDbService.getAuditLogs).toHaveBeenCalledWith(
        'tenant-001',
        'CONFIG',
        'editor@example.com',
        startDate,
        endDate,
        50,
      );
      expect(result).toEqual(mockLogs);
    });

    it('should use default limit of 100 when not specified', async () => {
      const mockLogs = [{ id: 1, action: 'TEST' }];
      mockDbService.getAuditLogs.mockResolvedValue(mockLogs);

      await service.getAuditLogs('tenant-001');

      expect(mockDbService.getAuditLogs).toHaveBeenCalledWith(
        'tenant-001',
        undefined,
        undefined,
        undefined,
        undefined,
        100,
      );
    });

    it('should retrieve logs with partial parameters', async () => {
      const mockLogs = [{ id: 1, action: 'CONFIG_CREATED' }];
      mockDbService.getAuditLogs.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('tenant-001', 'CONFIG');

      expect(mockDbService.getAuditLogs).toHaveBeenCalledWith(
        'tenant-001',
        'CONFIG',
        undefined,
        undefined,
        undefined,
        100,
      );
      expect(result).toEqual(mockLogs);
    });
  });

  describe('logMappingAction', () => {
    it('should log CREATE mapping action with all fields', async () => {
      await service.logMappingAction({
        action: 'CREATE',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        mappingName: 'PaymentMapping',
        endpointName: '/api/payment',
        version: '1.0',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'CREATE',
        entityType: 'MAPPING',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        endpointName: '/api/payment',
        mappingName: 'PaymentMapping',
        version: '1.0',
      });
    });

    it('should log UPDATE mapping action', async () => {
      await service.logMappingAction({
        action: 'UPDATE',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        mappingName: 'PaymentMapping',
        endpointName: '/api/payment',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'UPDATE',
        entityType: 'MAPPING',
        actor: 'editor@example.com',
        tenantId: 'tenant-001',
        endpointName: '/api/payment',
        mappingName: 'PaymentMapping',
        version: undefined,
      });
    });

    it('should log DELETE mapping action', async () => {
      await service.logMappingAction({
        action: 'DELETE',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        mappingName: 'OldMapping',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'DELETE',
        entityType: 'MAPPING',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        endpointName: undefined,
        mappingName: 'OldMapping',
        version: undefined,
      });
    });

    it('should log APPROVE mapping action', async () => {
      await service.logMappingAction({
        action: 'APPROVE',
        actor: 'approver@example.com',
        tenantId: 'tenant-001',
        mappingName: 'PaymentMapping',
        version: '2.0',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'APPROVE',
        entityType: 'MAPPING',
        actor: 'approver@example.com',
        tenantId: 'tenant-001',
        endpointName: undefined,
        mappingName: 'PaymentMapping',
        version: '2.0',
      });
    });

    it('should log PUBLISH mapping action', async () => {
      await service.logMappingAction({
        action: 'PUBLISH',
        actor: 'publisher@example.com',
        tenantId: 'tenant-001',
        mappingName: 'PaymentMapping',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'PUBLISH',
        entityType: 'MAPPING',
        actor: 'publisher@example.com',
        tenantId: 'tenant-001',
        endpointName: undefined,
        mappingName: 'PaymentMapping',
        version: undefined,
      });
    });

    it('should log ROLLBACK mapping action', async () => {
      await service.logMappingAction({
        action: 'ROLLBACK',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        mappingName: 'PaymentMapping',
        version: '1.0',
      });

      expect(mockDbService.logAction).toHaveBeenCalledWith({
        action: 'ROLLBACK',
        entityType: 'MAPPING',
        actor: 'admin@example.com',
        tenantId: 'tenant-001',
        endpointName: undefined,
        mappingName: 'PaymentMapping',
        version: '1.0',
      });
    });
  });

  describe('getAuditLogsByName', () => {
    it('should call dbService.getAuditLogsByName with default limit', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE', mappingName: 'TestMapping' },
      ];
      mockDbService.getAuditLogsByName.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogsByName(
        'TestMapping',
        'tenant-001',
      );

      expect(mockDbService.getAuditLogsByName).toHaveBeenCalledWith(
        'TestMapping',
        'tenant-001',
        100,
      );
      expect(result).toEqual(mockLogs);
    });

    it('should call dbService.getAuditLogsByName with custom limit', async () => {
      const mockLogs = [
        { id: 1, action: 'CREATE' },
        { id: 2, action: 'UPDATE' },
      ];
      mockDbService.getAuditLogsByName.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogsByName(
        'PaymentMapping',
        'tenant-001',
        50,
      );

      expect(mockDbService.getAuditLogsByName).toHaveBeenCalledWith(
        'PaymentMapping',
        'tenant-001',
        50,
      );
      expect(result).toEqual(mockLogs);
    });

    it('should retrieve logs by endpoint name', async () => {
      const mockLogs = [{ id: 1, endpointName: '/api/payment' }];
      mockDbService.getAuditLogsByName.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogsByName(
        '/api/payment',
        'tenant-001',
        25,
      );

      expect(mockDbService.getAuditLogsByName).toHaveBeenCalledWith(
        '/api/payment',
        'tenant-001',
        25,
      );
      expect(result).toEqual(mockLogs);
    });
  });
});
