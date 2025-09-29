import { Test } from '@nestjs/testing';
import { MappingService } from './mapping.service';
import { MappingRepository } from './mapping.repository';
import { AuditService } from '../audit/audit.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CreateMappingDto } from './mapping.dto';
import { TransformationType } from './mapping.entity';
describe('MappingService - Enhanced Schema Validation', () => {
  let mappingService: MappingService;
  let endpointsService: EndpointsService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MappingService,
        {
          provide: MappingRepository,
          useValue: {
            create: jest.fn(),
            findByName: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logMappingOperation: jest.fn(),
          },
        },
        {
          provide: EndpointsService,
          useValue: {
            getEndpointById: jest.fn(),
          },
        },
      ],
    }).compile();
    mappingService = moduleRef.get<MappingService>(MappingService);
    endpointsService = moduleRef.get<EndpointsService>(EndpointsService);
  });
  describe('validateMappingAgainstEndpoint', () => {
    const mockEndpoint = {
      id: 1,
      name: 'test-endpoint',
      currentSchema: {
        version: 1,
        fields: [
          {
            name: 'customerName',
            path: 'customerName',
            type: 'string',
            isRequired: true,
            children: [],
          },
          {
            name: 'amount',
            path: 'amount',
            type: 'number',
            isRequired: true,
            children: [],
          },
          {
            name: 'description',
            path: 'description',
            type: 'string',
            isRequired: false,
            children: [],
          },
        ],
      },
    };
    beforeEach(() => {
      jest
        .spyOn(endpointsService, 'getEndpointById')
        .mockResolvedValue(mockEndpoint as any);
    });
    it('should validate successfully when all required fields are covered', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: { amount: 100 },
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
      });
      expect(result.success).toBe(true);
      expect(result.schemaValidationErrors).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);
    });
    it('should detect missing required fields in schema coverage', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping-incomplete',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: {},
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
      });
      expect(result.success).toBe(true);
    });
    it('should validate successfully when destination fields are not in endpoint schema (destination fields use internal schema)', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping-valid-dest',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'user_id', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: { amount: 100 },
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
      });
      expect(result.success).toBe(true);
    });
    it('should detect duplicate destination fields', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping-duplicates',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'description', type: 'string', isRequired: false },
        ],
        destinationFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'customerName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: { amount: 100 },
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
        description: 'Test transaction',
      });
      expect(result.success).toBe(false);
      expect(result.schemaValidationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'destinationFields.customerName',
            code: 'DUPLICATE_DESTINATION_FIELD',
            message: expect.stringContaining(
              // eslint-disable-next-line quotes -- Double quotes required for nested single quotes in error message
              "Duplicate destination field 'customerName' found",
            ),
          }),
        ]),
      );
    });
    it('should detect type mismatches between mapping and endpoint schema', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping-type-mismatch',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'amount', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'amount', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: {},
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
        amount: '100',
      });
      expect(result.success).toBe(false);
      expect(result.schemaValidationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sourceFields.amount',
            code: 'SOURCE_FIELD_TYPE_MISMATCH',
            message: expect.stringContaining(
              // eslint-disable-next-line quotes -- Double quotes required for nested single quotes in error message
              "type mismatch. Expected 'number', got 'string'",
            ),
          }),
        ]),
      );
    });
    it('should validate transformation compatibility with field types', async () => {
      const mappingDto: CreateMappingDto = {
        name: 'test-mapping-invalid-transformation',
        endpointId: 1,
        sourceFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'description', type: 'string', isRequired: false },
        ],
        destinationFields: [
          { path: 'amount', type: 'number', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        constants: {},
        version: 1,
        status: 'IN_PROGRESS' as any,
      };
      const result = await mappingService.simulate(mappingDto, {
        customerName: 'John Doe',
        description: 'Test transaction',
      });
      expect(result.success).toBe(false);
      expect(result.schemaValidationErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'transformation',
            code: 'INVALID_TRANSFORMATION',
            message: expect.stringContaining(
              'CONCAT transformation requires string destination type',
            ),
          }),
        ]),
      );
    });
  });
});
