import { getAuthHeaders, apiRequest } from '../../src/utils/common/apiHelper';

// Mock localStorage from jest.setup.ts (already globally mocked)
const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('apiHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('getAuthHeaders', () => {
    it('should return Content-Type and Accept headers without auth token when no token in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const headers = getAuthHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should include Authorization header when token exists in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('my-auth-token');

      const headers = getAuthHeaders();

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer my-auth-token');
    });

    it('should not include Authorization when token is empty string', () => {
      mockLocalStorage.getItem.mockReturnValue('');

      const headers = getAuthHeaders();

      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('apiRequest', () => {
    it('should make a fetch request with merged auth headers', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'result' }),
      });

      const result = await apiRequest<{ data: string }>('http://localhost:3000/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual({ data: 'result' });
    });

    it('should throw and remove authToken on 401 response', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(
        apiRequest('http://localhost:3000/api/secret'),
      ).rejects.toThrow('Authentication failed');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    });

    it('should throw with error message from response body on non-ok response', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Bad Request: invalid input' }),
      });

      await expect(
        apiRequest('http://localhost:3000/api/test'),
      ).rejects.toThrow('Bad Request: invalid input');
    });

    it('should throw generic HTTP error when response body has no message', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(
        apiRequest('http://localhost:3000/api/test'),
      ).rejects.toThrow('HTTP error! status: 500');
    });

    it('should throw generic HTTP error when response body JSON parse fails', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => { throw new Error('invalid json'); },
      });

      await expect(
        apiRequest('http://localhost:3000/api/test'),
      ).rejects.toThrow('HTTP error! status: 503');
    });

    it('should merge custom headers with auth headers', async () => {
      mockLocalStorage.getItem.mockReturnValue('tok');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'X-Custom': 'yes' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Custom': 'yes',
            Authorization: 'Bearer tok',
          }),
        }),
      );
    });

    it('should return parsed JSON data on success', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      const responseData = { id: 1, name: 'Test' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await apiRequest<typeof responseData>('http://localhost/api');

      expect(result).toEqual(responseData);
    });
  });
});
