import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SessionManagerService } from './session-manager.service';
import { TazamaAuthGuard } from './tazama-auth.guard';
import { Reflector } from '@nestjs/core';

describe('Session Timeout Functionality', () => {
  let sessionManager: SessionManagerService;
  let authGuard: TazamaAuthGuard;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionManagerService,
        TazamaAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'SESSION_TIMEOUT_MINUTES':
                  return 1; // 1 minute for testing
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    sessionManager = module.get<SessionManagerService>(SessionManagerService);
    authGuard = module.get<TazamaAuthGuard>(TazamaAuthGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('SessionManagerService', () => {
    const userId = 'test-user';
    const tenantId = 'test-tenant';
    const tokenString = 'test-token';

    beforeEach(() => {
      sessionManager.clearAllSessions();
    });

    it('should record user activity and create active session', () => {
      sessionManager.recordActivity(userId, tenantId, tokenString);
      expect(sessionManager.isSessionActive(userId, tenantId)).toBe(true);
    });

    it('should return session info for active session', () => {
      sessionManager.recordActivity(userId, tenantId, tokenString);
      const sessionInfo = sessionManager.getSessionInfo(userId, tenantId);

      expect(sessionInfo.active).toBe(true);
      expect(sessionInfo.lastActivity).toBeInstanceOf(Date);
      expect(sessionInfo.expiresAt).toBeInstanceOf(Date);
    });

    it('should return remaining time for active session', () => {
      sessionManager.recordActivity(userId, tenantId, tokenString);
      const timeRemaining = sessionManager.getSessionTimeRemaining(
        userId,
        tenantId,
      );

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(60); // 1 minute in seconds
    });

    it('should invalidate session when manually invalidated', () => {
      sessionManager.recordActivity(userId, tenantId, tokenString);
      expect(sessionManager.isSessionActive(userId, tenantId)).toBe(true);

      sessionManager.invalidateSession(userId, tenantId);
      expect(sessionManager.isSessionActive(userId, tenantId)).toBe(false);
    });

    it('should extend session when activity is recorded', async () => {
      sessionManager.recordActivity(userId, tenantId, tokenString);
      const initialTimeRemaining = sessionManager.getSessionTimeRemaining(
        userId,
        tenantId,
      );

      // Wait a small amount to ensure some time passes
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Record activity again - this should reset the timer
      sessionManager.recordActivity(userId, tenantId, tokenString);
      const newTimeRemaining = sessionManager.getSessionTimeRemaining(
        userId,
        tenantId,
      );

      expect(newTimeRemaining).toBeGreaterThan(initialTimeRemaining - 2);
    });

    it('should expire session after timeout period', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(0.001); // ~60ms timeout

      // Create new session manager with short timeout
      const shortTimeoutSessionManager = new SessionManagerService(
        configService,
      );

      shortTimeoutSessionManager.recordActivity(userId, tenantId, tokenString);
      expect(shortTimeoutSessionManager.isSessionActive(userId, tenantId)).toBe(
        true,
      );

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortTimeoutSessionManager.isSessionActive(userId, tenantId)).toBe(
        false,
      );
    }, 10000);

    it('should return zero time remaining for expired session', () => {
      const timeRemaining = sessionManager.getSessionTimeRemaining(
        'non-existent-user',
        tenantId,
      );
      expect(timeRemaining).toBe(0);
    });

    it('should return inactive session info for non-existent session', () => {
      const sessionInfo = sessionManager.getSessionInfo(
        'non-existent-user',
        tenantId,
      );

      expect(sessionInfo.active).toBe(false);
      expect(sessionInfo.lastActivity).toBeNull();
      expect(sessionInfo.expiresAt).toBeNull();
    });
  });

  describe('Session Timeout Configuration', () => {
    it('should use default timeout when not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const defaultSessionManager = new SessionManagerService(configService);

      expect(defaultSessionManager.getSessionTimeout()).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should use configured timeout', () => {
      jest.spyOn(configService, 'get').mockReturnValue(45);
      const customSessionManager = new SessionManagerService(configService);

      expect(customSessionManager.getSessionTimeout()).toBe(45 * 60 * 1000); // 45 minutes
    });
  });

  describe('Session Activity Features', () => {
    const userId = 'test-user';
    const tenantId = 'test-tenant';
    const tokenString = 'test-token';

    it('should track multiple users independently', () => {
      const user1 = 'user1';
      const user2 = 'user2';

      sessionManager.recordActivity(user1, tenantId, tokenString);
      sessionManager.recordActivity(user2, tenantId, tokenString);

      expect(sessionManager.isSessionActive(user1, tenantId)).toBe(true);
      expect(sessionManager.isSessionActive(user2, tenantId)).toBe(true);

      sessionManager.invalidateSession(user1, tenantId);

      expect(sessionManager.isSessionActive(user1, tenantId)).toBe(false);
      expect(sessionManager.isSessionActive(user2, tenantId)).toBe(true);
    });

    it('should track multiple tenants independently', () => {
      const tenant1 = 'tenant1';
      const tenant2 = 'tenant2';

      sessionManager.recordActivity(userId, tenant1, tokenString);
      sessionManager.recordActivity(userId, tenant2, tokenString);

      expect(sessionManager.isSessionActive(userId, tenant1)).toBe(true);
      expect(sessionManager.isSessionActive(userId, tenant2)).toBe(true);

      sessionManager.invalidateSession(userId, tenant1);

      expect(sessionManager.isSessionActive(userId, tenant1)).toBe(false);
      expect(sessionManager.isSessionActive(userId, tenant2)).toBe(true);
    });
  });
});
