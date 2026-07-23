import {
  addFunction,
  updateFunction,
  deleteFunction,
  getConfigWithFunctions,
} from '../../../../src/features/functions/services/functionsApi';

const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('functionsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('func-token');
  });

  describe('addFunction', () => {
    const functionData = {
      name: 'addAccount' as const,
      parameters: { accountId: '{{entity.id}}' },
    };

    it('should add a function to a config successfully', async () => {
      const mockResponse = { success: true, function: functionData };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await addFunction(1, functionData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/1/function'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(functionData),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Validation error',
      });

      await expect(addFunction(1, functionData)).rejects.toThrow(
        'HTTP error! status: 400, body: Validation error',
      );
    });

    it('should include Authorization header when token present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await addFunction(42, functionData);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBe('Bearer func-token');
    });

    it('should not include Authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await addFunction(1, functionData);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  describe('updateFunction', () => {
    const functionData = {
      name: 'addEntity' as const,
      parameters: { entityId: '{{entity.id}}' },
    };

    it('should update a function successfully', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await updateFunction(5, 2, functionData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/5/function/2'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(functionData),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error when update fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(updateFunction(1, 0, functionData)).rejects.toThrow(
        'HTTP error! status: 404',
      );
    });
  });

  describe('deleteFunction', () => {
    it('should delete a function successfully', async () => {
      const mockResponse = { success: true };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await deleteFunction(3, 1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/3/function/1'),
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error when delete fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(deleteFunction(1, 0)).rejects.toThrow(
        'HTTP error! status: 403',
      );
    });
  });

  describe('getConfigWithFunctions', () => {
    it('should get config with functions successfully', async () => {
      const mockConfig = {
        id: 1,
        name: 'Test Config',
        functions: [{ name: 'addAccount', parameters: {} }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      });

      const result = await getConfigWithFunctions(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/1'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockConfig);
    });

    it('should throw when request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(getConfigWithFunctions(1)).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });
  });
});
