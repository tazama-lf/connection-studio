import { Test, TestingModule } from '@nestjs/testing';
import { EndpointsService } from './endpoints.service';
import { EndpointsRepository } from './endpoints.repository';
import { PayloadParsingService } from './payload-parsing.service';
import { AuditService } from '../audit/audit.service';
import {
  ParsePayloadDto,
  CreateEndpointWithSchemaDto,
} from '../common/schema-workflow.dto';
import {
  ContentType,
  HttpMethod,
  TransactionType,
  FieldType,
  EndpointStatus,
  SchemaField,
  Endpoint,
} from '../common/interfaces';

describe('EndpointsService', () => {
  let service: EndpointsService;
  let endpointsRepository: jest.Mocked<EndpointsRepository>;
  let payloadParsingService: jest.Mocked<PayloadParsingService>;

  const mockSchemaFields: SchemaField[] = [
    {
      name: 'amount',
      path: 'amount',
      type: FieldType.NUMBER,
      isRequired: true,
      children: undefined,
    },
  ];

  const mockEndpoint: Endpoint = {
    id: 1,
    path: '/test',
    method: HttpMethod.POST,
    version: 'v1',
    transactionType: TransactionType.TRANSFERS,
    status: EndpointStatus.DEPLOYED,
    description: 'Test endpoint',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: 'test-tenant',
    schemaJson: {
      sourceFields: mockSchemaFields,
      version: 1,
      lastUpdated: new Date(),
      createdBy: 'user-1',
    },
  };

  beforeEach(async () => {
    const mockEndpointsRepository = {
      createEndpoint: jest.fn(),
      findEndpointById: jest.fn(),
      updateEndpoint: jest.fn(),
      deleteEndpoint: jest.fn(),
      findEndpointsByTenant: jest.fn(),
    };

    const mockPayloadParsingService = {
      parsePayloadToSchema: jest.fn(),
      applyFieldAdjustments: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndpointsService,
        {
          provide: EndpointsRepository,
          useValue: mockEndpointsRepository,
        },
        {
          provide: PayloadParsingService,
          useValue: mockPayloadParsingService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<EndpointsService>(EndpointsService);
    endpointsRepository = module.get(EndpointsRepository);
    payloadParsingService = module.get(PayloadParsingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parsePayloadAndGenerateSchema', () => {
    it('should parse payload and return schema', async () => {
      const dto: ParsePayloadDto = {
        payload: '{"amount":100}',
        contentType: ContentType.JSON,
      };

      const mockResult = {
        success: true,
        sourceFields: mockSchemaFields,
        metadata: {
          totalFields: 1,
          requiredFields: 1,
          optionalFields: 0,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: {
          success: true,
          errors: [],
          warnings: [],
        },
      };

      payloadParsingService.parsePayloadToSchema.mockResolvedValue(mockResult);

      const result = await service.parsePayloadAndGenerateSchema(
        dto,
        'test-tenant',
      );

      expect(result.schema?.sourceFields).toEqual(mockSchemaFields);
      expect(result.success).toBe(true);
      expect(payloadParsingService.parsePayloadToSchema).toHaveBeenCalledWith(
        '{"amount":100}',
        ContentType.JSON,
        undefined,
      );
    });

    it('should handle parsing errors', async () => {
      const dto: ParsePayloadDto = {
        payload: 'invalid json',
        contentType: ContentType.JSON,
      };

      const mockResult = {
        success: false,
        sourceFields: [],
        metadata: {
          totalFields: 0,
          requiredFields: 0,
          optionalFields: 0,
          nestedLevels: 0,
          originalSize: 0,
          processingTime: 0,
        },
        validation: {
          success: false,
          errors: ['Invalid JSON format'],
          warnings: [],
        },
      };

      payloadParsingService.parsePayloadToSchema.mockResolvedValue(mockResult);

      const result = await service.parsePayloadAndGenerateSchema(
        dto,
        'test-tenant',
      );

      expect(result.validation.errors).toContain('Invalid JSON format');
      expect(result.success).toBe(false);
    });
  });

  describe('createEndpointWithGeneratedSchema', () => {
    it('should create endpoint with schema', async () => {
      const dto: CreateEndpointWithSchemaDto = {
        name: 'Test Endpoint',
        path: '/test',
        method: HttpMethod.POST,
        version: 'v1',
        transactionType: TransactionType.TRANSFERS,
        payload: '{"amount":100}',
        contentType: ContentType.JSON,
      };

      const mockParseResult = {
        success: true,
        sourceFields: mockSchemaFields,
        metadata: {
          totalFields: 1,
          requiredFields: 1,
          optionalFields: 0,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: {
          success: true,
          errors: [],
          warnings: [],
        },
      };

      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        mockParseResult,
      );
      endpointsRepository.createEndpoint.mockResolvedValue(1);

      const result = await service.createEndpointWithGeneratedSchema(
        dto,
        'test-tenant',
        'user-1',
      );

      expect(result.endpointId).toBe(1);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Endpoint created successfully');
      expect(endpointsRepository.createEndpoint).toHaveBeenCalled();
    });

    it('should return error when parsing fails', async () => {
      const dto: CreateEndpointWithSchemaDto = {
        name: 'Test Endpoint',
        path: '/test',
        method: HttpMethod.POST,
        version: 'v1',
        transactionType: TransactionType.TRANSFERS,
        payload: 'invalid',
        contentType: ContentType.JSON,
      };

      const mockParseResult = {
        success: false,
        sourceFields: [],
        metadata: {
          totalFields: 0,
          requiredFields: 0,
          optionalFields: 0,
          nestedLevels: 0,
          originalSize: 0,
          processingTime: 0,
        },
        validation: {
          success: false,
          errors: ['Parse error'],
          warnings: [],
        },
      };

      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        mockParseResult,
      );

      const result = await service.createEndpointWithGeneratedSchema(
        dto,
        'test-tenant',
        'user-1',
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to parse payload');
    });
  });

  describe('getEndpointById', () => {
    it('should return endpoint by id', async () => {
      endpointsRepository.findEndpointById.mockResolvedValue(mockEndpoint);

      const result = await service.getEndpointById(1, 'test-tenant');

      expect(result).toEqual(mockEndpoint);
      expect(endpointsRepository.findEndpointById).toHaveBeenCalledWith(
        1,
        'test-tenant',
      );
    });

    it('should return null if endpoint not found', async () => {
      endpointsRepository.findEndpointById.mockResolvedValue(null);

      const result = await service.getEndpointById(999, 'test-tenant');

      expect(result).toBeNull();
    });
  });
});
