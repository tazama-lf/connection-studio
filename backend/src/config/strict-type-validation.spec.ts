import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import { ConfigWorkflowService } from './config-workflow.service';
import { AddMappingDto } from './config.interfaces';

describe('Strict Type Validation', () => {
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

  describe('Strict Type Rules', () => {
    it('should allow exact type matches: string to string', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'stringField',
        destination: 'transactionDetails.description',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should allow exact type matches: number to number', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        source: 'numberField',
        destination: 'transactionDetails.Amt', // Now number type
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject string to number mapping (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        source: 'stringField', // string
        destination: 'transactionDetails.Amt', // number
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'STRICT TYPE MATCHING: Only exact type matches are allowed',
      );
    });

    it('should reject number to string mapping (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        source: 'numberField', // number
        destination: 'transactionDetails.description', // string
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'STRICT TYPE MATCHING: Only exact type matches are allowed',
      );
    });

    it('should require string sources for CONCAT transformation', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['stringField', 'numberField'], // numberField not allowed
        destination: 'transactionDetails.description',
        transformation: 'CONCAT',
        delimiter: ' ',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        // eslint-disable-next-line quotes
        "Source field 'numberField' of type 'number' cannot be concatenated",
      );
    });

    it('should require number destination for SUM transformation', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['numberField'],
        destination: 'transactionDetails.stringField',
        transformation: 'SUM',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
        // eslint-disable-next-line quotes
      ).rejects.toThrow("Destination field must be of type 'number'");
    });

    it('should require number destination for MATH transformation', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('STRING');

      const dto: AddMappingDto = {
        sources: ['numberField'],
        destination: 'transactionDetails.description', // string destination not allowed
        transformation: 'MATH',
        operator: 'ADD',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
        // eslint-disable-next-line quotes
      ).rejects.toThrow("Destination field must be of type 'number'");
    });

    it('should require string destination for SPLIT transformation', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        source: 'stringField',
        destinations: ['transactionDetails.Amt'], // number destination not allowed
        transformation: 'SPLIT',
        delimiter: ',',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
        // eslint-disable-next-line quotes
      ).rejects.toThrow("Destination field must be of type 'string'");
    });
  });

  describe('Constant Value Strict Validation', () => {
    it('should allow string constant to string destination', async () => {
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

    it('should allow number constant to number destination', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        constantValue: 123.45,
        destination: 'transactionDetails.Amt',
        transformation: 'CONSTANT',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).resolves.not.toThrow();
    });

    it('should reject string constant to number destination (strict mode)', async () => {
      tazamaDataModelService.getFieldType = jest.fn().mockReturnValue('NUMBER');

      const dto: AddMappingDto = {
        constantValue: 'not a number',
        destination: 'transactionDetails.Amt',
        transformation: 'CONSTANT',
      };

      await expect(
        service.addMapping(1, dto, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Cannot assign constant value');
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
      ).rejects.toThrow('Cannot assign constant value');
    });
  });
});
