import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { AuditService } from '../audit/audit.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { BadRequestException } from '@nestjs/common';

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
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });

    it('should reject string to number mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'stringField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Direct mapping type mismatch.*string.*number/);
    });

    it('should reject number to string mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'numberField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Direct mapping type mismatch.*number.*string/);
    });

    it('should reject boolean to string mapping (strict typing)', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'booleanField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Direct mapping type mismatch.*boolean.*string/);
    });

    it('should allow number to number mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'numberField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });

    it('should allow array to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'arrayField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });
  });

  describe('Incompatible Type Mappings (Should Fail)', () => {
    it('should reject array to string mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'arrayField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Direct mapping type mismatch.*array.*string/);
    });

    it('should reject array to number mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'arrayField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject string to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'stringField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Direct mapping type mismatch.*string.*array/);
    });

    it('should reject object to string mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'objectField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject number to array mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'numberField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Array Path Type Detection', () => {
    it('should correctly identify array element types', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('STRING');

      const mappingDto = {
        source: 'teams[0].teamId',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });

    it('should correctly identify array element types with dot notation', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        source: 'teams.0.memberCount',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });

    it('should reject incompatible array element mapping', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'teams[0].teamId', // string field
        destination: 'entities.id', // array field
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Constants and Special Cases', () => {
    it('should validate constant mappings type compatibility', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('NUMBER');

      const mappingDto = {
        constantValue: 'some constant', // string constant
        destination: 'entities.id', // number field
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).rejects.toThrow(/Constant value type mismatch/);
    });

    it('should handle missing destination type gracefully', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue(null);

      const mappingDto = {
        source: 'stringField',
        destination: 'entities.id',
      };

      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'test-user'),
      ).resolves.toBeDefined();
    });
  });

  describe('Error Messages', () => {
    it('should provide detailed error message for type mismatch', async () => {
      tazamaDataModelService.getFieldType.mockReturnValue('ARRAY');

      const mappingDto = {
        source: 'stringField',
        destination: 'entities.id',
      };

      try {
        await service.addMapping(1, mappingDto, 'test-tenant', 'test-user');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Direct mapping type mismatch');
        expect(error.message).toContain('stringField');
        expect(error.message).toContain('string');
        expect(error.message).toContain('entities.id');
        expect(error.message).toContain('array');
        expect(error.message).toContain('STRICT TYPE MATCHING');
      }
    });
  });
});

console.log('✓ Data type validation tests completed');
