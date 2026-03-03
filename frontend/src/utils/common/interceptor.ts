const HTTP_STATUS_UNAUTHORIZED = 401;
const LOGIN_REDIRECT_DELAY_MS = 2000;

export function setupFetch401Interceptor(naviateToLogin: () => void): void {
  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);
    if (response.status === HTTP_STATUS_UNAUTHORIZED) {
      setTimeout(() => {
        naviateToLogin();
      }, LOGIN_REDIRECT_DELAY_MS);
      return response;
    }

    return response;
  };
}
