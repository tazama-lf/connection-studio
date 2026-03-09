import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { validateTokenAndClaims } from '@tazama-lf/auth-lib';

import type {
  TazamaToken,
  ClaimValidationResult,
  AuthenticatedUser,
} from './auth.types';
import { CLAIMS_KEY, IS_PUBLIC_KEY, ANY_CLAIMS_KEY } from './auth.decorator';

@Injectable()
export class TazamaAuthGuard implements CanActivate {
  private readonly logger = new Logger(TazamaAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const logContext = 'TazamaAuthGuard.canActivate()';

    if (this.isPublicRoute(context)) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(
      request.headers.authorization,
      logContext,
    );

    const { requiredClaims, anyClaims } = this.getClaimsFromDecorators(context);

    const validated = validateTokenAndClaims(token, [
      ...requiredClaims,
      ...anyClaims,
    ]);

    const { status, valid, invalid } = this.evaluateClaimResult(
      requiredClaims,
      anyClaims,
      validated,
      logContext,
    );

    if (!status) {
      throw new UnauthorizedException(
        `Missing or invalid claims: ${invalid.join(', ')}`,
      );
    }

    const decoded = this.extractTokenPayload(token);

    let innerDecoded: Record<string, unknown> = decoded as Record<
      string,
      unknown
    >;
    try {
      const innerToken =
        ((decoded as Record<string, unknown>).tokenString as
          | string
          | undefined) ?? token;
      const innerParsed = jwt.decode(innerToken);
      if (innerParsed && typeof innerParsed === 'object') {
        innerDecoded = innerParsed;
      }
    } catch (error) {
      this.logger.debug('Failed to decode inner token, using outer token');
    }

    const actorEmail = innerDecoded.preferred_username as string | undefined;

    const actorName = innerDecoded.preferred_username as string | undefined;

    const realmAccess = innerDecoded.realm_access as
      | { roles?: string[] }
      | undefined;
    const realmRoles = realmAccess?.roles;
    const actorRole =
      realmRoles?.find((role: string) =>
        ['editor', 'approver', 'publisher', 'exporter'].includes(
          role.toLowerCase(),
        ),
      ) ?? valid[0];

    const sourceIP =
      request.ip ??
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        .trim() ??
      request.socket.remoteAddress;

    const allowedStatuses = innerDecoded.status
      ? (innerDecoded.status as string)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : undefined;

    const authenticatedUser: AuthenticatedUser = {
      token: { ...decoded, tokenString: token },
      validated,
      validClaims: valid,
      tenantId: decoded.tenantId,
      userId: decoded.clientId,
      actorName,
      actorRole,
      actorEmail,
      sourceIP,
      allowedStatuses,
    };

    request.user = authenticatedUser;
    return true;
  }

  private isPublicRoute(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private extractBearerToken(
    authHeader: string | undefined,
    ctx: string,
  ): string {
    if (!authHeader?.startsWith('Bearer ')) {
      this.logger.warn('No Bearer token provided', ctx);
      throw new UnauthorizedException('No Bearer token provided');
    }
    return authHeader.split(' ')[1];
  }

  private getClaimsFromDecorators(context: ExecutionContext): {
    requiredClaims: string[];
    anyClaims: string[];
  } {
    const requiredClaims =
      this.reflector.getAllAndOverride<string[] | undefined>(CLAIMS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const anyClaims =
      this.reflector.getAllAndOverride<string[] | undefined>(ANY_CLAIMS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredClaims.length === 0 && anyClaims.length === 0) {
      throw new UnauthorizedException('No required claims specified');
    }

    return { requiredClaims, anyClaims };
  }

  private evaluateClaimResult(
    required: string[],
    any: string[],
    validated: ClaimValidationResult,
    ctx: string,
  ): { status: boolean; valid: string[]; invalid: string[] } {
    if (required.length > 0) {
      const valid = required.filter((c) => validated[c]);
      const invalid = required.filter((c) => !validated[c]);

      if (invalid.length > 0) {
        this.logger.warn(
          `User missing required claims. Required: [${required.join(', ')}], Invalid: [${invalid.join(', ')}]`,
          ctx,
        );
        return { status: false, valid, invalid };
      }

      return { status: true, valid, invalid };
    }

    const valid = any.filter((c) => validated[c]);
    const invalid = any.filter((c) => !validated[c]);

    if (valid.length === 0) {
      this.logger.warn(
        `User missing any required claims. Required (any): [${any.join(', ')}], Invalid: [${invalid.join(', ')}]`,
        ctx,
      );
      return { status: false, valid, invalid };
    }

    return { status: true, valid, invalid };
  }

  private extractTokenPayload(token: string): TazamaToken {
    const decoded = jwt.decode(token) as TazamaToken | null;

    if (!decoded) {
      throw new UnauthorizedException('Invalid token format');
    }

    return decoded;
  }
}
