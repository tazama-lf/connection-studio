import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DataModelExtensionService } from './data-model-extension.service';
import { DataModelExtensionRepository } from './data-model-extension.repository';
import { FieldType, ExtensionStatus } from './data-model-extension.entity';
describe('DataModelExtensionService', () => {
  let service: DataModelExtensionService;
  let repository: DataModelExtensionRepository;
  const mockRepository = {
    addField: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCollection: jest.fn(),
    findByFieldName: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getNextVersion: jest.fn(),
    addAuditLog: jest.fn(),
    getAuditLogs: jest.fn(),
  };
  const mockExtension = {
    id: 'uuid-123',
    collection: 'customers',
    fieldName: 'preferredLanguage',
    fieldType: FieldType.STRING,
    isRequired: true,
    defaultValue: 'en',
    version: 1,
    status: ExtensionStatus.ACTIVE,
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockAuditLog = {
    id: 'audit-123',
    extensionId: 'uuid-123',
    action: 'CREATE' as const,
    userId: 'test-user',
    timestamp: new Date(),
    newState: mockExtension,
    details: 'Test audit log',
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataModelExtensionService,
        {
          provide: DataModelExtensionRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();
    service = module.get<DataModelExtensionService>(DataModelExtensionService);
    repository = module.get<DataModelExtensionRepository>(
      DataModelExtensionRepository,
    );
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('addField', () => {
    it('should add a valid field extension', async () => {
      mockRepository.findByFieldName.mockResolvedValue([]);
      mockRepository.addField.mockResolvedValue(mockExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      const result = await service.addField(
        'customers',
        'preferredLanguage',
        FieldType.STRING,
        true,
        'en',
        'test-user',
      );
      expect(repository.findByFieldName).toHaveBeenCalledWith(
        'customers',
        'preferredLanguage',
      );
      expect(repository.addField).toHaveBeenCalledWith({
        collection: 'customers',
        fieldName: 'preferredLanguage',
        fieldType: FieldType.STRING,
        required: true,
        defaultValue: 'en',
        createdBy: 'test-user',
      });
      expect(repository.addAuditLog).toHaveBeenCalled();
      expect(result.action).toBe('CREATE');
      expect(result.userId).toBe('test-user');
    });
    it('should throw BadRequestException for invalid field name', async () => {
      await expect(
        service.addField('customers', '123invalid', FieldType.STRING, false),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException for required field without default value', async () => {
      await expect(
        service.addField('customers', 'testField', FieldType.STRING, true),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw ConflictException for existing active field', async () => {
      mockRepository.findByFieldName.mockResolvedValue([
        { ...mockExtension, status: ExtensionStatus.ACTIVE },
      ]);
      await expect(
        service.addField(
          'customers',
          'preferredLanguage',
          FieldType.STRING,
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });
    it('should validate default value type compatibility', async () => {
      await expect(
        service.addField(
          'customers',
          'testField',
          FieldType.NUMBER,
          true,
          'not-a-number',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addField(
          'customers',
          'testField',
          FieldType.BOOLEAN,
          true,
          'not-a-boolean',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
  describe('listExtensions', () => {
    it('should list extensions for a collection', async () => {
      const extensions = [mockExtension];
      mockRepository.findByCollection.mockResolvedValue(extensions);
      const result = await service.listExtensions('customers');
      expect(repository.findByCollection).toHaveBeenCalledWith(
        'customers',
        undefined,
        undefined,
      );
      expect(result).toEqual(extensions);
    });
    it('should throw BadRequestException for empty collection name', async () => {
      await expect(service.listExtensions('')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('should throw NotFoundException when no extensions found', async () => {
      mockRepository.findByCollection.mockResolvedValue([]);
      await expect(service.listExtensions('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should filter by status and version', async () => {
      const extensions = [mockExtension];
      mockRepository.findByCollection.mockResolvedValue(extensions);
      const result = await service.listExtensions(
        'customers',
        ExtensionStatus.ACTIVE,
        1,
      );
      expect(repository.findByCollection).toHaveBeenCalledWith(
        'customers',
        ExtensionStatus.ACTIVE,
        1,
      );
      expect(result).toEqual(extensions);
    });
  });
  describe('removeExtension', () => {
    it('should soft delete an extension', async () => {
      const inactiveExtension = {
        ...mockExtension,
        status: ExtensionStatus.INACTIVE,
      };
      mockRepository.findById.mockResolvedValue(mockExtension);
      mockRepository.update.mockResolvedValue(inactiveExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      const result = await service.removeExtension('uuid-123', 'test-user');
      expect(repository.findById).toHaveBeenCalledWith('uuid-123');
      expect(repository.update).toHaveBeenCalledWith('uuid-123', {
        status: ExtensionStatus.INACTIVE,
      });
      expect(repository.addAuditLog).toHaveBeenCalled();
      expect(result.action).toBe('DELETE');
    });
    it('should throw NotFoundException for non-existent extension', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.removeExtension('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should throw ConflictException for already inactive extension', async () => {
      mockRepository.findById.mockResolvedValue({
        ...mockExtension,
        status: ExtensionStatus.INACTIVE,
      });
      await expect(service.removeExtension('uuid-123')).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('updateExtension', () => {
    it('should update an extension with validation', async () => {
      const updatedExtension = {
        ...mockExtension,
        fieldType: FieldType.NUMBER,
        defaultValue: 0,
      };
      mockRepository.findById.mockResolvedValue(mockExtension);
      mockRepository.update.mockResolvedValue(updatedExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      const result = await service.updateExtension(
        'uuid-123',
        { fieldType: FieldType.NUMBER, defaultValue: 0 },
        'test-user',
      );
      expect(repository.update).toHaveBeenCalledWith('uuid-123', {
        fieldType: FieldType.NUMBER,
        defaultValue: 0,
      });
      expect(result.action).toBe('UPDATE');
    });
    it('should throw NotFoundException for non-existent extension', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.updateExtension('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should throw ConflictException for inactive extension', async () => {
      mockRepository.findById.mockResolvedValue({
        ...mockExtension,
        status: ExtensionStatus.INACTIVE,
      });
      await expect(service.updateExtension('uuid-123', {})).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('activateExtension', () => {
    it('should activate an inactive extension', async () => {
      const inactiveExtension = {
        ...mockExtension,
        status: ExtensionStatus.INACTIVE,
      };
      const activeExtension = {
        ...mockExtension,
        status: ExtensionStatus.ACTIVE,
      };
      mockRepository.findById.mockResolvedValue(inactiveExtension);
      mockRepository.update.mockResolvedValue(activeExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      const result = await service.activateExtension('uuid-123', 'test-user');
      expect(repository.update).toHaveBeenCalledWith('uuid-123', {
        status: ExtensionStatus.ACTIVE,
      });
      expect(result.action).toBe('ACTIVATE');
    });
    it('should throw ConflictException for already active extension', async () => {
      mockRepository.findById.mockResolvedValue(mockExtension);
      await expect(service.activateExtension('uuid-123')).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('getExtensionAuditHistory', () => {
    it('should return audit history for an extension', async () => {
      const auditLogs = [mockAuditLog];
      mockRepository.findById.mockResolvedValue(mockExtension);
      mockRepository.getAuditLogs.mockResolvedValue(auditLogs);
      const result = await service.getExtensionAuditHistory('uuid-123');
      expect(repository.getAuditLogs).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(auditLogs);
    });
    it('should throw NotFoundException for non-existent extension', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(
        service.getExtensionAuditHistory('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
  describe('validateCollectionExtensions', () => {
    it('should validate that required extensions have default values or are mapped', async () => {
      const requiredExtension = {
        ...mockExtension,
        isRequired: true,
        defaultValue: null,
      };
      const optionalExtension = {
        ...mockExtension,
        id: 'uuid-456',
        fieldName: 'optional',
        isRequired: false,
      };
      mockRepository.findByCollection.mockResolvedValue([
        requiredExtension,
        optionalExtension,
      ]);
      const errors = await service.validateCollectionExtensions(
        'customers',
        [],
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED_FIELD_NOT_SATISFIED');
      expect(errors[0].field).toBe('preferredLanguage');
    });
    it('should pass validation when required fields are mapped', async () => {
      const requiredExtension = {
        ...mockExtension,
        isRequired: true,
        defaultValue: null,
      };
      mockRepository.findByCollection.mockResolvedValue([requiredExtension]);
      const errors = await service.validateCollectionExtensions('customers', [
        'preferredLanguage',
      ]);
      expect(errors).toHaveLength(0);
    });
    it('should pass validation when required fields have default values', async () => {
      const requiredExtension = {
        ...mockExtension,
        isRequired: true,
        defaultValue: 'en',
      };
      mockRepository.findByCollection.mockResolvedValue([requiredExtension]);
      const errors = await service.validateCollectionExtensions(
        'customers',
        [],
      );
      expect(errors).toHaveLength(0);
    });
  });
  describe('validation methods', () => {
    it('should validate field names correctly', async () => {
      mockRepository.findByFieldName.mockResolvedValue([]);
      mockRepository.addField.mockResolvedValue(mockExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      await expect(
        service.addField(
          'collection',
          'validFieldName',
          FieldType.STRING,
          false,
        ),
      ).resolves.toBeDefined();
      await expect(
        service.addField(
          'collection',
          'valid_field_name',
          FieldType.STRING,
          false,
        ),
      ).resolves.toBeDefined();
      await expect(
        service.addField('collection', '123invalid', FieldType.STRING, false),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addField('collection', 'invalid-name', FieldType.STRING, false),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addField('collection', 'invalid name', FieldType.STRING, false),
      ).rejects.toThrow(BadRequestException);
    });
    it('should validate collection names correctly', async () => {
      await expect(
        service.addField('123invalid', 'fieldName', FieldType.STRING, false),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addField(
          'invalid-collection',
          'fieldName',
          FieldType.STRING,
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
    it('should validate date default values', async () => {
      mockRepository.findByFieldName.mockResolvedValue([]);
      mockRepository.addField.mockResolvedValue(mockExtension);
      mockRepository.addAuditLog.mockResolvedValue(mockAuditLog);
      await expect(
        service.addField(
          'collection',
          'dateField',
          FieldType.DATE,
          true,
          '2023-01-01T00:00:00Z',
        ),
      ).resolves.toBeDefined();
      await expect(
        service.addField(
          'collection',
          'dateField2',
          FieldType.DATE,
          true,
          new Date(),
        ),
      ).resolves.toBeDefined();
      await expect(
        service.addField(
          'collection',
          'dateField3',
          FieldType.DATE,
          true,
          'invalid-date',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
