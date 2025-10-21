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
      expect(paths).toContain('entities._key');
      expect(paths).toContain('entities.Name');
      expect(paths).toContain('accounts.Currency');
      expect(paths).toContain('transactionRelationship.Amt');
      expect(paths.length).toBeGreaterThan(10);
    });
  });

  describe('isValidDestinationPath', () => {
    it('should validate correct destination paths', () => {
      expect(service.isValidDestinationPath('entities.Name')).toBe(true);
      expect(service.isValidDestinationPath('accounts.Currency')).toBe(true);
      expect(
        service.isValidDestinationPath('transactionRelationship.Amt'),
      ).toBe(true);
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
      expect(service.getFieldType('entities.Name')).toBe('STRING');
      expect(service.getFieldType('transactionRelationship.Amt')).toBe(
        'NUMBER',
      );
      expect(service.getFieldType('transactionDetails.TxTp')).toBe(
        'STRING',
      );
    });

    it('should return null for invalid paths', () => {
      expect(service.getFieldType('invalid.path')).toBe(null);
    });
  });

  describe('isFieldRequired', () => {
    it('should identify required fields', () => {
      expect(service.isFieldRequired('entities._key')).toBe(true);
      expect(service.isFieldRequired('transactionRelationship.Amt')).toBe(true);
    });

    it('should identify optional fields', () => {
      expect(service.isFieldRequired('entities.Name')).toBe(false);
      expect(service.isFieldRequired('accounts.Currency')).toBe(false);
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
      expect(service.extractCollectionName('entities.Name')).toBe('entities');
      expect(service.extractCollectionName('accounts.Currency')).toBe(
        'accounts',
      );
    });

    it('should return null for invalid paths', () => {
      expect(service.extractCollectionName('invalid.path')).toBe(null);
    });
  });

  describe('extractFieldName', () => {
    it('should extract field name from path', () => {
      expect(service.extractFieldName('entities.Name')).toBe('Name');
      expect(service.extractFieldName('accounts.Currency')).toBe('Currency');
    });

    it('should return null for invalid paths', () => {
      expect(service.extractFieldName('invalid')).toBe(null);
    });
  });
});
