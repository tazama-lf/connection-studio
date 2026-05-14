import { configApi } from '@features/config/services/configApi';
import type {
  CreateConfigRequest,
  ConfigResponse,
} from '@features/config/services/configApi';

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
  writable: true,
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
        schema: { properties: { amount: { type: 'number' } } } as any,
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
            Accept: 'application/json',
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

      await expect(
        configApi.updateConfig(mockConfigId, mockUpdateData),
      ).rejects.toThrow('Unauthorized');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/config/${mockConfigId}`),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );
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

    it('should return empty object for 4xx response when json parsing fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      } as any);

      const result = await configApi.updateConfig(mockConfigId, {});
      expect(result).toEqual({});
    });

    it('should throw fallback HTTP error for 5xx response without message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as any);

      await expect(configApi.updateConfig(mockConfigId, {})).rejects.toThrow(
        'HTTP error! status: 500',
      );
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
          schema: {} as any,
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
      expect(result.config?.mapping).toContainEqual(mockMappingRequest);
    });

    it('should handle concatenation mapping with multiple sources', async () => {
      const concatenationMapping = {
        source: ['customer.firstName', 'customer.lastName'],
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

    it('should normalize direct config object response into success shape', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: mockConfigId, transactionType: 'payment' }),
      } as Response);

      const result = await configApi.getConfig(mockConfigId);
      expect(result.success).toBe(true);
      expect(result.config?.id).toBe(mockConfigId);
    });

    it('should return invalid response format for non-object payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 'unexpected',
      } as any);

      const result = await configApi.getConfig(mockConfigId);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid response format');
    });

    it('should catch network errors and return failure response', async () => {
      mockFetch.mockRejectedValue(new Error('boom'));

      const result = await configApi.getConfig(mockConfigId);
      expect(result.success).toBe(false);
      expect(result.message).toBe('boom');
    });
  });

  describe('additional API methods', () => {
    it('createConfig and cloneConfig post to expected endpoints', async () => {
      const mockResponse = { success: true, message: 'ok' };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      await expect(
        configApi.createConfig({ transactionType: 'tt' }),
      ).resolves.toEqual(mockResponse);
      await expect(
        configApi.cloneConfig({ sourceConfigId: 1, newTransactionType: 'tt2' }),
      ).resolves.toEqual(mockResponse);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3000/config',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3000/config/clone',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('createConfigFromFile sends multipart data with auth header when token exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'uploaded' }),
      } as Response);

      const file = new File(['{}'], 'payload.json', {
        type: 'application/json',
      });

      const result = await configApi.createConfigFromFile(
        file,
        'ISO20022',
        'payment',
        '1.0.0',
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/config/upload',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer test-auth-token' },
          body: expect.any(FormData),
        }),
      );
    });

    it('createConfigFromFile omits auth header when token is missing', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'uploaded' }),
      } as Response);

      const file = new File(['{}'], 'payload.json', {
        type: 'application/json',
      });

      await configApi.createConfigFromFile(
        file,
        'ISO20022',
        'payment',
        '1.0.0',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/config/upload',
        expect.objectContaining({
          method: 'POST',
          headers: {},
          body: expect.any(FormData),
        }),
      );
    });

    it('getAllConfigs handles array and wrapped response formats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 1 }],
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, configs: [{ id: 2 }] }),
      } as any);

      await expect(configApi.getAllConfigs()).resolves.toEqual({
        configs: [{ id: 1 }],
      });
      await expect(configApi.getAllConfigs()).resolves.toEqual({
        configs: [{ id: 2 }],
      });
    });

    it('getAllConfigs handles object with non-array configs property', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, configs: 'not-an-array' }),
      } as any);

      const result = await configApi.getAllConfigs();
      expect(result.configs).toEqual([]);
    });

    it('getAllConfigs falls back to empty array for object without configs property', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any);

      const result = await configApi.getAllConfigs();
      expect(result.configs).toEqual([]);
    });

    it('getConfigsPaginated uses user-role LOV when status is omitted', async () => {
      const paginated = {
        success: true,
        configs: [],
        total: 0,
        limit: 10,
        offset: 0,
        pages: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => paginated,
      } as any);

      const result = await configApi.getConfigsPaginated(
        { limit: 10, offset: 0, userRole: 'editor' },
        { search: 'abc' },
      );

      expect(result).toEqual(paginated);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/config/0/10',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('STATUS_01_IN_PROGRESS'),
        }),
      );
    });

    it('getConfigsPaginated uses provided status when present', async () => {
      const paginated = {
        success: true,
        configs: [{ id: 1 }],
        total: 1,
        limit: 5,
        offset: 5,
        pages: 1,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => paginated,
      } as any);

      const result = await configApi.getConfigsPaginated(
        { limit: 5, offset: 5, userRole: 'editor' },
        { status: 'STATUS_04_APPROVED', transactionType: 'payment' },
      );

      expect(result).toEqual(paginated);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/config/5/5',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            transactionType: 'payment',
            status: 'STATUS_04_APPROVED',
          }),
        }),
      );
    });

    it('getConfigsPaginated throws when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as any);

      await expect(
        configApi.getConfigsPaginated(
          { limit: 10, offset: 0, userRole: 'editor' },
          {},
        ),
      ).rejects.toThrow('Failed to fetch paginated configs');
    });

    it('getPendingApprovals handles wrapped, array, and fallback responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, configs: [{ id: 7 }] }),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 8 }],
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, configs: 'bad' }),
      } as any);

      await expect(configApi.getPendingApprovals()).resolves.toEqual({
        configs: [{ id: 7 }],
      });
      await expect(configApi.getPendingApprovals()).resolves.toEqual({
        configs: [{ id: 8 }],
      });
      await expect(configApi.getPendingApprovals()).resolves.toEqual({
        configs: [],
      });
    });

    it('getPendingApprovals falls back to empty configs for non-array non-configs response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      } as any);

      const result = await configApi.getPendingApprovals();
      expect(result.configs).toEqual([]);
    });

    it('getConfigsByTransactionType and getConfigsByEndpoint return wrapped configs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 11 }],
      } as any);

      await expect(
        configApi.getConfigsByTransactionType('pay/ment'),
      ).resolves.toEqual({ configs: [{ id: 11 }] });

      await expect(configApi.getConfigsByEndpoint('abc/def')).resolves.toEqual({
        configs: [{ id: 11 }],
      });

      await expect(configApi.getConfigsByEndpoint()).resolves.toEqual({
        configs: [{ id: 11 }],
      });
    });

    it('removeMapping, update status APIs, and deleteConfig no-content path work', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'removed' }),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'status' }),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'publish' }),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      } as any);

      await expect(configApi.removeMapping(1, 0)).resolves.toEqual({
        success: true,
        message: 'removed',
      });

      await expect(
        configApi.updateConfigStatus(1, 'STATUS_04_APPROVED'),
      ).resolves.toEqual({
        success: true,
        message: 'status',
      });

      await expect(
        configApi.updatePublishingStatus(1, 'active'),
      ).resolves.toEqual({
        success: true,
        message: 'publish',
      });

      await expect(configApi.deleteConfig(1)).resolves.toBeUndefined();
    });

    it('deleteConfig calls handleResponse when status is not 204', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as any);

      await expect(configApi.deleteConfig(99)).resolves.toBeUndefined();
    });

    it('workflow wrappers call updateWorkflow and return responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'ok' }),
      } as any);

      await expect(
        configApi.updateWorkflow(1, 'submit', { foo: 'bar' }),
      ).resolves.toEqual({ success: true, message: 'ok' });

      await expect(configApi.submitForApproval(1, 'user-1')).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.approveConfig(1, 'approved')).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.rejectConfig(1, 'u1')).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.exportConfig(1)).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.deployConfig(1)).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.returnToProgress(1)).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.requestChanges(1, 'fix me')).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      await expect(configApi.updateStatusToExported(1)).resolves.toEqual({
        success: true,
        message: 'ok',
      });
    });

    it('workflow wrappers cover custom optional payload branches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'ok' }),
      } as any);

      await expect(
        configApi.submitForApproval(5, 'user-9', 'reviewer', 'please review'),
      ).resolves.toEqual({ success: true, message: 'ok' });

      await expect(
        configApi.rejectConfig(5, 'user-9', 'not valid'),
      ).resolves.toEqual({ success: true, message: 'ok' });

      await expect(
        configApi.exportConfig(5, 'ready to export'),
      ).resolves.toEqual({ success: true, message: 'ok' });

      await expect(configApi.deployConfig(5, 'deploying now')).resolves.toEqual(
        { success: true, message: 'ok' },
      );

      await expect(
        configApi.updateStatusToExported(5, 'manual export'),
      ).resolves.toEqual({ success: true, message: 'ok' });
    });

    it('getWorkflowStatus returns workflow status payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'STATUS_04_APPROVED' }),
      } as any);

      await expect(configApi.getWorkflowStatus(1)).resolves.toEqual({
        status: 'STATUS_04_APPROVED',
      });
    });

    it('getConfigsByStatus filters approved and exported statuses from wrapped response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          configs: [
            { id: 1, status: 'approved' },
            { id: 2, status: 'STATUS_04_APPROVED' },
            { id: 3, status: 'exported' },
            { id: 4, status: 'STATUS_06_EXPORTED' },
            { id: 5, status: 'rejected' },
          ],
        }),
      } as any);

      const approved = await configApi.getConfigsByStatus('approved');
      expect(approved.configs.map((c: any) => c.id)).toEqual([1, 2]);

      const exported = await configApi.getConfigsByStatus('exported');
      expect(exported.configs.map((c: any) => c.id)).toEqual([3, 4]);
    });

    it('getConfigsByStatus filters by various case formats from array response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { id: 1, status: 'approved' },
          { id: 2, status: 'STATUS_04_APPROVED' },
          { id: 3, status: 'status_04_approved' },
          { id: 4, status: 'APPROVED_version' },
          { id: 5, status: 'exported' },
          { id: 6, status: 'STATUS_06_EXPORTED' },
          { id: 7, status: 'status_06_exported' },
          { id: 8, status: 'EXPORTED_build' },
          { id: 9, status: 'pending' },
        ],
      } as any);

      const approved = await configApi.getConfigsByStatus('approved');
      expect(approved.configs.map((c: any) => c.id)).toEqual([1, 2, 3, 4]);

      const exported = await configApi.getConfigsByStatus('exported');
      expect(exported.configs.map((c: any) => c.id)).toEqual([5, 6, 7, 8]);
    });

    it('getConfigsByStatus with unrecognized status returns empty array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          { id: 1, status: 'DRAFT' },
          { id: 2, status: 'pending' },
        ],
      } as any);

      const result = await configApi.getConfigsByStatus('archived' as any);
      expect(result.configs).toEqual([]);
    });

    it('updateWorkflow sends empty object body when payload is undefined', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'ok' }),
      } as any);

      await expect(configApi.updateWorkflow(22, 'submit')).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/22/workflow?action=submit'),
        expect.objectContaining({
          body: JSON.stringify({}),
        }),
      );
    });

    it('approveConfig uses default empty comment', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'ok' }),
      } as any);

      await expect(configApi.approveConfig(10)).resolves.toEqual({
        success: true,
        message: 'ok',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/10/workflow?action=approve'),
        expect.objectContaining({
          body: JSON.stringify({ comment: '' }),
        }),
      );
    });

    it('getConfigsByStatus handles wrapped response with non-array configs and empty status string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, configs: 'bad' }),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { id: 1, status: '' },
          { id: 2, status: 'approved' },
        ],
      } as any);

      const wrapped = await configApi.getConfigsByStatus('approved');
      expect(wrapped.configs).toEqual([]);

      const withEmptyStatus = await configApi.getConfigsByStatus('approved');
      expect(withEmptyStatus.configs.map((c: any) => c.id)).toEqual([2]);
    });

    it('getConfig returns fallback unknown error when non-Error is thrown', async () => {
      mockFetch.mockRejectedValue('non-error');

      const result = await configApi.getConfig(77);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('handleResponse removes auth token on 401 with parseable json', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      } as any);

      await expect(configApi.updateConfig(1, {})).rejects.toThrow(
        'Unauthorized',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('handleResponse: 401 with unparseable JSON body uses fallback Invalid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      } as any);

      await expect(configApi.updateConfig(1, {})).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('handleResponse: 500 response throws instead of returning and getConfig catches it', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server Error' }),
      } as any);

      const result = await configApi.getConfig(123);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Server Error');
    });

    it('handleResponse: 401 with no message in response uses Invalid credentials fallback', async () => {
      // Covers branch: errorData.message ?? 'Invalid credentials' (right side)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      } as any);

      await expect(configApi.updateConfig(1, {})).rejects.toThrow(
        'Invalid credentials',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('getConfigsPaginated works without searchingFilters argument (uses ?? {} fallback)', async () => {
      // Covers branch: searchingFilters ?? {} (right side when searchingFilters is undefined)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          configs: [],
          total: 0,
          limit: 10,
          offset: 0,
          pages: 0,
        }),
      } as any);

      const result = await configApi.getConfigsPaginated({
        limit: 10,
        offset: 0,
        userRole: 'editor',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/config/0/10',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toBeDefined();
    });

    it('getConfigsByStatus returns empty configs when response is a primitive (not object or array)', async () => {
      // Covers branch: typeof responseData !== 'object' (the else-if condition is false)
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 42,
      } as any);

      const result = await configApi.getConfigsByStatus('approved');
      expect(result.configs).toEqual([]);
    });
  });

  describe('getConfigsPaginated with status filter', () => {
    it('uses provided status instead of computing from role LOV', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          configs: [{ id: 1 }],
          total: 1,
          pages: 1,
        }),
      } as Response);

      await configApi.getConfigsPaginated(
        { offset: 0, limit: 10, userRole: 'editor' },
        { status: 'active' },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/0/10'),
        expect.objectContaining({
          body: expect.stringContaining('"status":"active"'),
        }),
      );
    });
  });
});
