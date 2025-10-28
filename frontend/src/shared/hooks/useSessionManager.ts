import { useEffect, useRef, useCallback } from 'react';

// Types for callbacks
interface UseSessionManagerOptions {
  timeoutMinutes?: number; // Inactivity timeout in minutes (default 30)
  warningMinutes?: number; // Minutes before timeout to show warning (default 5)
  onSessionExpired?: () => void;
  onSessionWarning?: () => void;
}

// API endpoints (disabled)
// const SESSION_STATUS_URL = '/auth/session/status';
// const SESSION_REFRESH_URL = '/auth/session/refresh';
// const TOKEN_REFRESH_URL = '/auth/token/refresh';
// const LOGOUT_URL = '/auth/logout';

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

export function useSessionManager({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onSessionExpired,
  onSessionWarning,
}: UseSessionManagerOptions = {}) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef(false);

  // Helper: Call backend API (disabled)
  // const callApi = useCallback(async (_url: string, _method: string = 'POST') => {
  //   // API calls disabled - returning empty promise
  //   return Promise.resolve({});
  // }, []);

  // Refresh session (extend timeout) - disabled
  const refreshSession = useCallback(async () => {
    try {
      // await callApi(SESSION_REFRESH_URL, 'POST');
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
      setupTimers();
    } catch (e) {
      // If refresh fails, expire session
      handleSessionExpired();
    }
  }, []);

  // Handle session expired
  const handleSessionExpired = useCallback(() => {
    if (onSessionExpired) onSessionExpired();
    cleanupTimers();
    // callApi(LOGOUT_URL, 'POST').catch(() => {});
  }, [onSessionExpired]);

  // Handle warning
  const handleSessionWarning = useCallback(() => {
    if (!warnedRef.current && onSessionWarning) {
      warnedRef.current = true;
      onSessionWarning();
    }
  }, [onSessionWarning]);

  // Setup timers for warning and expiration
  const setupTimers = useCallback(() => {
    cleanupTimers();
    const now = Date.now();
    const timeoutMs = (timeoutMinutes * 60 * 1000);
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const timeSinceLast = now - lastActivityRef.current;
    const timeToTimeout = Math.max(timeoutMs - timeSinceLast, 0);
    const timeToWarning = Math.max(warningMs - timeSinceLast, 0);

    // Warning timer
    warningTimerRef.current = setTimeout(handleSessionWarning, timeToWarning);
    // Expiry timer
    timerRef.current = setTimeout(handleSessionExpired, timeToTimeout);
  }, [timeoutMinutes, warningMinutes, handleSessionWarning, handleSessionExpired]);

  // Cleanup timers
  const cleanupTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  // Activity event handler
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warnedRef.current = false;
    refreshSession();
  }, [refreshSession]);

  // Mount/unmount logic
  useEffect(() => {
    // On mount, check session status (disabled)
    // callApi(SESSION_STATUS_URL, 'GET').catch(handleSessionExpired);
    setupTimers();
    // Add listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      cleanupTimers();
    };
    // eslint-disable-next-line
  }, [setupTimers, handleActivity]);

  // Token refresh (optional, can be called by consumer) - disabled
  const refreshToken = useCallback(async () => {
    // await callApi(TOKEN_REFRESH_URL, 'POST');
  }, []);

  return {
    refreshSession,
    refreshToken,
  };
}
