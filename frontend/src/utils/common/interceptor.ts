const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const LOGIN_REDIRECT_DELAY_MS = 2000;
// Several widgets fire off a handful of requests in parallel (list + counts + filters, etc.), so a
// single burst hitting the limit would otherwise stack up one toast per request. Collapse those
// into a single notification.
const RATE_LIMIT_TOAST_THROTTLE_MS = 3000;
const DEFAULT_RATE_LIMIT_MESSAGE = 'Too many requests. Please wait a moment and try again.';

/** Dispatched on `window` whenever a fetch comes back 429, so UI (ToastProvider) can react
 * without every API service module needing its own rate-limit handling. */
export const RATE_LIMIT_EVENT = 'admin-service:rate-limited';

export interface RateLimitEventDetail {
  message: string;
}

let lastRateLimitNotifiedAt = 0;

async function notifyRateLimited(response: Response): Promise<void> {
  const now = Date.now();
  if (now - lastRateLimitNotifiedAt < RATE_LIMIT_TOAST_THROTTLE_MS) {
    return;
  }
  lastRateLimitNotifiedAt = now;

  // admin-service's rate limiter (@fastify/rate-limit) already builds a human-readable message
  // e.g. "Rate limit exceeded, retry in 59 seconds" — and AdminServiceClient.handleError forwards
  // it through as `message` in the JSON body. Just show that verbatim rather than re-deriving our
  // own wording from a raw retry-after value.
  let message = DEFAULT_RATE_LIMIT_MESSAGE;
  try {
    // Clone so the response body is still readable by whichever service call triggered this.
    const data = (await response.clone().json()) as { message?: string };
    if (typeof data.message === 'string' && data.message.length > 0) {
      message = data.message;
    }
  } catch {
    // Body wasn't JSON, fall back to the generic message above.
  }

  window.dispatchEvent(
    new CustomEvent<RateLimitEventDetail>(RATE_LIMIT_EVENT, { detail: { message } }),
  );
}

/**
 * Patches the global `fetch` so every API call in the app regardless of which service module
 * issues it — gets consistent handling for two cross-cutting response codes:
 *  - 401: redirect to login.
 *  - 429: surface the backend's rate-limit message via a toast (`RATE_LIMIT_EVENT`) instead of
 *    relying on each call site's own catch block, most of which show a hardcoded generic message
 *    and never look at what the backend actually said.
 */
export function setupFetchInterceptors(navigateToLogin: () => void): void {
  const originalFetch = window.fetch;

  window.fetch = async (input, init = {}) => {
    const response = await originalFetch(input, init);

    if (response.status === HTTP_STATUS_UNAUTHORIZED) {
      setTimeout(() => {
        navigateToLogin();
      }, LOGIN_REDIRECT_DELAY_MS);
      return response;
    }

    if (response.status === HTTP_STATUS_TOO_MANY_REQUESTS) {
      void notifyRateLimited(response);
    }

    return response;
  };
}
