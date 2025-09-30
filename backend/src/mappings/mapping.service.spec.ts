import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MappingService } from './mapping.service';
import { MappingRepository } from './mapping.repository';
import { MappingStatus, TransformationType } from './mapping.entity';
import { AuditService } from '../audit/audit.service';
import { EndpointsService } from '../endpoints/endpoints.service';
describe('MappingService', () => {
  let service: MappingService;
  const mockMappingRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findLatestByName: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getNextVersion: jest.fn(),
  };
  const mockAuditService = {
    logMappingAction: jest.fn(),
    getMappingAuditLogs: jest.fn(),
    getAuditLogsByAction: jest.fn(),
    getAuditLogsByActor: jest.fn(),
  };
  const mockEndpointsService = {
    getEndpointById: jest.fn(),
    getSchemaFields: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingService,
        {
          provide: MappingRepository,
          useValue: mockMappingRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EndpointsService,
          useValue: mockEndpointsService,
        },
      ],
    }).compile();
    service = module.get<MappingService>(MappingService);
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('simulate', () => {
    it('should successfully simulate a simple NONE transformation', async () => {
      const mappingDto = {
        name: 'Test Simulation',
        sourceFields: [
          { path: 'firstName', type: 'string', isRequired: true },
          { path: 'lastName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        fullName: 'John',
      });
      expect(result.validationErrors).toHaveLength(0);
      expect(result.transformationDetails.fieldsProcessed).toBe(1);
      expect(result.transformationDetails.appliedTransformations).toContain(
        'NONE: fullName',
      );
    });
    it('should successfully simulate CONCAT transformation', async () => {
      const mappingDto = {
        name: 'Test CONCAT',
        sourceFields: [
          { path: 'firstName', type: 'string', isRequired: true },
          { path: 'lastName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        constants: { separator: ' ' },
        createdBy: 'test-user',
      };
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        fullName: 'John Doe',
      });
      expect(result.validationErrors).toHaveLength(0);
      expect(result.transformationDetails.appliedTransformations).toContain(
        'CONCAT: fullName (separator: " ")',
      );
    });
    it('should successfully simulate SUM transformation', async () => {
      const mappingDto = {
        name: 'Test SUM',
        sourceFields: [
          { path: 'amount1', type: 'number', isRequired: true },
          { path: 'amount2', type: 'number', isRequired: true },
        ],
        destinationFields: [
          { path: 'total', type: 'number', isRequired: true },
        ],
        transformation: TransformationType.SUM,
        createdBy: 'test-user',
      };
      const payload = {
        amount1: 100.5,
        amount2: 250.75,
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        total: 351.25,
      });
      expect(result.validationErrors).toHaveLength(0);
      expect(result.transformationDetails.appliedTransformations).toContain(
        'SUM: total (2 values)',
      );
    });
    it('should handle nested object paths', async () => {
      const mappingDto = {
        name: 'Test Nested',
        sourceFields: [
          {
            path: 'customer.personal.firstName',
            type: 'string',
            isRequired: true,
          },
          {
            path: 'customer.personal.lastName',
            type: 'string',
            isRequired: true,
          },
        ],
        destinationFields: [
          { path: 'profile.name.full', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        constants: { separator: ' ' },
        createdBy: 'test-user',
      };
      const payload = {
        customer: {
          personal: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        profile: {
          name: {
            full: 'Jane Smith',
          },
        },
      });
    });
    it('should detect missing required fields', async () => {
      const mappingDto = {
        name: 'Test Missing Fields',
        sourceFields: [
          { path: 'firstName', type: 'string', isRequired: true },
          { path: 'lastName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        createdBy: 'test-user',
      };
      const payload = {
        firstName: 'John',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(false);
      expect(result.transformedPayload).toBeNull();
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('REQUIRED_SOURCE_MISSING');
      expect(result.validationErrors[0].field).toBe('lastName');
    });
    it('should apply constants correctly', async () => {
      const mappingDto = {
        name: 'Test Constants',
        sourceFields: [{ path: 'name', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'customerName', type: 'string', isRequired: true },
          { path: 'status', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: {
          status: 'ACTIVE',
        },
        createdBy: 'test-user',
      };
      const payload = {
        name: 'John Doe',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        customerName: 'John Doe',
        status: 'ACTIVE',
      });
      expect(result.transformationDetails.constantsApplied).toEqual({
        status: 'ACTIVE',
      });
    });
    it('should handle invalid mapping configuration', async () => {
      const invalidMappingDto = {
        name: '',
        sourceFields: [],
        destinationFields: [],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      const payload = { test: 'data' };
      const result = await service.simulate(invalidMappingDto, payload);
      expect(result.success).toBe(false);
      expect(result.transformedPayload).toBeNull();
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });
  describe('exportMappingConfig', () => {
    it('should successfully export a mapping package', async () => {
      const mappingId = 'test-mapping-id';
      const userId = 'test-user';
      const mockMapping = {
        id: mappingId,
        name: 'Test Mapping',
        version: 1,
        status: MappingStatus.READY_FOR_DEPLOYMENT,
        sourceFields: [{ path: 'firstName', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        constants: null,
        createdBy: 'original-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMappingRepository.findById.mockResolvedValue(mockMapping);
      mockAuditService.logMappingAction.mockResolvedValue(undefined);
      const result = await service.exportMappingConfig(
        mappingId,
        userId,
        'test-tenant',
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.package).toBeDefined();
      expect(result.data?.checksum).toBeDefined();
      expect(result.data?.filename).toBeDefined();
      expect(result.data?.package.meta.mappingId).toBe(mappingId);
      expect(result.data?.package.meta.exportedBy).toBe(userId);
      expect(result.data?.package.mapping.name).toBe('Test Mapping');
    });
    it('should handle non-existent mapping', async () => {
      const mappingId = 'non-existent-id';
      const userId = 'test-user';
      mockMappingRepository.findById.mockResolvedValue(null);
      const result = await service.exportMappingConfig(
        mappingId,
        userId,
        'test-tenant',
      );
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toContain('not found');
    });
  });
  describe('importMappingConfig', () => {
    it('should successfully import a valid mapping package', async () => {
      const userId = 'import-user';
      const mappingData = {
        id: 'original-id',
        name: 'Original Mapping',
        version: 1,
        status: 'APPROVED',
        sourceFields: [{ path: 'firstName', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: 'NONE',
        constants: null,
        createdBy: 'original-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const crypto = require('crypto');
      const packageForHash = {
        meta: {
          packageVersion: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'export-user',
          mappingId: 'original-id',
          mappingVersion: 1,
        },
        mapping: mappingData,
        transformations: {
          type: 'NONE',
          config: null,
        },
        constants: {},
        extensions: [],
        schema: {
          sourceSchema: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
            },
            required: ['firstName'],
          },
          destinationSchema: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
            },
            required: ['fullName'],
          },
        },
      };
      const packageString = JSON.stringify(packageForHash, null, 0);
      const checksum = crypto
        .createHash('sha256')
        .update(packageString)
        .digest('hex');
      const packageData = {
        meta: {
          packageVersion: '1.0.0',
          exportedAt: packageForHash.meta.exportedAt,
          exportedBy: 'export-user',
          mappingId: 'original-id',
          mappingVersion: 1,
          checksum: checksum,
        },
        mapping: mappingData,
        transformations: {
          type: 'NONE',
          config: null,
        },
        constants: {},
        extensions: [],
        schema: {
          sourceSchema: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
            },
            required: ['firstName'],
          },
          destinationSchema: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
            },
            required: ['fullName'],
          },
        },
      };
      const newMapping = {
        id: 'new-mapping-id',
        name: 'Original Mapping (Imported)',
        version: 1,
        status: MappingStatus.IN_PROGRESS,
        sourceFields: packageData.mapping.sourceFields,
        destinationFields: packageData.mapping.destinationFields,
        transformation: TransformationType.NONE,
        constants: null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMappingRepository.create.mockResolvedValue(newMapping);
      mockAuditService.logMappingAction.mockResolvedValue(undefined);
      const result = await service.importMappingConfig(
        packageData,
        userId,
        'test-tenant',
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Original Mapping (Imported)');
      expect(result.data?.status).toBe(MappingStatus.IN_PROGRESS);
      expect(result.validationErrors).toHaveLength(0);
    });
    it('should reject package with invalid structure', async () => {
      const userId = 'import-user';
      const invalidPackage = {};
      const result = await service.importMappingConfig(
        invalidPackage,
        userId,
        'test-tenant',
      );
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.validationErrors[0].code).toBe('INVALID_PACKAGE_STRUCTURE');
    });
  });
});
describe('MappingService', () => {
  let service: MappingService;
  let repository: MappingRepository;
  const mockMappingRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findLatestByName: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getNextVersion: jest.fn(),
  };
  const mockAuditService = {
    logMappingAction: jest.fn(),
    getMappingAuditLogs: jest.fn(),
    getAuditLogsByAction: jest.fn(),
    getAuditLogsByActor: jest.fn(),
  };
  const mockEndpointsService = {
    getEndpointById: jest.fn(),
    getSchemaFields: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingService,
        {
          provide: MappingRepository,
          useValue: mockMappingRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: EndpointsService,
          useValue: mockEndpointsService,
        },
      ],
    }).compile();
    service = module.get<MappingService>(MappingService);
    repository = module.get<MappingRepository>(MappingRepository);
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createMapping', () => {
    it('should create a valid mapping', async () => {
      const createDto = {
        name: 'Test Mapping',
        sourceFields: [{ path: 'firstName', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      const expectedMapping = {
        id: 'uuid-123',
        version: 1,
        status: MappingStatus.IN_PROGRESS,
        constants: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...createDto,
      };
      mockMappingRepository.create.mockResolvedValue(expectedMapping);
      const result = await service.createMapping(
        createDto,
        'test-user',
        'test-tenant',
      );
      expect(mockMappingRepository.create).toHaveBeenCalledWith(
        {
          ...createDto,
          status: MappingStatus.IN_PROGRESS,
          createdBy: 'test-user',
        },
        'test-tenant',
      );
      expect(result.action).toBe('CREATE');
      expect(result.userId).toBe('test-user');
    });
    it('should throw BadRequestException for invalid mapping', async () => {
      const invalidDto = {
        name: '',
        sourceFields: [],
        destinationFields: [],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      await expect(
        service.createMapping(invalidDto, 'test-user', 'test-tenant'),
      ).rejects.toThrow(BadRequestException);
    });
  });
  describe('updateMapping', () => {
    const existingMapping = {
      id: 'uuid-123',
      name: 'Test Mapping',
      version: 1,
      status: MappingStatus.IN_PROGRESS,
      sourceFields: [
        { path: 'firstName', type: 'string', isRequired: true },
        { path: 'lastName', type: 'string', isRequired: true },
      ],
      destinationFields: [
        { path: 'fullName', type: 'string', isRequired: true },
      ],
      transformation: TransformationType.CONCAT,
      constants: null,
      createdBy: 'original-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    it('should update existing mapping', async () => {
      const updateDto = {
        transformation: TransformationType.CONCAT,
      };
      const updatedMapping = { ...existingMapping, ...updateDto };
      mockMappingRepository.findById.mockResolvedValue(existingMapping);
      mockMappingRepository.update.mockResolvedValue(updatedMapping);
      const result = await service.updateMapping(
        'uuid-123',
        updateDto,
        'editor-user',
        'test-tenant',
      );
      expect(mockMappingRepository.findById).toHaveBeenCalledWith(
        'uuid-123',
        'test-tenant',
      );
      expect(mockMappingRepository.update).toHaveBeenCalledWith(
        'uuid-123',
        updateDto,
        'test-tenant',
      );
      expect(result.action).toBe('UPDATE');
      expect(result.userId).toBe('editor-user');
    });
    it('should throw NotFoundException for non-existent mapping', async () => {
      mockMappingRepository.findById.mockResolvedValue(null);
      await expect(
        service.updateMapping('non-existent', {}, 'user', 'test-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw ConflictException for non-IN_PROGRESS mapping', async () => {
      const approvedMapping = {
        ...existingMapping,
        status: MappingStatus.READY_FOR_DEPLOYMENT,
      };
      mockMappingRepository.findById.mockResolvedValue(approvedMapping);
      await expect(
        service.updateMapping('uuid-123', {}, 'user', 'test-tenant'),
      ).rejects.toThrow(ConflictException);
    });
  });
  describe('getMappingHistory', () => {
    const baseMapping = {
      id: 'uuid-123',
      name: 'Test Mapping',
      status: MappingStatus.IN_PROGRESS,
      sourceFields: [{ path: 'firstName', type: 'string', isRequired: true }],
      destinationFields: [
        { path: 'fullName', type: 'string', isRequired: true },
      ],
      transformation: TransformationType.NONE,
      constants: null,
      createdBy: 'original-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    it('should return mapping history sorted by version', async () => {
      const mappingHistory = [
        { ...baseMapping, version: 3 },
        { ...baseMapping, version: 2 },
        { ...baseMapping, version: 1 },
      ];
      mockMappingRepository.findByName.mockResolvedValue(mappingHistory);
      const result = await service.getMappingHistory(
        'Test Mapping',
        'test-tenant',
      );
      expect(mockMappingRepository.findByName).toHaveBeenCalledWith(
        'Test Mapping',
        'test-tenant',
      );
      expect(result).toEqual(mappingHistory);
    });
    it('should throw NotFoundException for non-existent mapping name', async () => {
      mockMappingRepository.findByName.mockResolvedValue([]);
      await expect(
        service.getMappingHistory('Non Existent', 'test-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });
  describe('rollbackMapping', () => {
    const currentMapping = {
      id: 'uuid-current',
      name: 'Test Mapping',
      version: 3,
      status: MappingStatus.READY_FOR_DEPLOYMENT,
      sourceFields: [{ path: 'newField', type: 'string', isRequired: true }],
      destinationFields: [
        { path: 'newDest', type: 'string', isRequired: true },
      ],
      transformation: TransformationType.CONCAT,
      constants: null,
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const targetMapping = {
      id: 'uuid-target',
      name: 'Test Mapping',
      version: 1,
      status: MappingStatus.PUBLISHED,
      sourceFields: [{ path: 'oldField', type: 'string', isRequired: true }],
      destinationFields: [
        { path: 'oldDest', type: 'string', isRequired: true },
      ],
      transformation: TransformationType.NONE,
      constants: null,
      createdBy: 'original-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    it('should rollback to previous version', async () => {
      const mappingHistory = [currentMapping, targetMapping];
      const rolledBackMapping = {
        ...targetMapping,
        id: 'uuid-new',
        version: 4,
        status: MappingStatus.IN_PROGRESS,
      };
      mockMappingRepository.findById.mockResolvedValue(currentMapping);
      mockMappingRepository.findByName.mockResolvedValue(mappingHistory);
      mockMappingRepository.create.mockResolvedValue(rolledBackMapping);
      const result = await service.rollbackMapping(
        'uuid-current',
        1,
        'rollback-user',
        'test-tenant',
      );
      expect(mockMappingRepository.create).toHaveBeenCalledWith(
        {
          name: targetMapping.name,
          sourceFields: targetMapping.sourceFields,
          destinationFields: targetMapping.destinationFields,
          transformation: targetMapping.transformation,
          constants: undefined,
          status: MappingStatus.IN_PROGRESS,
          createdBy: 'rollback-user',
        },
        'test-tenant',
      );
      expect(result.action).toBe('ROLLBACK');
      expect(result.userId).toBe('rollback-user');
    });
    it('should throw BadRequestException for invalid target version', async () => {
      const mappingHistory = [currentMapping, targetMapping];
      mockMappingRepository.findById.mockResolvedValue(currentMapping);
      mockMappingRepository.findByName.mockResolvedValue(mappingHistory);
      await expect(
        service.rollbackMapping('uuid-current', 5, 'user', 'test-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });
  describe('validateMapping', () => {
    it('should return no errors for valid mapping', async () => {
      const validDto = {
        name: 'Valid Mapping',
        sourceFields: [{ path: 'source', type: 'string', isRequired: true }],
        destinationFields: [{ path: 'dest', type: 'string', isRequired: true }],
        transformation: TransformationType.NONE,
        createdBy: 'user',
      };
      const errors = await service.validateMapping(validDto);
      expect(errors).toHaveLength(0);
    });
    it('should detect missing required fields', async () => {
      const invalidDto = {
        name: '',
        sourceFields: [],
        destinationFields: [],
        transformation: TransformationType.NONE,
        createdBy: 'user',
      };
      const errors = await service.validateMapping(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === 'REQUIRED_FIELD_MISSING')).toBe(
        true,
      );
    });
    it('should detect duplicate destination fields', async () => {
      const invalidDto = {
        name: 'Test',
        sourceFields: [{ path: 'source', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'dest', type: 'string', isRequired: true },
          { path: 'dest', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'user',
      };
      const errors = await service.validateMapping(invalidDto);
      expect(errors.some((e) => e.code === 'DUPLICATE_DESTINATIONS')).toBe(
        true,
      );
    });
    it('should validate CONCAT transformation requirements', async () => {
      const invalidDto = {
        name: 'Test',
        sourceFields: [{ path: 'source', type: 'string', isRequired: true }],
        destinationFields: [{ path: 'dest', type: 'number', isRequired: true }],
        transformation: TransformationType.CONCAT,
        createdBy: 'user',
      };
      const errors = await service.validateMapping(invalidDto);
      expect(errors.some((e) => e.code === 'TYPE_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.code === 'INSUFFICIENT_SOURCE_FIELDS')).toBe(
        true,
      );
    });
    it('should validate SUM transformation requirements', async () => {
      const invalidDto = {
        name: 'Test',
        sourceFields: [{ path: 'source', type: 'string', isRequired: true }],
        destinationFields: [{ path: 'dest', type: 'string', isRequired: true }],
        transformation: TransformationType.SUM,
        createdBy: 'user',
      };
      const errors = await service.validateMapping(invalidDto);
      expect(errors.some((e) => e.code === 'TYPE_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.code === 'INSUFFICIENT_SOURCE_FIELDS')).toBe(
        true,
      );
    });
  });
  describe('legacy methods', () => {
    const existingMapping = {
      id: 'uuid-123',
      name: 'Test Mapping',
      version: 1,
      status: MappingStatus.IN_PROGRESS,
      sourceFields: [],
      destinationFields: [],
      transformation: TransformationType.NONE,
      constants: null,
      createdBy: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    it('should maintain backward compatibility for create', async () => {
      const createDto = {
        name: 'Test Mapping',
        sourceFields: [{ path: 'firstName', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      mockMappingRepository.create.mockResolvedValue(existingMapping);
      const result = await service.create(createDto, 'test-tenant');
      expect(result.id).toEqual(existingMapping.id);
      expect(result.name).toEqual(existingMapping.name);
      expect(result.version).toEqual(existingMapping.version);
      expect(result.action).toBe('CREATE');
    });
    it('should maintain backward compatibility for findAll', async () => {
      const expectedMappings = [existingMapping];
      mockMappingRepository.findAll.mockResolvedValue(expectedMappings);
      const result = await service.findAll('test-tenant');
      expect(repository.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedMappings);
    });
    it('should maintain backward compatibility for findOne', async () => {
      mockMappingRepository.findById.mockResolvedValue(existingMapping);
      const result = await service.findOne('uuid-123', 'test-tenant');
      expect(mockMappingRepository.findById).toHaveBeenCalledWith(
        'uuid-123',
        'test-tenant',
      );
      expect(result).toEqual(existingMapping);
    });
    it('should maintain backward compatibility for getNextVersion', async () => {
      const expectedVersion = 2;
      mockMappingRepository.getNextVersion.mockResolvedValue(expectedVersion);
      const result = await service.getNextVersion(
        'Test Mapping',
        'test-tenant',
      );
      expect(mockMappingRepository.getNextVersion).toHaveBeenCalledWith(
        'Test Mapping',
        'test-tenant',
      );
      expect(result).toBe(expectedVersion);
    });
  });
  describe('simulate', () => {
    it('should successfully simulate CONCAT transformation', async () => {
      const mappingDto = {
        name: 'Test CONCAT',
        sourceFields: [
          { path: 'firstName', type: 'string', isRequired: true },
          { path: 'lastName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        constants: { separator: ' ' },
        createdBy: 'test-user',
      };
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(true);
      expect(result.transformedPayload).toEqual({
        fullName: 'John Doe',
      });
      expect(result.validationErrors).toHaveLength(0);
      expect(result.transformationDetails.appliedTransformations).toEqual(
        expect.arrayContaining([expect.stringContaining('CONCAT: fullName')]),
      );
    });
    it('should detect missing required fields', async () => {
      const mappingDto = {
        name: 'Test Missing Fields',
        sourceFields: [
          { path: 'firstName', type: 'string', isRequired: true },
          { path: 'lastName', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'fullName', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.CONCAT,
        createdBy: 'test-user',
      };
      const payload = {
        firstName: 'John',
      };
      const result = await service.simulate(mappingDto, payload);
      expect(result.success).toBe(false);
      expect(result.transformedPayload).toBeNull();
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('REQUIRED_SOURCE_MISSING');
      expect(result.validationErrors[0].field).toBe('lastName');
    });
  });
});
