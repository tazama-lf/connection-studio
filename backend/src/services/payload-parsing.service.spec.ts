import { Test, TestingModule } from '@nestjs/testing';
import { PayloadParsingService } from './payload-parsing.service';
import { ContentType } from '@tazama-lf/tcs-lib';
import * as tcsLib from '@tazama-lf/tcs-lib';

// Mock the tcs-lib functions
jest.mock('@tazama-lf/tcs-lib', () => ({
  ...jest.requireActual('@tazama-lf/tcs-lib'),
  parsePayloadToSchema: jest.fn(),
  applyFieldAdjustments: jest.fn(),
  validatePayloadStructure: jest.fn(),
}));

const { parsePayloadToSchema, applyFieldAdjustments, validatePayloadStructure } =
  tcsLib;

describe('PayloadParsingService', () => {
  let service: PayloadParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayloadParsingService],
    }).compile();

    service = module.get<PayloadParsingService>(PayloadParsingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parsePayloadToSchema', () => {
    it('should call parsePayloadToSchema from tcs-lib with JSON payload', async () => {
      const payload = '{"name": "test", "value": 123}';
      const contentType = ContentType.JSON;
      const filename = 'test.json';
      const mockResult = {
        fields: [
          { path: 'name', type: 'STRING', required: true },
          { path: 'value', type: 'NUMBER', required: true },
        ],
        isValid: true,
      };

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.parsePayloadToSchema(
        payload,
        contentType,
        filename,
      );

      expect(parsePayloadToSchema).toHaveBeenCalledWith(
        payload,
        contentType,
        filename,
      );
      expect(result).toEqual(mockResult);
    });

    it('should call parsePayloadToSchema with XML payload', async () => {
      const payload = '<root><name>test</name><value>123</value></root>';
      const contentType = ContentType.XML;
      const filename = 'test.xml';
      const mockResult = {
        fields: [
          { path: 'root.name', type: 'STRING', required: true },
          { path: 'root.value', type: 'NUMBER', required: true },
        ],
        isValid: true,
      };

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.parsePayloadToSchema(
        payload,
        contentType,
        filename,
      );

      expect(parsePayloadToSchema).toHaveBeenCalledWith(
        payload,
        contentType,
        filename,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle parsing without filename', async () => {
      const payload = '{"user": "john", "age": 30}';
      const contentType = ContentType.JSON;
      const mockResult = {
        fields: [
          { path: 'user', type: 'STRING', required: true },
          { path: 'age', type: 'NUMBER', required: true },
        ],
        isValid: true,
      };

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.parsePayloadToSchema(payload, contentType);

      expect(parsePayloadToSchema).toHaveBeenCalledWith(
        payload,
        contentType,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should return undefined for invalid payload', async () => {
      const payload = 'invalid json {';
      const contentType = ContentType.JSON;

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(undefined);

      const result = await service.parsePayloadToSchema(payload, contentType);

      expect(parsePayloadToSchema).toHaveBeenCalledWith(
        payload,
        contentType,
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('should handle complex nested JSON structures', async () => {
      const payload = JSON.stringify({
        transaction: {
          id: 'tx-123',
          amount: 1000,
          details: {
            currency: 'USD',
            description: 'Payment',
          },
        },
      });
      const contentType = ContentType.JSON;
      const mockResult = {
        fields: [
          { path: 'transaction.id', type: 'STRING', required: true },
          { path: 'transaction.amount', type: 'NUMBER', required: true },
          { path: 'transaction.details.currency', type: 'STRING', required: true },
          {
            path: 'transaction.details.description',
            type: 'STRING',
            required: true,
          },
        ],
        isValid: true,
      };

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.parsePayloadToSchema(
        payload,
        contentType,
        'transaction.json',
      );

      expect(result).toEqual(mockResult);
      expect(result?.fields).toHaveLength(4);
    });

    it('should handle arrays in JSON payload', async () => {
      const payload = JSON.stringify({
        items: [{ name: 'item1' }, { name: 'item2' }],
      });
      const contentType = ContentType.JSON;
      const mockResult = {
        fields: [{ path: 'items[].name', type: 'STRING', required: true }],
        isValid: true,
      };

      (parsePayloadToSchema as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.parsePayloadToSchema(payload, contentType);

      expect(result).toEqual(mockResult);
    });
  });

  describe('applyFieldAdjustments', () => {
    it('should call applyFieldAdjustments from tcs-lib with correct parameters', () => {
      const sourceFields = [
        { path: 'name', type: 'STRING', required: true },
        { path: 'age', type: 'NUMBER', required: false },
      ];
      const adjustments = [
        { path: 'name', newPath: 'fullName', newType: 'STRING' },
      ];
      const mockResult = [
        { path: 'fullName', type: 'STRING', required: true },
        { path: 'age', type: 'NUMBER', required: false },
      ];

      (applyFieldAdjustments as jest.Mock).mockReturnValue(mockResult);

      const result = service.applyFieldAdjustments(sourceFields, adjustments);

      expect(applyFieldAdjustments).toHaveBeenCalledWith(
        sourceFields,
        adjustments,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle multiple field adjustments', () => {
      const sourceFields = [
        { path: 'firstName', type: 'STRING', required: true },
        { path: 'lastName', type: 'STRING', required: true },
        { path: 'age', type: 'NUMBER', required: false },
      ];
      const adjustments = [
        { path: 'firstName', newPath: 'first_name', newType: 'STRING' },
        { path: 'lastName', newPath: 'last_name', newType: 'STRING' },
        { path: 'age', newPath: 'age', newType: 'NUMBER', required: true },
      ];
      const mockResult = [
        { path: 'first_name', type: 'STRING', required: true },
        { path: 'last_name', type: 'STRING', required: true },
        { path: 'age', type: 'NUMBER', required: true },
      ];

      (applyFieldAdjustments as jest.Mock).mockReturnValue(mockResult);

      const result = service.applyFieldAdjustments(sourceFields, adjustments);

      expect(applyFieldAdjustments).toHaveBeenCalledWith(
        sourceFields,
        adjustments,
      );
      expect(result).toEqual(mockResult);
      expect(result).toHaveLength(3);
    });

    it('should handle empty adjustments array', () => {
      const sourceFields = [
        { path: 'name', type: 'STRING', required: true },
        { path: 'value', type: 'NUMBER', required: true },
      ];
      const adjustments: any[] = [];

      (applyFieldAdjustments as jest.Mock).mockReturnValue(sourceFields);

      const result = service.applyFieldAdjustments(sourceFields, adjustments);

      expect(applyFieldAdjustments).toHaveBeenCalledWith(
        sourceFields,
        adjustments,
      );
      expect(result).toEqual(sourceFields);
    });

    it('should handle type conversions in adjustments', () => {
      const sourceFields = [
        { path: 'amount', type: 'STRING', required: true },
        { path: 'count', type: 'STRING', required: false },
      ];
      const adjustments = [
        { path: 'amount', newPath: 'amount', newType: 'NUMBER' },
        { path: 'count', newPath: 'count', newType: 'NUMBER' },
      ];
      const mockResult = [
        { path: 'amount', type: 'NUMBER', required: true },
        { path: 'count', type: 'NUMBER', required: false },
      ];

      (applyFieldAdjustments as jest.Mock).mockReturnValue(mockResult);

      const result = service.applyFieldAdjustments(sourceFields, adjustments);

      expect(result).toEqual(mockResult);
      expect(result[0].type).toBe('NUMBER');
      expect(result[1].type).toBe('NUMBER');
    });

    it('should handle nested path adjustments', () => {
      const sourceFields = [
        { path: 'user.name', type: 'STRING', required: true },
        { path: 'user.email', type: 'STRING', required: true },
      ];
      const adjustments = [
        { path: 'user.name', newPath: 'customer.full_name', newType: 'STRING' },
        { path: 'user.email', newPath: 'customer.email', newType: 'STRING' },
      ];
      const mockResult = [
        { path: 'customer.full_name', type: 'STRING', required: true },
        { path: 'customer.email', type: 'STRING', required: true },
      ];

      (applyFieldAdjustments as jest.Mock).mockReturnValue(mockResult);

      const result = service.applyFieldAdjustments(sourceFields, adjustments);

      expect(result).toEqual(mockResult);
    });
  });

  describe('validatePayloadStructure', () => {
    it('should call validatePayloadStructure from tcs-lib for JSON payload', async () => {
      const payload = '{"name": "test", "value": 123}';
      const contentType = ContentType.JSON;
      const mockValidation = {
        isValid: true,
        errors: [],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(validatePayloadStructure).toHaveBeenCalledWith(
        payload,
        contentType,
      );
      expect(result).toEqual(mockValidation);
      expect(result.isValid).toBe(true);
    });

    it('should return validation errors for invalid JSON', async () => {
      const payload = 'invalid json {';
      const contentType = ContentType.JSON;
      const mockValidation = {
        isValid: false,
        errors: ['Invalid JSON format: Unexpected token'],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(validatePayloadStructure).toHaveBeenCalledWith(
        payload,
        contentType,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should validate XML payload structure', async () => {
      const payload = '<root><name>test</name><value>123</value></root>';
      const contentType = ContentType.XML;
      const mockValidation = {
        isValid: true,
        errors: [],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(validatePayloadStructure).toHaveBeenCalledWith(
        payload,
        contentType,
      );
      expect(result.isValid).toBe(true);
    });

    it('should return validation errors for malformed XML', async () => {
      const payload = '<root><name>test</name></root>';
      const contentType = ContentType.XML;
      const mockValidation = {
        isValid: false,
        errors: ['Unclosed tag: name'],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unclosed tag: name');
    });

    it('should handle complex nested JSON validation', async () => {
      const payload = JSON.stringify({
        transaction: {
          id: 'tx-123',
          amount: 1000,
          metadata: {
            source: 'web',
            timestamp: '2025-01-01T00:00:00Z',
          },
        },
      });
      const contentType = ContentType.JSON;
      const mockValidation = {
        isValid: true,
        errors: [],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle empty payload validation', async () => {
      const payload = '';
      const contentType = ContentType.JSON;
      const mockValidation = {
        isValid: false,
        errors: ['Empty payload'],
      };

      (validatePayloadStructure as jest.Mock).mockResolvedValue(mockValidation);

      const result = await service.validatePayloadStructure(
        payload,
        contentType,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Empty payload');
    });
  });
});
