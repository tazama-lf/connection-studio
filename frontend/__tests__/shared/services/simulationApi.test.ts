import { SimulationApiService, simulationApi } from '../../../src/shared/services/simulationApi';

const mockLocalStorage = global.localStorage as jest.Mocked<Storage>;

describe('SimulationApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    mockLocalStorage.getItem.mockReturnValue('valid-token');
  });

  describe('runSimulation', () => {
    const simulateRequest = {
      configId: 1,
      payloadType: 'json' as const,
      testPayload: '{"amount": 100}',
    };

    it('should run simulation successfully', async () => {
      const mockResult = {
        status: 'PASSED',
        errors: [],
        stages: [],
        tcsResult: null,
        transformedPayload: {},
        summary: {
          endpointId: 1,
          tenantId: 'tenant-1',
          timestamp: '2024-01-01',
          mappingsApplied: 5,
          totalStages: 3,
          passedStages: 3,
          failedStages: 0,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const result = await simulationApi.runSimulation(simulateRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/simulation/run'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(simulateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        }),
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle 401 by throwing Unauthorized error and clearing token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(simulationApi.runSimulation(simulateRequest)).rejects.toThrow(
        'Unauthorized - Token expired',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should return error data for 4xx client errors', async () => {
      const errorData = { message: 'Bad payload', valid: false };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      const result = await simulationApi.runSimulation(simulateRequest);
      expect(result).toEqual(errorData);
    });

    it('should throw for 5xx server errors with message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Error' }),
      });

      await expect(simulationApi.runSimulation(simulateRequest)).rejects.toThrow(
        'Internal Error',
      );
    });

    it('should throw generic error for 5xx when json parse fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => { throw new Error('bad json'); },
      });

      await expect(simulationApi.runSimulation(simulateRequest)).rejects.toThrow(
        'HTTP error! status: 503',
      );
    });
  });

  describe('validatePayload', () => {
    const validateRequest = {
      configId: 2,
      payloadType: 'xml' as const,
      testPayload: '<data><amount>100</amount></data>',
    };

    it('should validate payload successfully', async () => {
      const mockResult = {
        valid: true,
        errors: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const result = await simulationApi.validatePayload(validateRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/simulation/validate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validateRequest),
        }),
      );
      expect(result).toEqual(mockResult);
    });

    it('should return validation errors for 400 response', async () => {
      const errorData = { valid: false, errors: [{ field: 'amount', message: 'required' }] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => errorData,
      });

      const result = await simulationApi.validatePayload(validateRequest);
      expect(result).toEqual(errorData);
    });
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      const service = new SimulationApiService();
      expect(service).toBeInstanceOf(SimulationApiService);
    });
  });

  describe('auth headers without token', () => {
    it('should not include Authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'PASSED' }),
      });

      await simulationApi.runSimulation({
        configId: 1,
        payloadType: 'json',
        testPayload: '{}',
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });
});
