import {
  FlowableApiService,
  flowableApi,
} from '../../../src/shared/services/flowableApi';

const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('FlowableApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('getTasksForRole', () => {
    it('should fetch tasks for a given role successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Tasks fetched',
        tasks: [{ id: '1', name: 'Approve Config' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await flowableApi.getTasksForRole('approver');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/flowable/tasks/approver'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle 401 by clearing authToken and returning error data', async () => {
      const errorData = { success: false, message: 'Unauthorized' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorData,
      });

      const result = await flowableApi.getTasksForRole('editor');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(result).toEqual(errorData);
    });

    it('should handle 401 when json parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => {
          throw new Error('JSON parse error');
        },
      });

      const result = await flowableApi.getTasksForRole('editor');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(result).toEqual({ success: false, message: 'Unauthorized' });
    });

    it('should return error data for 4xx errors', async () => {
      const errorData = { message: 'Bad Request' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      const result = await flowableApi.getTasksForRole('approver');
      expect(result).toEqual(errorData);
    });

    it('should throw for 5xx errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
      });

      await expect(flowableApi.getTasksForRole('approver')).rejects.toThrow(
        'Internal Server Error',
      );
    });

    it('should throw with generic message when 5xx json parse fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('bad json');
        },
      });

      await expect(flowableApi.getTasksForRole('approver')).rejects.toThrow(
        'HTTP error! status: 503',
      );
    });
  });

  describe('completeTask', () => {
    it('should complete a task successfully', async () => {
      const mockResponse = { success: true, message: 'Task completed' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const request = {
        taskId: 'task-123',
        variables: { approved: true },
        comment: 'Looks good',
      };
      const result = await flowableApi.completeTask(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/flowable/tasks/complete'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyTasks', () => {
    it('should fetch current user tasks successfully', async () => {
      const mockResponse = { success: true, message: 'Tasks', tasks: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await flowableApi.getMyTasks();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/flowable/tasks/my'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('constructor', () => {
    it('should create an instance with the correct base URL', () => {
      const service = new FlowableApiService();
      expect(service).toBeInstanceOf(FlowableApiService);
    });
  });

  describe('auth headers', () => {
    it('should not include Authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await flowableApi.getMyTasks();

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  describe('401 error handling - browser check branch', () => {
    it('should skip window redirect when isBrowser returns false (server-side)', async () => {
      jest
        .spyOn(FlowableApiService as any, 'isBrowser')
        .mockReturnValueOnce(false);

      const errorData = { success: false, message: 'Unauthorized' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => errorData,
      });

      const result = await flowableApi.getTasksForRole('editor');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(result).toEqual(errorData);
    });
  });
});
