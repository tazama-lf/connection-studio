import './jest.setup'; // Load environment variables first
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { AuditService } from '../audit/audit.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { SchemaInferenceService } from '../schemas/schema-inference.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { SftpService } from '../sftp/sftp.service';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PayloadParsingService } from '../services/payload-parsing.service';
import { NotificationService } from '../notification/notification.service';
import { DatabaseService } from '@tazama-lf/tcs-lib';
import { NotifyService } from '../notify/notify.service';

describe('Data Type Validation for Mappings', () => {
  let service: ConfigService;
  let tazamaDataModelService: jest.Mocked<TazamaDataModelService>;

  const mockSchema = {
    type: 'object',
    properties: {
      stringField: { type: 'string' },
      numberField: { type: 'number' },
      booleanField: { type: 'boolean' },
      arrayField: {
        type: 'array',
        items: { type: 'string' },
      },
      objectField: {
        type: 'object',
        properties: {
          nestedString: { type: 'string' },
        },
      },
      teams: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            teamId: { type: 'string' },
            memberCount: { type: 'number' },
          },
        },
      },
    },
  };

  const mockConfig = {
    id: 1,
    msgFam: 'test',
    transactionType: 'test',
    endpointPath: '/test',
    version: 'v1',
    contentType: 'application/json' as const,
    schema: mockSchema,
    mapping: [],
    functions: [],
    tenantId: 'test-tenant',
    createdBy: 'test-user',
  };

  beforeEach(async () => {
    const mockConfigRepository = {
      findConfigById: jest.fn().mockResolvedValue(mockConfig),
      updateConfig: jest.fn().mockResolvedValue(undefined),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const mockTazamaDataModelService = {
      isValidDestinationPath: jest.fn().mockReturnValue(true),
      getFieldType: jest.fn(),
    };

    const mockJsonSchemaConverterService = {
      convertFromJSONSchema: jest.fn(),
      convertToJSONSchema: jest.fn(),
    };

    const mockConfigWorkflowService = {
      updateStatus: jest.fn(),
      isStatusTransitionAllowed: jest.fn(),
    };

    const mockSchemaInferenceService = {
      inferSchema: jest.fn(),
      validateFields: jest.fn(),
    };

    const mockSftpService = {
      createFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const mockNestConfigService = {
      get: jest.fn().mockReturnValue('test'),
    };

    const mockPayloadParsingService = {
      parsePayload: jest.fn(),
    };

    const mockNotificationService = {
      sendEmail: jest.fn(),
    };

    const mockDatabaseService = {
      query: jest.fn(),
    };

    const mockNotifyService = {
      notify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: ConfigRepository, useValue: mockConfigRepository },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: TazamaDataModelService,
          useValue: mockTazamaDataModelService,
        },
        {
          provide: JSONSchemaConverterService,
          useValue: mockJsonSchemaConverterService,
        },
        { provide: ConfigWorkflowService, useValue: mockConfigWorkflowService },
        {
          provide: SchemaInferenceService,
          useValue: mockSchemaInferenceService,
        },
        { provide: SftpService, useValue: mockSftpService },
        { provide: NestConfigService, useValue: mockNestConfigService },
        { provide: PayloadParsingService, useValue: mockPayloadParsingService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotifyService, useValue: mockNotifyService },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    tazamaDataModelService = module.get(TazamaDataModelService);
  });

  describe('Strict Type Validation', () => {
    it('should allow string to string mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });

    it('should reject string to number mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const stringToNumber = {
        source: 'stringField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          stringToNumber,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Direct mapping type mismatch.*string.*number/);
    });

    it('should reject number to string mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'numberField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Direct mapping type mismatch.*number.*string/);
    });

    it('should reject boolean to string mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'booleanField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Direct mapping type mismatch.*boolean.*string/);
    });

    it('should allow number to number mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'numberField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });

    it('should allow array to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'arrayField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Incompatible Type Mappings (Should Fail)', () => {
    it('should reject array to string mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'arrayField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Direct mapping type mismatch.*array.*string/);
    });

    it('should reject array to number mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'arrayField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject string to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Direct mapping type mismatch.*string.*array/);
    });

    it('should reject object to string mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'objectField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject number to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'numberField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Array Path Type Detection', () => {
    it('should correctly identify array element types', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'teams[0].teamId',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });

    it('should correctly identify array element types with dot notation', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'teams.0.memberCount',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });

    it('should reject incompatible array element mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'teams[0].teamId', // string field
        destination: 'transactionDetails.source', // array field
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Constants and Special Cases', () => {
    it('should validate constant mappings type compatibility', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        constantValue: 'some constant', // string constant
        destination: 'transactionDetails.source', // number field
      };

      // Should reject string constant to number field
      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).rejects.toThrow(/Constant value type mismatch/);
    });

    it('should handle missing destination type gracefully', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue(null);

      const mappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.source',
      };

      await expect(
        service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Error Messages', () => {
    it('should provide detailed error message for type mismatch', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.source',
      };

      try {
        await service.addMapping(
          1,
          mappingDto,
          'test-tenant',
          'test-user',
          'mock-token',
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Direct mapping type mismatch');
        expect(error.message).toContain('stringField');
        expect(error.message).toContain('string');
        expect(error.message).toContain('transactionDetails.source');
        expect(error.message).toContain('array');
        expect(error.message).toContain('STRICT TYPE MATCHING');
      }
    });
  });
});

console.log('Data type validation tests completed');


