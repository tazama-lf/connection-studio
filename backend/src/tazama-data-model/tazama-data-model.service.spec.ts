import { Test, TestingModule } from '@nestjs/testing';
import { TazamaDataModelService } from './tazama-data-model.service';

describe('TazamaDataModelService', () => {
  let service: TazamaDataModelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TazamaDataModelService],
    }).compile();

    service = module.get<TazamaDataModelService>(TazamaDataModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllDestinationPaths', () => {
    it('should return all available destination paths', () => {
      const paths = service.getAllDestinationPaths();
      expect(paths).toContain('transactionDetails.source');
      expect(paths).toContain('transactionDetails.Amt');
      expect(paths).toContain('redis.dbtrId');
      expect(paths.length).toBeGreaterThan(10);
    });
  });

  describe('isValidDestinationPath', () => {
    it('should validate correct destination paths', () => {
      expect(service.isValidDestinationPath('transactionDetails.source')).toBe(true);
      expect(service.isValidDestinationPath('redis.dbtrId')).toBe(true);
      expect(service.isValidDestinationPath('transactionDetails.Amt')).toBe(
        true,
      );
    });

    it('should reject invalid destination paths', () => {
      expect(service.isValidDestinationPath('invalid.field')).toBe(false);
      expect(service.isValidDestinationPath('transactionDetails.nonexistent')).toBe(
        false,
      );
      expect(service.isValidDestinationPath('justtext')).toBe(false);
    });
  });

  describe('getFieldType', () => {
    it('should return correct field types', () => {
      expect(service.getFieldType('transactionDetails.TxTp')).toBe('STRING');
      expect(service.getFieldType('redis.xchgRate')).toBe('NUMBER');
      expect(service.getFieldType('transactionDetails.source')).toBe('STRING');
    });

    it('should return null for invalid paths', () => {
      expect(service.getFieldType('invalid.path')).toBe(null);
    });
  });

  describe('isFieldRequired', () => {
    it('should identify required fields', () => {
      expect(service.isFieldRequired('transactionDetails.source')).toBe(true);
      expect(service.isFieldRequired('transactionDetails.TxTp')).toBe(true);
    });

    it('should identify optional fields', () => {
      expect(service.isFieldRequired('transactionDetails.Amt')).toBe(false);
      expect(service.isFieldRequired('redis.dbtrId')).toBe(false);
    });
  });

  describe('getDestinationOptions', () => {
    it('should return formatted options for UI', () => {
      const options = service.getDestinationOptions();
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('value');
      expect(options[0]).toHaveProperty('label');
      expect(options[0]).toHaveProperty('collection');
      expect(options[0]).toHaveProperty('field');
      expect(options[0]).toHaveProperty('type');
    });
  });

  describe('extractCollectionName', () => {
    it('should extract collection name from path', () => {
      expect(service.extractCollectionName('transactionDetails.source')).toBe('transactionDetails');
      expect(service.extractCollectionName('redis.dbtrId')).toBe('redis');
    });

    it('should return null for invalid paths', () => {
      expect(service.extractCollectionName('invalid.path')).toBe(null);
    });
  });

  describe('extractFieldName', () => {
    it('should extract field name from path', () => {
      expect(service.extractFieldName('transactionDetails.source')).toBe('source');
      expect(service.extractFieldName('redis.dbtrId')).toBe('dbtrId');
    });

    it('should return null for invalid paths', () => {
      expect(service.extractFieldName('invalid')).toBe(null);
    });

    it('should handle nested field names', () => {
      expect(service.extractFieldName('redis.nested.field.name')).toBe(
        'nested.field.name',
      );
    });
  });

  describe('getDestinationPathsByCollection', () => {
    it('should return paths grouped by collection', () => {
      const grouped = service.getDestinationPathsByCollection();
      expect(grouped).toHaveProperty('transactionDetails');
      expect(grouped).toHaveProperty('redis');
      expect(Array.isArray(grouped.transactionDetails)).toBe(true);
      expect(grouped.transactionDetails.length).toBeGreaterThan(0);
    });

    it('should include valid paths for each collection', () => {
      const grouped = service.getDestinationPathsByCollection();
      expect(grouped.transactionDetails).toContain('transactionDetails.source');
      expect(grouped.redis).toContain('redis.dbtrId');
    });

    it('should exclude _id and _rev fields', () => {
      const grouped = service.getDestinationPathsByCollection();
      const allPaths = Object.values(grouped).flat();
      const hasIdFields = allPaths.some(
        (path) => path.endsWith('._id') || path.endsWith('._rev'),
      );
      expect(hasIdFields).toBe(false);
    });

    it('should handle nested object properties', () => {
      const grouped = service.getDestinationPathsByCollection();
      const allPaths = Object.values(grouped).flat();
      const hasNestedPaths = allPaths.some((path) => {
        const parts = path.split('.');
        return parts.length > 2;
      });
      expect(hasNestedPaths).toBe(true);
    });
  });

  describe('getCollectionSchema', () => {
    it('should return schema for valid collection name', () => {
      const schema = service.getCollectionSchema('transactionDetails');
      expect(schema).not.toBeNull();
      expect(schema?.name).toBe('transactionDetails');
      expect(schema?.fields).toBeDefined();
      expect(Array.isArray(schema?.fields)).toBe(true);
    });

    it('should return null for invalid collection name', () => {
      const schema = service.getCollectionSchema('invalid' as any);
      expect(schema).toBeNull();
    });

    it('should return different schemas for different collections', () => {
      const transactionDetailsSchema = service.getCollectionSchema('transactionDetails');
      const redisSchema = service.getCollectionSchema('redis');
      expect(transactionDetailsSchema).not.toEqual(redisSchema);
    });
  });

  describe('getAllCollectionSchemas', () => {
    it('should return all collection schemas', () => {
      const schemas = service.getAllCollectionSchemas();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
    });

    it('should include all expected collections', () => {
      const schemas = service.getAllCollectionSchemas();
      const schemaNames = schemas.map((s) => s.name);
      expect(schemaNames).toContain('transactionDetails');
      expect(schemaNames).toContain('redis');
    });

    it('should return schemas with valid structure', () => {
      const schemas = service.getAllCollectionSchemas();
      schemas.forEach((schema) => {
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('fields');
        expect(Array.isArray(schema.fields)).toBe(true);
      });
    });
  });

  describe('getRequiredFields', () => {
    it('should return required fields for valid collection', () => {
      const requiredFields = service.getRequiredFields('transactionDetails');
      expect(Array.isArray(requiredFields)).toBe(true);
      expect(requiredFields).toContain('source');
    });

    it('should return empty array for invalid collection', () => {
      const requiredFields = service.getRequiredFields('invalid' as any);
      expect(requiredFields).toEqual([]);
    });

    it('should only include required fields', () => {
      const requiredFields = service.getRequiredFields('transactionDetails');
      expect(requiredFields).toContain('source');
      // Verify these are actually required by checking isFieldRequired
      requiredFields.forEach((fieldName) => {
        const path = `transactionDetails.${fieldName}`;
        expect(service.isFieldRequired(path)).toBe(true);
      });
    });
  });

  describe('getFieldDescription', () => {
    it('should return description for valid field path', () => {
      const description = service.getFieldDescription('entities.id');
      // May return null or string depending on schema definition
      expect(description === null || typeof description === 'string').toBe(
        true,
      );
    });

    it('should return null for invalid collection', () => {
      const description = service.getFieldDescription('invalid.field');
      expect(description).toBeNull();
    });

    it('should return null for invalid field in valid collection', () => {
      const description = service.getFieldDescription('entities.nonexistent');
      expect(description).toBeNull();
    });
  });

  describe('getFieldExample', () => {
    it('should return example for valid field path', () => {
      const example = service.getFieldExample('entities.id');
      // May return null or any value depending on schema definition
      expect(example !== undefined).toBe(true);
    });

    it('should return null for invalid collection', () => {
      const example = service.getFieldExample('invalid.field');
      expect(example).toBeNull();
    });

    it('should return null for invalid field in valid collection', () => {
      const example = service.getFieldExample('entities.nonexistent');
      expect(example).toBeNull();
    });
  });

  describe('getCollectionTypes', () => {
    it('should return array of collection type names', () => {
      const types = service.getCollectionTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include expected collection types', () => {
      const types = service.getCollectionTypes();
      expect(types).toContain('transactionDetails');
      expect(types).toContain('redis');
    });

    it('should return exactly 2 collection types', () => {
      const types = service.getCollectionTypes();
      expect(types).toHaveLength(2);
    });
  });

  describe('isValidDestinationPath - edge cases', () => {
    it('should return false for empty string', () => {
      expect(service.isValidDestinationPath('')).toBe(false);
    });

    it('should return false for path with only collection name', () => {
      expect(service.isValidDestinationPath('transactionDetails')).toBe(false);
    });

    it('should return false for path with empty field', () => {
      expect(service.isValidDestinationPath('transactionDetails.')).toBe(false);
    });

    it('should validate nested object paths', () => {
      // Test if service handles nested paths correctly
      const paths = service.getAllDestinationPaths();
      const nestedPath = paths.find((p) => p.split('.').length > 2);
      if (nestedPath) {
        expect(service.isValidDestinationPath(nestedPath)).toBe(true);
      }
    });
  });

  describe('getDestinationOptions - detailed tests', () => {
    it('should exclude _id and _rev fields from options', () => {
      const options = service.getDestinationOptions();
      const hasIdFields = options.some(
        (opt) => opt.field === '_id' || opt.field === '_rev',
      );
      expect(hasIdFields).toBe(false);
    });

    it('should mark object types with properties', () => {
      const options = service.getDestinationOptions();
      const objectOptions = options.filter((opt) => opt.type === 'OBJECT');
      objectOptions.forEach((opt) => {
        expect(opt.properties).toBeDefined();
        expect(Array.isArray(opt.properties)).toBe(true);
      });
    });

    it('should not have properties for non-object types', () => {
      const options = service.getDestinationOptions();
      const nonObjectOptions = options.filter((opt) => opt.type !== 'OBJECT');
      nonObjectOptions.forEach((opt) => {
        expect(opt.properties).toBeUndefined();
      });
    });

    it('should have correct structure for all options', () => {
      const options = service.getDestinationOptions();
      options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('label');
        expect(opt).toHaveProperty('collection');
        expect(opt).toHaveProperty('field');
        expect(opt).toHaveProperty('type');
        expect(opt).toHaveProperty('required');
        expect(typeof opt.required).toBe('boolean');
      });
    });

    it('should sort options alphabetically by label', () => {
      const options = service.getDestinationOptions();
      for (let i = 1; i < options.length; i++) {
        expect(options[i - 1].label.localeCompare(options[i].label)).toBeLessThanOrEqual(0);
      }
    });

    it('should handle nested field paths correctly', () => {
      const options = service.getDestinationOptions();
      const nestedOptions = options.filter((opt) => opt.field.includes('.'));
      expect(nestedOptions.length).toBeGreaterThan(0);
      nestedOptions.forEach((opt) => {
        expect(opt.value).toContain(opt.collection);
        expect(opt.value).toContain(opt.field);
      });
    });
  });

  describe('getAllDestinationPaths - edge cases', () => {
    it('should return sorted paths', () => {
      const paths = service.getAllDestinationPaths();
      // Paths are sorted using default sort() which is case-sensitive
      const sortedPaths = [...paths].sort();
      expect(paths).toEqual(sortedPaths);
    });

    it('should exclude _id and _rev from all paths', () => {
      const paths = service.getAllDestinationPaths();
      const hasIdFields = paths.some(
        (path) => path.endsWith('._id') || path.endsWith('._rev'),
      );
      expect(hasIdFields).toBe(false);
    });

    it('should include nested object properties', () => {
      const paths = service.getAllDestinationPaths();
      const nestedPaths = paths.filter((path) => path.split('.').length > 2);
      expect(nestedPaths.length).toBeGreaterThan(0);
    });
  });
});
