import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { AddMappingDto } from './config.interfaces';

describe('Enhanced Mapping Type Validation', () => {
  let service: ConfigService;
  let repository: ConfigRepository;
  let tazamaDataModelService: TazamaDataModelService;

  const mockConfig = {
    id: 1,
    name: 'Test Config',
    status: 'in progress',
    data_model_id: 1,
    schema: {
      type: 'object',
      properties: {
        stringField: { type: 'string' },
        numberField: { type: 'number' },
        booleanField: { type: 'boolean' },
        arrayField: { type: 'array', items: { type: 'string' } },
        objectField: {
          type: 'object',
          properties: {
            nestedString: { type: 'string' },
            nestedNumber: { type: 'number' },
          },
        },
        anotherNumber: { type: 'number' }, // Add this field to avoid test issues
      } as any,
    } as any,
    mapping: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: ConfigRepository,
          useValue: {
            findConfigById: jest.fn(),
            updateConfig: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
        {
          provide: JSONSchemaConverterService,
          useValue: {},
        },
        {
          provide: TazamaDataModelService,
          useValue: {
            isValidDestinationPath: jest.fn().mockReturnValue(true),
            getFieldType: jest.fn(),
          },
        },
        {
          provide: ConfigWorkflowService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    repository = module.get<ConfigRepository>(ConfigRepository);
    tazamaDataModelService = module.get<TazamaDataModelService>(
      TazamaDataModelService,
    );

    repository.findConfigById = jest.fn().mockResolvedValue(mockConfig);
  });

  describe('CONCAT Transformation Type Validation', () => {
    it('should allow CONCAT with only string sources to string destination', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['stringField', 'stringField'], // Only string sources allowed now
        destination: 'transactionDetails.description',
        transformation: 'CONCAT',
        delimiter: ' ',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject CONCAT with non-string sources', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['stringField', 'numberField'], // numberField not allowed in strict mode
        destination: 'transactionDetails.description',
        transformation: 'CONCAT',
        delimiter: ' ',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Source field 'numberField' of type 'number' cannot be concatenated",
      );
    });

    it('should reject CONCAT to non-string destination', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sources: ['stringField', 'numberField'],
        destination: 'transactionDetails.amount',
        transformation: 'CONCAT',
        delimiter: ' ',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'CONCAT transformation type mismatch: CONCAT operations always produce string results',
      );
    });

    it('should reject CONCAT with non-string-convertible sources', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['stringField', 'arrayField'],
        destination: 'transactionDetails.description',
        transformation: 'CONCAT',
        delimiter: ' ',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Source field 'arrayField' of type 'array' cannot be concatenated",
      );
    });
  });

  describe('SUM Transformation Type Validation', () => {
    it('should allow SUM with numeric sources to numeric destination', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sumFields: ['numberField', 'anotherNumber'],
        destination: 'transactionDetails.amount',
        transformation: 'SUM',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject SUM with numeric sources to string destination (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sumFields: ['numberField', 'anotherNumber'],
        destination: 'transactionDetails.description',
        transformation: 'SUM',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow("Destination field must be of type 'number'");
    });

    it('should reject SUM with non-numeric sources', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sumFields: ['stringField', 'numberField'],
        destination: 'transactionDetails.amount',
        transformation: 'SUM',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Source field 'stringField' of type 'string' cannot be summed",
      );
    });

    it('should reject SUM to boolean destination (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest
        .fn()
        .mockReturnValue('BOOLEAN');

      const dto: AddMappingDto = {
        sumFields: ['numberField', 'anotherNumber'],
        destination: 'transactionDetails.flag',
        transformation: 'SUM',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'SUM transformation type mismatch: SUM operations produce numeric results',
      );
    });
  });

  describe('MATH Transformation Type Validation', () => {
    it('should allow MATH with numeric sources and valid operator', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sources: ['numberField', 'anotherNumber'],
        destination: 'transactionDetails.amount',
        transformation: 'MATH',
        operator: 'ADD',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject MATH with non-numeric sources', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sources: ['stringField', 'numberField'],
        destination: 'transactionDetails.amount',
        transformation: 'MATH',
        operator: 'ADD',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Source field 'stringField' of type 'string' cannot be used in mathematical operations",
      );
    });

    it('should reject MATH without operator', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        sources: ['numberField', 'anotherNumber'],
        destination: 'transactionDetails.amount',
        transformation: 'MATH',
        // operator missing
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'MATH transformation requires an operator (ADD, SUBTRACT, MULTIPLY, DIVIDE)',
      );
    });
  });

  describe('SPLIT Transformation Type Validation', () => {
    it('should allow SPLIT with string source to string destination', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'stringField',
        destinations: [
          'transactionDetails.field1',
          'transactionDetails.field2',
        ],
        transformation: 'SPLIT',
        delimiter: ',',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject SPLIT with non-string source', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'numberField',
        destinations: [
          'transactionDetails.field1',
          'transactionDetails.field2',
        ],
        transformation: 'SPLIT',
        delimiter: ',',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Source field 'numberField' of type 'number' cannot be split",
      );
    });

    it('should reject SPLIT to non-string destination (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('ARRAY');

      const dto: AddMappingDto = {
        source: 'stringField',
        destinations: ['transactionDetails.arrayField'],
        transformation: 'SPLIT',
        delimiter: ',',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow("Destination field must be of type 'string'");
    });
  });

  describe('Direct Mapping (NONE) Type Validation', () => {
    it('should allow compatible direct mappings', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.description',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject number to string direct mapping (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'numberField',
        destination: 'transactionDetails.description',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'STRICT TYPE MATCHING: Only exact type matches are allowed',
      );
    });

    it('should reject incompatible direct mappings', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('ARRAY');

      const dto: AddMappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.arrayField',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Direct mapping type mismatch: Cannot map source field 'stringField' of type 'string' to destination field 'transactionDetails.arrayField' of type 'array'",
      );
    });
  });

  describe('CONSTANT Transformation Type Validation', () => {
    it('should allow compatible constant mappings', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        constantValue: 'test value',
        destination: 'transactionDetails.description',
        transformation: 'CONSTANT',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject number constant to string destination (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        constantValue: 123,
        destination: 'transactionDetails.description',
        transformation: 'CONSTANT',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Cannot assign constant value '123' of type 'number' to destination field",
      );
    });

    it('should reject incompatible constant mappings', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('ARRAY');

      const dto: AddMappingDto = {
        constantValue: 'test value',
        destination: 'transactionDetails.arrayField',
        transformation: 'CONSTANT',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        "Constant value type mismatch: Cannot assign constant value 'test value' of type 'string' to destination field 'transactionDetails.arrayField' of type 'array'",
      );
    });
  });

  describe('Complex Type Restrictions', () => {
    it('should reject array to non-array mapping', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'arrayField',
        destination: 'transactionDetails.description',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(/type mismatch.*array.*string/);
    });

    it('should reject object to non-object mapping', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'objectField',
        destination: 'transactionDetails.description',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(/type mismatch.*object.*string/);
    });
  });
});
