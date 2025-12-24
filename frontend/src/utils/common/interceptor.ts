export function setupFetch401Interceptor(naviateToLogin: () => void) {
  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      setTimeout(() => {
        naviateToLogin();
      }, 2000);
      return response;
    }

    return response;
  };
}
