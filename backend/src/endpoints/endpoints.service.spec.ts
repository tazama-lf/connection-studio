import { Test, TestingModule } from '@nestjs/testing';
import { EndpointsService } from './endpoints.service';
import { EndpointsRepository } from './endpoints.repository';
import { SchemaInferenceService } from '../schemas/schema-inference.service';
import { AuditService } from '../audit/audit.service';
import { CreateEndpointDto, InferSchemaDto } from '../common/dto';
import { ContentType, HttpMethod, TransactionType } from '../common/interfaces';
import { FieldType, SchemaField } from '../common/interfaces';

describe('EndpointsService', () => {
  let service: EndpointsService;
  let endpointsRepository: EndpointsRepository;
  let schemaInferenceService: SchemaInferenceService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndpointsService,
        {
          provide: EndpointsRepository,
          useValue: {
            createEndpoint: jest.fn(),
            createSchemaVersion: jest.fn(),
            findEndpointById: jest.fn(),
            getLatestSchemaVersion: jest.fn(),
          },
        },
        {
          provide: SchemaInferenceService,
          useValue: {
            inferSchemaFromPayload: jest.fn(),
            validateSchema: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logSchemaInferred: jest.fn(),
            logEndpointCreated: jest.fn(),
            logSchemaValidated: jest.fn(),
            logDraftSaved: jest.fn(),
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EndpointsService>(EndpointsService);
    endpointsRepository = module.get<EndpointsRepository>(EndpointsRepository);
    schemaInferenceService = module.get<SchemaInferenceService>(
      SchemaInferenceService,
    );
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should infer schema from payload', async () => {
    const dto: InferSchemaDto = {
      payload: '{"foo":1}',
      contentType: ContentType.JSON,
    };
    (
      schemaInferenceService.inferSchemaFromPayload as jest.Mock
    ).mockResolvedValue([
      { name: 'foo', path: 'foo', type: 'number', isRequired: true },
    ]);
    const result = await service.inferSchemaFromPayload(dto, 'editor1');
    expect(result).toEqual([
      { name: 'foo', path: 'foo', type: 'number', isRequired: true },
    ]);
    expect(auditService.logSchemaInferred).toHaveBeenCalled();
  });

  it('should create endpoint and validate schema', async () => {
    const dto: CreateEndpointDto = {
      path: '/test',
      method: HttpMethod.POST,
      version: 'v1',
      transactionType: TransactionType.TRANSFERS,
      description: 'desc',
      samplePayload: '{"foo":1}',
      contentType: ContentType.JSON,
    };
    (
      schemaInferenceService.inferSchemaFromPayload as jest.Mock
    ).mockResolvedValue([
      { name: 'foo', path: 'foo', type: 'number', isRequired: true },
    ]);
    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });
    (endpointsRepository.createEndpoint as jest.Mock).mockResolvedValue(1);
    (endpointsRepository.createSchemaVersion as jest.Mock).mockResolvedValue(1);
    const result = await service.createEndpoint(dto, 'editor1', 'test-tenant');
    expect(result.endpointId).toBe(1);
    expect(result.schema).toEqual([
      { name: 'foo', path: 'foo', type: 'number', isRequired: true },
    ]);
    expect(auditService.logEndpointCreated).toHaveBeenCalled();
  });

  it('should throw error if schema validation fails on create', async () => {
    const dto: CreateEndpointDto = {
      path: '/test',
      method: HttpMethod.POST,
      version: 'v1',
      transactionType: TransactionType.TRANSFERS,
      description: 'desc',
      samplePayload: '{"foo":1}',
      contentType: ContentType.JSON,
    };
    (
      schemaInferenceService.inferSchemaFromPayload as jest.Mock
    ).mockResolvedValue([
      { name: 'foo', path: 'foo', type: 'number', isRequired: true },
    ]);
    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: false,
      errors: ['bad'],
    });
    await expect(
      service.createEndpoint(dto, 'editor1', 'test-tenant'),
    ).rejects.toThrow(/Schema validation failed/);
  });

  it('should validate schema with duplicate path detection', async () => {
    const fields: SchemaField[] = [
      {
        name: 'name',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'name2',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
    ];

    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: false,
      // eslint-disable-next-line quotes
      errors: ["Duplicate field path 'user.name' detected."],
    });

    const result = await service.validateSchema(fields, 'editor1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      // eslint-disable-next-line quotes
      "Duplicate field path 'user.name' detected.",
    );
    expect(auditService.logSchemaValidated).toHaveBeenCalledWith(
      'editor1',
      'manual-validation',
      'system',
    );
  });

  it('should validate schema with path conflicts', async () => {
    const fields: SchemaField[] = [
      {
        name: 'user',
        path: 'user',
        type: FieldType.STRING,
        isRequired: true,
      },
      {
        name: 'name',
        path: 'user.name',
        type: FieldType.STRING,
        isRequired: true,
      },
    ];

    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: false,
      errors: [
        // eslint-disable-next-line quotes
        "Path conflict - 'user' cannot be type 'string' because child path 'user.name' exists.",
      ],
    });

    const result = await service.validateSchema(fields, 'editor1');
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Path conflict');
  });

  it('should save draft only with valid schema', async () => {
    const validSchema: any[] = [
      { name: 'name', path: 'name', type: 'string', isRequired: true },
    ];

    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });
    (endpointsRepository.createSchemaVersion as jest.Mock).mockResolvedValue(1);

    await service.saveEndpointDraft(
      1,
      validSchema,
      'Test notes',
      'editor1',
      'test-tenant',
    );

    expect(endpointsRepository.createSchemaVersion).toHaveBeenCalledWith(
      1,
      validSchema,
      'editor1',
      'test-tenant',
    );
    expect(auditService.logDraftSaved).toHaveBeenCalledWith(
      'editor1',
      'endpoint-1',
      'test-tenant',
    );
  });

  it('should reject saving draft with invalid schema', async () => {
    const invalidSchema: any[] = [
      { name: '', path: '', type: 'string', isRequired: true },
    ];

    (schemaInferenceService.validateSchema as jest.Mock).mockReturnValue({
      isValid: false,
      errors: ['Field has empty name'],
    });

    await expect(
      service.saveEndpointDraft(
        1,
        invalidSchema,
        'Test notes',
        'editor1',
        'test-tenant',
      ),
    ).rejects.toThrow(/Cannot save draft with invalid schema/);
  });

  it('should handle complex schema inference with nested objects', async () => {
    const dto: InferSchemaDto = {
      payload: JSON.stringify({
        transaction: {
          id: 'txn-123',
          participants: [{ name: 'Alice', role: 'sender' }],
        },
      }),
      contentType: ContentType.JSON,
    };

    const complexSchema = [
      {
        name: 'transaction',
        path: 'transaction',
        type: 'object',
        isRequired: true,
        children: [
          {
            name: 'id',
            path: 'transaction.id',
            type: 'string',
            isRequired: true,
          },
          {
            name: 'participants',
            path: 'transaction.participants',
            type: 'array',
            isRequired: true,
            arrayElementType: 'object',
            children: [
              {
                name: 'name',
                path: 'transaction.participants[0].name',
                type: 'string',
                isRequired: true,
              },
              {
                name: 'role',
                path: 'transaction.participants[0].role',
                type: 'string',
                isRequired: true,
              },
            ],
          },
        ],
      },
    ];

    (
      schemaInferenceService.inferSchemaFromPayload as jest.Mock
    ).mockResolvedValue(complexSchema);

    const result = await service.inferSchemaFromPayload(dto, 'editor1');
    expect(result).toEqual(complexSchema);
    expect(auditService.logSchemaInferred).toHaveBeenCalledWith(
      'editor1',
      'temp',
      'system',
    );
  });
});
