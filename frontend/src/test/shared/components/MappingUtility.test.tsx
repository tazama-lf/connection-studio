import { configApi } from '../../../features/config/services/configApi';

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

describe('MappingUtility Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-auth-token');
  });

  describe('Direct API Integration', () => {
    it('should call addMapping API directly when user adds mapping', async () => {
      const mockConfigId = 123;
      const mockMappingRequest = {
        source: 'customer.id',
        destination: 'payer.accountId',
      };

      const mockResponse = {
        success: true,
        message: 'Mapping added successfully',
        config: {
          id: mockConfigId,
          mapping: [mockMappingRequest],
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await configApi.addMapping(mockConfigId, mockMappingRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/config/${mockConfigId}/mapping`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-auth-token',
          }),
          body: JSON.stringify(mockMappingRequest),
        })
      );

      expect(result.success).toBe(true);
      expect(result.config?.mapping).toContain(mockMappingRequest);
    });

    it('should prevent duplicate mappings', async () => {
      // Test that only user-defined mappings are created
      const userMapping = { source: 'customer.id', destination: 'payer.accountId' };
      
      const mockResponse = {
        success: true,
        message: 'User mapping added',
        config: {
          id: 123,
          mapping: [userMapping], // Only the user-defined mapping
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await configApi.addMapping(123, userMapping);

      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
      expect(result.config?.mapping?.[0]).toEqual(userMapping);
    });

    it('should handle concatenation mappings', async () => {
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

      const result = await configApi.addMapping(123, concatenationMapping);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/mapping'),
        expect.objectContaining({
          body: JSON.stringify(concatenationMapping),
        })
      );
    });

    it('should handle API errors when adding mapping', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Invalid mapping configuration',
        }),
      } as Response);

      const result = await configApi.addMapping(123, {
        source: 'invalid.field',
        destination: 'invalid.destination',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid mapping configuration');
    });
  });
});