import { Injectable, Logger } from '@nestjs/common';

interface CachedEmails {
  emails: string[];
  timestamp: number;
}

@Injectable()
export class EmailCacheService {
  private readonly logger = new Logger(EmailCacheService.name);
  private readonly cache: Map<string, Map<string, CachedEmails>> = new Map();
  private readonly cacheDuration = 15 * 60 * 1000;

  getEmailsByRole(tenantId: string, role: string): string[] | null {
    const tenantCache = this.cache.get(tenantId);
    if (!tenantCache) return null;

    const roleCache = tenantCache.get(role);
    if (!roleCache) return null;

    const age = Date.now() - roleCache.timestamp;
    if (age > this.cacheDuration) {
      tenantCache.delete(role);
      return null;
    }

    this.logger.debug(
      `[Cache HIT] ${roleCache.emails.length} emails for role '${role}'`,
    );
    return roleCache.emails;
  }

  setEmailsByRole(tenantId: string, role: string, emails: string[]): void {
    let tenantCache = this.cache.get(tenantId);
    if (!tenantCache) {
      tenantCache = new Map();
      this.cache.set(tenantId, tenantCache);
    }

    tenantCache.set(role, { emails, timestamp: Date.now() });
    this.logger.debug(`[Cache SET] ${emails.length} emails for role '${role}'`);
  }
}
