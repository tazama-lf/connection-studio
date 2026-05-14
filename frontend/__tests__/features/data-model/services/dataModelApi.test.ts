import { dataModelApi } from '../../../../src/features/data-model/services/dataModelApi';

const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('DataModelApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('dm-token');
  });

  // ─── getSchema ────────────────────────────────────────────────────────────
  describe('getSchema', () => {
    it('returns schema data on success', async () => {
      const mockData = { success: true, schemas: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getSchema();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/schema'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });

    it('returns error data on 401 and clears tokens', async () => {
      const errorData = { success: false, message: 'Unauthorized' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorData,
      });

      const result = await dataModelApi.getSchema();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
      expect(result).toEqual(errorData);
    });

    it('returns error data on 4xx (not 401)', async () => {
      const errorData = { message: 'Not found' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorData,
      });

      const result = await dataModelApi.getSchema();

      expect(result).toEqual(errorData);
    });

    it('throws on 5xx', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      await expect(dataModelApi.getSchema()).rejects.toThrow('Server error');
    });

    it('returns unauthorized fallback when 401 json parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      });

      const result = await dataModelApi.getSchema();

      expect(result).toEqual({ success: false, message: 'Unauthorized' });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('returns empty 4xx error object when json parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      });

      const result = await dataModelApi.getSchema();

      expect(result).toEqual({});
    });

    it('throws fallback status error on 5xx when json parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: jest.fn().mockRejectedValue(new Error('bad json')),
      });

      await expect(dataModelApi.getSchema()).rejects.toThrow(
        'HTTP error! status: 503',
      );
    });
  });

  // ─── getDestinationPaths ──────────────────────────────────────────────────
  describe('getDestinationPaths', () => {
    it('returns destination paths on success', async () => {
      const mockData = { success: true, paths: ['entity.id', 'account.id'] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getDestinationPaths();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/destination-paths'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });

    it('returns error data on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      const result = await dataModelApi.getDestinationPaths();
      expect(result).toEqual({ success: false, message: 'Unauthorized' });
    });
  });

  // ─── getAllExtensions ─────────────────────────────────────────────────────
  describe('getAllExtensions', () => {
    it('returns extensions list', async () => {
      const mockData = { success: true, extensions: [] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getAllExtensions();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });

    it('throws on 5xx', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ message: 'Service unavailable' }),
      });

      await expect(dataModelApi.getAllExtensions()).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  // ─── getExtensionsByCollection ────────────────────────────────────────────
  describe('getExtensionsByCollection', () => {
    it('fetches extensions for a collection', async () => {
      const mockData = { success: true, extensions: [{ id: 1 }] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getExtensionsByCollection('entities');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions/collection/entities'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── getExtensionById ─────────────────────────────────────────────────────
  describe('getExtensionById', () => {
    it('fetches extension by id', async () => {
      const mockData = { success: true, extension: { id: 42 } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getExtensionById('42');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions/42'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── createExtension ─────────────────────────────────────────────────────
  describe('createExtension', () => {
    const createRequest = {
      collection: 'entities' as const,
      fieldName: 'customField',
      fieldType: 'STRING' as const,
    };

    it('creates extension successfully', async () => {
      const mockData = { success: true, extension: { id: 1 } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockData,
      });

      const result = await dataModelApi.createExtension(createRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createRequest),
        }),
      );
      expect(result).toEqual(mockData);
    });

    it('throws on create failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Validation failed',
      });

      await expect(dataModelApi.createExtension(createRequest)).rejects.toThrow(
        'HTTP 422: Validation failed',
      );
    });
  });

  // ─── updateExtension ─────────────────────────────────────────────────────
  describe('updateExtension', () => {
    const updateRequest = { description: 'updated desc', isRequired: true };

    it('updates extension successfully', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.updateExtension(5, updateRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions/5'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
        }),
      );
      expect(result).toEqual(mockData);
    });

    it('returns error data on 4xx', async () => {
      const errorData = { message: 'Bad request' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      const result = await dataModelApi.updateExtension(5, updateRequest);
      expect(result).toEqual(errorData);
    });
  });

  // ─── deleteExtension ─────────────────────────────────────────────────────
  describe('deleteExtension', () => {
    it('deletes extension successfully', async () => {
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.deleteExtension(7);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/extensions/7'),
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result).toEqual(mockData);
    });

    it('throws on 5xx delete error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal error' }),
      });

      await expect(dataModelApi.deleteExtension(7)).rejects.toThrow(
        'Internal error',
      );
    });
  });

  // ─── validateDestination ─────────────────────────────────────────────────
  describe('validateDestination', () => {
    it('validates destination path', async () => {
      const mockData = { success: true, data: { isValid: true } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.validateDestination('entity.id');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/data-model/validate-destination'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ path: 'entity.id' }),
        }),
      );
      expect(result).toEqual(mockData);
    });

    it('returns invalid result for bad path', async () => {
      const mockData = {
        success: false,
        data: { isValid: false, message: 'Path not found' },
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.validateDestination('invalid.path');
      expect(result).toEqual(mockData);
    });
  });

  // ─── createImmediateParent ────────────────────────────────────────────────
  describe('createImmediateParent', () => {
    it('creates immediate parent node successfully', async () => {
      const request = {
        collection_type: 'entities',
        name: 'customObject',
        description: 'A custom object',
        destination_id: 5,
      };
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.createImmediateParent(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tazama-data-model/destination-types'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── createParentChildDestination ────────────────────────────────────────
  describe('createParentChildDestination', () => {
    it('creates parent-child destination successfully', async () => {
      const request = {
        name: 'childField',
        field_type: 'STRING',
        parent_id: '1',
      };
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.createParentChildDestination(
        3,
        request,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/tazama-data-model/destination-types/3/fields',
        ),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── getDestinationFieldsJson ─────────────────────────────────────────────
  describe('getDestinationFieldsJson', () => {
    it('fetches destination fields JSON', async () => {
      const mockData = { success: true, data: { entities: { id: 'STRING' } } };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.getDestinationFieldsJson();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tazama-data-model/json'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── updateDestinationFieldsJson ──────────────────────────────────────────
  describe('updateDestinationFieldsJson', () => {
    it('updates destination fields JSON', async () => {
      const data = { entities: { id: 'STRING' as any } };
      const mockData = { success: true };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await dataModelApi.updateDestinationFieldsJson(data);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tazama-data-model/json'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ data_model_json: data }),
        }),
      );
      expect(result).toEqual(mockData);
    });
  });

  // ─── auth header ─────────────────────────────────────────────────────────
  describe('auth headers', () => {
    it('includes Authorization header when token exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await dataModelApi.getSchema();

      const calledHeaders = (global.fetch as jest.Mock).mock.calls[0][1]
        .headers;
      expect(calledHeaders['Authorization']).toBe('Bearer dm-token');
    });

    it('omits Authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await dataModelApi.getSchema();

      const calledHeaders = (global.fetch as jest.Mock).mock.calls[0][1]
        .headers;
      expect(calledHeaders['Authorization']).toBeUndefined();
    });
  });
});
