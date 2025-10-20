import { Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SessionActivity {
  lastActivity: number;
  tokenString: string;
  userId: string;
  tenantId: string;
}

@Injectable({ scope: Scope.DEFAULT })
export class SessionManagerService {
  private sessions = new Map<string, SessionActivity>();
  private readonly sessionTimeout: number;

  constructor(private configService: ConfigService) {
    // Get session timeout from environment variable or default to 30 minutes
    const timeoutMinutes =
      this.configService.get<number>('SESSION_TIMEOUT_MINUTES') || 30;
    this.sessionTimeout = timeoutMinutes * 60 * 1000;

    console.log(
      `🕐 Session timeout configured: ${timeoutMinutes} minutes (${this.sessionTimeout}ms)`,
    );

    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  /**
   * Record user activity to extend session
   */
  recordActivity(userId: string, tenantId: string, tokenString: string): void {
    const sessionKey = `${tenantId}:${userId}`;
    this.sessions.set(sessionKey, {
      lastActivity: Date.now(),
      tokenString,
      userId,
      tenantId,
    });
  }

  /**
   * Check if session is still active
   */
  isSessionActive(userId: string, tenantId: string): boolean {
    const sessionKey = `${tenantId}:${userId}`;
    const session = this.sessions.get(sessionKey);

    if (!session) {
      return false;
    }

    const timeSinceActivity = Date.now() - session.lastActivity;
    return timeSinceActivity < this.sessionTimeout;
  }

  /**
   * Get time remaining until session expires (in seconds)
   */
  getSessionTimeRemaining(userId: string, tenantId: string): number {
    const sessionKey = `${tenantId}:${userId}`;
    const session = this.sessions.get(sessionKey);

    if (!session) {
      return 0;
    }

    const timeSinceActivity = Date.now() - session.lastActivity;
    const timeRemaining = this.sessionTimeout - timeSinceActivity;

    return Math.max(0, Math.floor(timeRemaining / 1000));
  }

  /**
   * Invalidate a session
   */
  invalidateSession(userId: string, tenantId: string): void {
    const sessionKey = `${tenantId}:${userId}`;
    this.sessions.delete(sessionKey);
  }

  /**
   * Get session info
   */
  getSessionInfo(
    userId: string,
    tenantId: string,
  ): { active: boolean; lastActivity: Date | null; expiresAt: Date | null } {
    const sessionKey = `${tenantId}:${userId}`;
    const session = this.sessions.get(sessionKey);

    if (!session) {
      return { active: false, lastActivity: null, expiresAt: null };
    }

    return {
      active: this.isSessionActive(userId, tenantId),
      lastActivity: new Date(session.lastActivity),
      expiresAt: new Date(session.lastActivity + this.sessionTimeout),
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(key);
      }
    }
  }

  /**
   * Get session timeout in milliseconds
   */
  getSessionTimeout(): number {
    return this.sessionTimeout;
  }

  /**
   * Clear all sessions (for testing or admin purposes)
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
}
