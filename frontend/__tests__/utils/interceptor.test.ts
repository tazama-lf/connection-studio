import { setupFetch401Interceptor } from '../../src/utils/common/interceptor';

describe('setupFetch401Interceptor', () => {
  let originalFetch: typeof window.fetch;
  let navigateToLoginMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    originalFetch = window.fetch;
    navigateToLoginMock = jest.fn();
  });

  afterEach(() => {
    window.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('should replace window.fetch with a new function', () => {
    const fetchBefore = window.fetch;
    setupFetch401Interceptor(navigateToLoginMock);
    expect(window.fetch).not.toBe(fetchBefore);
  });

  it('should pass through normal responses without calling navigateToLogin', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    } as Response;

    setupFetch401Interceptor(navigateToLoginMock);

    window.fetch = jest.fn().mockResolvedValue(mockResponse);
    setupFetch401Interceptor(navigateToLoginMock);

    const response = await window.fetch('http://localhost/api/test');

    expect(response.status).toBe(200);
    expect(navigateToLoginMock).not.toHaveBeenCalled();
  });

  it('should call navigateToLogin after delay on 401 response', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
    } as Response;

    const mockOriginalFetch = jest.fn().mockResolvedValue(mockResponse);
    window.fetch = mockOriginalFetch;

    setupFetch401Interceptor(navigateToLoginMock);

    await window.fetch('http://localhost/api/protected');

    expect(navigateToLoginMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2000);

    expect(navigateToLoginMock).toHaveBeenCalledTimes(1);
  });

  it('should return the 401 response (not throw)', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
    } as Response;

    const mockOriginalFetch = jest.fn().mockResolvedValue(mockResponse);
    window.fetch = mockOriginalFetch;

    setupFetch401Interceptor(navigateToLoginMock);

    const result = await window.fetch('http://localhost/api/protected');

    expect(result.status).toBe(401);
  });

  it('should not call navigateToLogin for non-401 error responses', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
    } as Response;

    const mockOriginalFetch = jest.fn().mockResolvedValue(mockResponse);
    window.fetch = mockOriginalFetch;

    setupFetch401Interceptor(navigateToLoginMock);

    await window.fetch('http://localhost/api/restricted');

    jest.advanceTimersByTime(3000);

    expect(navigateToLoginMock).not.toHaveBeenCalled();
  });

  it('should pass original fetch arguments through', async () => {
    const mockResponse = { ok: true, status: 200 } as Response;
    const mockOriginalFetch = jest.fn().mockResolvedValue(mockResponse);
    window.fetch = mockOriginalFetch;

    setupFetch401Interceptor(navigateToLoginMock);

    await window.fetch('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    });

    expect(mockOriginalFetch).toHaveBeenCalledWith(
      'http://localhost/api/test',
      { method: 'POST', body: JSON.stringify({ key: 'value' }) },
    );
  });
});
