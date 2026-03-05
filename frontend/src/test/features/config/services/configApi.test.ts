import { configApi } from '../../../../features/config/services/configApi';
import type {
  CreateConfigRequest,
  ConfigResponse,
} from '../../../../features/config/services/configApi';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage for auth token
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ConfigApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-auth-token');
  });

  describe('updateConfig', () => {
    const mockConfigId = 123;
    const mockUpdateData: Partial<CreateConfigRequest> = {
      transactionType: 'payment',
      version: '2.0',
      payload: '{"amount": 100}',
      contentType: 'application/json',
    };

    const mockSuccessResponse: ConfigResponse = {
      success: true,
      message: 'Configuration updated successfully',
      config: {
        id: mockConfigId,
        msgFam: 'ISO20022',
        transactionType: 'payment',
        endpointPath: '/api/payment',
        version: '2.0',
        contentType: 'application/json',
        schema: { properties: { amount: { type: 'number' } } },
        mapping: [{ source: 'amount', destination: 'transaction.amount' }],
        status: 'active',
        tenantId: 'test-tenant',
        createdBy: 'test-user',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    };

    it('should successfully update configuration with valid data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await configApi.updateConfig(mockConfigId, mockUpdateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/config/${mockConfigId}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-auth-token',
          }),
          body: JSON.stringify(mockUpdateData),
        }),
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(result.success).toBe(true);
      expect(result.config?.id).toBe(mockConfigId);
    });

    it('should handle update with partial data (only transactionType)', async () => {
      const partialData: Partial<CreateConfigRequest> = {
        transactionType: 'transfer',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockSuccessResponse,
          config: {
            ...mockSuccessResponse.config!,
            transactionType: 'transfer',
          },
        }),
      } as Response);

      const result = await configApi.updateConfig(mockConfigId, partialData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/config/${mockConfigId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(partialData),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.config?.transactionType).toBe('transfer');
    });

    it('should handle server error response', async () => {
      const errorResponse = {
        success: false,
        message: 'Configuration not found',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      } as Response);

      const result = await configApi.updateConfig(mockConfigId, mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Configuration not found');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        configApi.updateConfig(mockConfigId, mockUpdateData),
      ).rejects.toThrow('Network error');
    });

    it('should handle missing auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      } as Response);

      const result = await configApi.updateConfig(mockConfigId, mockUpdateData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/config/${mockConfigId}`),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });

    it('should update configuration with mapping data', async () => {
      const updateWithMapping: Partial<CreateConfigRequest> = {
        transactionType: 'payment',
        payload: '{"customer": {"id": "123"}}',
        mapping: [
          { source: 'customer.id', destination: 'payer.accountId' },
          { source: 'amount', destination: 'transaction.amount' },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockSuccessResponse,
          config: {
            ...mockSuccessResponse.config!,
            mapping: updateWithMapping.mapping,
          },
        }),
      } as Response);

      const result = await configApi.updateConfig(
        mockConfigId,
        updateWithMapping,
      );

      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(2);
      expect(result.config?.mapping?.[0]).toEqual({
        source: 'customer.id',
        destination: 'payer.accountId',
      });
    });

    it('should handle validation errors in response', async () => {
      const validationErrorResponse: ConfigResponse = {
        success: false,
        message: 'Validation failed',
        validation: {
          success: false,
          errors: [
            'Invalid payload format',
            'Missing required field: transactionType',
          ],
          warnings: ['Deprecated version used'],
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => validationErrorResponse,
      } as Response);

      const result = await configApi.updateConfig(mockConfigId, {
        payload: 'invalid-json',
      });

      expect(result.success).toBe(false);
      expect(result.validation?.errors).toContain('Invalid payload format');
      expect(result.validation?.warnings).toContain('Deprecated version used');
    });
  });

  describe('addMapping', () => {
    const mockConfigId = 123;
    const mockMappingRequest = {
      source: 'customer.id',
      destination: 'payer.accountId',
    };

    it('should successfully add mapping to configuration', async () => {
      const mockResponse: ConfigResponse = {
        success: true,
        message: 'Mapping added successfully',
        config: {
          id: mockConfigId,
          msgFam: 'ISO20022',
          transactionType: 'payment',
          endpointPath: '/api/payment',
          version: '1.0',
          contentType: 'application/json',
          schema: {},
          mapping: [mockMappingRequest],
          status: 'active',
          tenantId: 'test-tenant',
          createdBy: 'test-user',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await configApi.addMapping(
        mockConfigId,
        mockMappingRequest,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/config/${mockConfigId}/mapping`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockMappingRequest),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.config?.mapping).toContain(mockMappingRequest);
    });

    it('should handle concatenation mapping with multiple sources', async () => {
      const concatenationMapping = {
        sources: ['customer.firstName', 'customer.lastName'],
        destination: 'payer.fullName',
        separator: ' ',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Concatenation mapping added',
          config: { mapping: [concatenationMapping] },
        }),
      } as Response);

      const result = await configApi.addMapping(
        mockConfigId,
        concatenationMapping,
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify(concatenationMapping),
        }),
      );
    });
  });

  describe('getConfig', () => {
    const mockConfigId = 123;

    it('should successfully retrieve configuration by ID', async () => {
      const mockConfig = {
        success: true,
        message: 'Configuration retrieved successfully',
        config: {
          id: mockConfigId,
          transactionType: 'payment',
          mapping: [{ source: 'amount', destination: 'transaction.amount' }],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      } as Response);

      const result = await configApi.getConfig(mockConfigId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/config/${mockConfigId}`),
        expect.objectContaining({ method: 'GET' }),
      );

      expect(result.success).toBe(true);
      expect(result.config?.id).toBe(mockConfigId);
    });

    it('should handle configuration not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          message: 'Configuration not found',
        }),
      } as Response);

      const result = await configApi.getConfig(999);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Configuration not found');
    });
  });
});
