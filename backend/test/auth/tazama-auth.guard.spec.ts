import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
}));

jest.mock('@tazama-lf/auth-lib', () => ({
  validateTokenAndClaims: jest.fn(),
}));

import * as jwt from 'jsonwebtoken';
import { validateTokenAndClaims } from '@tazama-lf/auth-lib';
import { TazamaAuthGuard } from '../../src/auth/tazama-auth.guard';
import {
  CLAIMS_KEY,
  IS_PUBLIC_KEY,
  ANY_CLAIMS_KEY,
} from '../../src/auth/auth.decorator';

describe('TazamaAuthGuard', () => {
  let guard: TazamaAuthGuard;
  let reflector: Reflector;
  const mockJwtDecode = jwt.decode as jest.Mock;
  const mockValidateTokenAndClaims = validateTokenAndClaims as jest.Mock;

  const buildContext = (
    options: {
      authorization?: string;
      ip?: string;
      xForwardedFor?: string;
      remoteAddress?: string;
    } = {},
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization: options.authorization,
        'x-forwarded-for': options.xForwardedFor,
      },
      ip: options.ip,
      socket: { remoteAddress: options.remoteAddress },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TazamaAuthGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows access to public routes without checking a token', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => key === IS_PUBLIC_KEY);

    const context = buildContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(mockValidateTokenAndClaims).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no Bearer token is provided', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation(() => false);

    const context = buildContext({ authorization: 'Basic abc123' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'No Bearer token provided',
    );
  });

  it('throws UnauthorizedException when no claims are specified on the route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      return undefined;
    });

    const context = buildContext({ authorization: 'Bearer sometoken' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'No required claims specified',
    );
  });

  it('throws UnauthorizedException when required claims are missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return ['editor'];
      if (key === ANY_CLAIMS_KEY) return [];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({ editor: false });

    const context = buildContext({ authorization: 'Bearer sometoken' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      /Missing or invalid claims: editor/,
    );
  });

  it('throws UnauthorizedException when none of the "any" claims match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return [];
      if (key === ANY_CLAIMS_KEY) return ['editor', 'approver'];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({
      editor: false,
      approver: false,
    });

    const context = buildContext({ authorization: 'Bearer sometoken' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the token cannot be decoded', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return [];
      if (key === ANY_CLAIMS_KEY) return ['editor'];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({ editor: true });
    mockJwtDecode.mockReturnValue(null);

    const context = buildContext({ authorization: 'Bearer sometoken' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Invalid token format');
  });

  it('grants access and attaches an authenticated user when required claims are satisfied', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return ['editor'];
      if (key === ANY_CLAIMS_KEY) return [];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({ editor: true });
    mockJwtDecode.mockReturnValue({
      tenantId: 'tenant123',
      clientId: 'client123',
      preferred_username: 'alice',
      realm_access: { roles: ['editor'] },
      status: 'active, enabled',
    });

    const request = {
      headers: { authorization: 'Bearer sometoken' },
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(
      (request as unknown as { user: Record<string, unknown> }).user,
    ).toMatchObject({
      tenantId: 'tenant123',
      userId: 'client123',
      actorName: 'alice',
      actorEmail: 'alice',
      actorRole: 'editor',
      sourceIP: '10.0.0.1',
      allowedStatuses: ['active', 'enabled'],
    });
  });

  it('grants access when "any" claims are satisfied and falls back to socket address for IP', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return [];
      if (key === ANY_CLAIMS_KEY) return ['editor', 'approver'];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({
      editor: false,
      approver: true,
    });
    mockJwtDecode.mockReturnValue({
      tenantId: 'tenant123',
      clientId: 'client123',
    });

    const context = buildContext({
      authorization: 'Bearer sometoken',
      xForwardedFor: '203.0.113.5, 70.41.3.18',
      remoteAddress: '10.0.0.9',
    });
    (context.switchToHttp().getRequest() as { ip?: string }).ip = undefined;

    expect(guard.canActivate(context)).toBe(true);
    const request = context.switchToHttp().getRequest() as unknown as {
      user: Record<string, unknown>;
    };
    expect(request.user).toMatchObject({
      actorRole: 'approver',
      sourceIP: '203.0.113.5',
      allowedStatuses: undefined,
    });
  });

  it('falls back to the outer token when decoding the inner tokenString fails', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === CLAIMS_KEY) return ['editor'];
      if (key === ANY_CLAIMS_KEY) return [];
      return undefined;
    });
    mockValidateTokenAndClaims.mockReturnValue({ editor: true });

    let callCount = 0;
    mockJwtDecode.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return { tenantId: 'tenant123', clientId: 'client123' };
      }
      throw new Error('bad inner token');
    });

    const context = buildContext({
      authorization: 'Bearer sometoken',
      remoteAddress: '10.0.0.9',
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
