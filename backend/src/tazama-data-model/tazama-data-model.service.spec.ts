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
      expect(paths).toContain('entities.id');
      expect(paths).toContain('entities.creDtTm');
      expect(paths).toContain('accounts.id');
      expect(paths).toContain('transactionDetails.Amt');
      expect(paths.length).toBeGreaterThan(10);
    });
  });

  describe('isValidDestinationPath', () => {
    it('should validate correct destination paths', () => {
      expect(service.isValidDestinationPath('entities.id')).toBe(true);
      expect(service.isValidDestinationPath('accounts.id')).toBe(true);
      expect(service.isValidDestinationPath('transactionDetails.Amt')).toBe(
        true,
      );
    });

    it('should reject invalid destination paths', () => {
      expect(service.isValidDestinationPath('invalid.field')).toBe(false);
      expect(service.isValidDestinationPath('entities.nonexistent')).toBe(
        false,
      );
      expect(service.isValidDestinationPath('justtext')).toBe(false);
    });
  });

  describe('getFieldType', () => {
    it('should return correct field types', () => {
      expect(service.getFieldType('entities.id')).toBe('STRING');
      expect(service.getFieldType('redis.xchgRate')).toBe('NUMBER');
      expect(service.getFieldType('transactionDetails.TxTp')).toBe('STRING');
    });

    it('should return null for invalid paths', () => {
      expect(service.getFieldType('invalid.path')).toBe(null);
    });
  });

  describe('isFieldRequired', () => {
    it('should identify required fields', () => {
      expect(service.isFieldRequired('entities.id')).toBe(true);
      expect(service.isFieldRequired('transactionDetails.source')).toBe(true);
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
      expect(service.extractCollectionName('entities.id')).toBe('entities');
      expect(service.extractCollectionName('accounts.id')).toBe('accounts');
    });

    it('should return null for invalid paths', () => {
      expect(service.extractCollectionName('invalid.path')).toBe(null);
    });
  });

  describe('extractFieldName', () => {
    it('should extract field name from path', () => {
      expect(service.extractFieldName('entities.id')).toBe('id');
      expect(service.extractFieldName('entities.creDtTm')).toBe('creDtTm');
    });

    it('should return null for invalid paths', () => {
      expect(service.extractFieldName('invalid')).toBe(null);
    });
  });
});
