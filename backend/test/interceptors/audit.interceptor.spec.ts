import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, firstValueFrom, type Observable } from 'rxjs';
import { EventPhase } from '@tazama-lf/audit-lib';
import { AuditInterceptor } from '../../src/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: { log: jest.Mock };

  const buildContext = (
    request: Record<string, unknown>,
    response: Record<string, unknown> = { statusCode: 200 },
    handlerName = 'putDataModelJson',
    className = 'TazamaDataModelController',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => ({ name: handlerName }),
      getClass: () => ({ name: className }),
    } as unknown as ExecutionContext;
  };

  const buildNext = (
    observable: Observable<unknown> = of({ ok: true }),
  ): CallHandler => ({
    handle: () => observable,
  });

  const user: AuthenticatedUser = {
    token: { claims: ['editor'] } as unknown as AuthenticatedUser['token'],
    validated: {},
    validClaims: ['editor'],
    tenantId: 'tenant123',
    userId: 'user123',
    actorRole: 'editor',
  } as AuthenticatedUser;

  beforeEach(() => {
    auditService = {
      log: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    };
    interceptor = new AuditInterceptor(auditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('logs an INTENT event immediately and a SUCCESS event when the handler completes', async () => {
    const request = {
      method: 'PUT',
      url: '/tazama-data-model/json',
      params: {},
      query: {},
      headers: { 'user-agent': 'jest' },
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.2' },
      user,
    };
    const response = { statusCode: 200 };
    const context = buildContext(request, response);

    const result = await firstValueFrom(
      interceptor.intercept(context, buildNext(of({ data: 'x' }))),
    );

    expect(result).toEqual({ data: 'x' });
    expect(auditService.log).toHaveBeenCalledTimes(2);

    const [intentCall, successCall] = auditService.log.mock.calls.map(
      (call) => call[0],
    );
    expect(intentCall.eventPhase).toBe(EventPhase.INTENT);
    expect(intentCall.eventType).toBe('DATA_MODEL_UPDATED');
    expect(intentCall.actorId).toBe('user123');
    expect(intentCall.resourceType).toBe('tazama-data-model');
    expect(intentCall.sourceIp).toBe('10.0.0.1');

    expect(successCall.eventPhase).toBe(EventPhase.SUCCESS);
    expect(successCall.outcome).toMatchObject({ statusCode: 200 });
  });

  it('logs a FAILED event and rethrows when the handler errors', async () => {
    const request = {
      method: 'PUT',
      url: '/tazama-data-model/json',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(request);
    const error = new Error('boom');

    await expect(
      firstValueFrom(
        interceptor.intercept(context, buildNext(throwError(() => error))),
      ),
    ).rejects.toThrow('boom');

    const failedCall = auditService.log.mock.calls.find(
      ([data]) => data.eventPhase === EventPhase.FAILED,
    )?.[0];
    expect(failedCall).toBeDefined();
    expect(failedCall.outcome).toMatchObject({
      error: 'boom',
      statusCode: 500,
    });
    expect(failedCall.actorId).toBe('anonymous');
    expect(failedCall.actorName).toBe('Anonymous User');
  });

  it('propagates a non-Error rejection as an Error and records its status code', async () => {
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(
      request,
      { statusCode: 200 },
      'unknownHandler',
      'JobController',
    );
    const rejection = { status: 403, message: 'forbidden' };

    await expect(
      firstValueFrom(
        interceptor.intercept(context, buildNext(throwError(() => rejection))),
      ),
    ).rejects.toThrow('[object Object]');

    const failedCall = auditService.log.mock.calls.find(
      ([data]) => data.eventPhase === EventPhase.FAILED,
    )?.[0];
    expect(failedCall.outcome).toMatchObject({ statusCode: 403 });
    expect(failedCall.eventType).toBe('UNKNOWN_EVENT');
    expect(failedCall.resourceType).toBe('job');
  });

  it('extracts resource id and ip from x-forwarded-for and resolves fallback claim role', async () => {
    const request = {
      method: 'POST',
      url: '/config/123',
      params: { configId: 'cfg-1' },
      query: {},
      headers: { 'x-forwarded-for': '203.0.113.9, 70.41.3.18' },
      socket: { remoteAddress: '10.0.0.2' },
      user: {
        userId: 'user123',
        tenantId: 'tenant123',
        validClaims: [],
        token: { claims: ['approver'] },
      } as unknown as AuthenticatedUser,
    };
    const context = buildContext(
      request,
      { statusCode: 201 },
      'createConfig',
      'ConfigController',
    );

    await firstValueFrom(
      interceptor.intercept(context, buildNext(of({ id: 'cfg-1' }))),
    );

    const intentCall = auditService.log.mock.calls[0][0];
    expect(intentCall.resourceId).toBe('cfg-1');
    expect(intentCall.sourceIp).toBe('203.0.113.9');
    expect(intentCall.actorRole).toBe('approver');
  });

  it('falls back to x-real-ip, then request.ip, then socket address for source ip', async () => {
    const baseRequest = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
    };

    const withRealIp = buildContext({
      ...baseRequest,
      headers: { 'x-real-ip': '198.51.100.5' },
      socket: { remoteAddress: '10.0.0.2' },
    });
    await firstValueFrom(interceptor.intercept(withRealIp, buildNext()));
    expect(auditService.log.mock.calls[0][0].sourceIp).toBe('198.51.100.5');

    jest.clearAllMocks();

    const withReqIp = buildContext({
      ...baseRequest,
      headers: {},
      ip: '198.51.100.9',
      socket: { remoteAddress: '10.0.0.2' },
    });
    await firstValueFrom(interceptor.intercept(withReqIp, buildNext()));
    expect(auditService.log.mock.calls[0][0].sourceIp).toBe('198.51.100.9');

    jest.clearAllMocks();

    const withSocketOnly = buildContext({
      ...baseRequest,
      headers: {},
      socket: { remoteAddress: '10.0.0.3' },
    });
    await firstValueFrom(interceptor.intercept(withSocketOnly, buildNext()));
    expect(auditService.log.mock.calls[0][0].sourceIp).toBe('10.0.0.3');

    jest.clearAllMocks();

    const withNothing = buildContext({
      ...baseRequest,
      headers: {},
      socket: {},
    });
    await firstValueFrom(interceptor.intercept(withNothing, buildNext()));
    expect(auditService.log.mock.calls[0][0].sourceIp).toBe('unknown');
  });

  it('falls back to extracting the resource id from the response body', async () => {
    const request = {
      method: 'GET',
      url: '/jobs/999',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const response = { statusCode: 200, body: { jobId: 'job-999' } };
    const context = buildContext(
      request,
      response,
      'updateJob',
      'JobController',
    );

    await firstValueFrom(interceptor.intercept(context, buildNext()));

    expect(auditService.log.mock.calls[0][0].resourceId).toBe('job-999');
  });

  it('extracts the configId field from the response body as a last resort', async () => {
    const request = {
      method: 'GET',
      url: '/configs/999',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const response = { statusCode: 200, body: { configId: 'cfg-999' } };
    const context = buildContext(
      request,
      response,
      'getAllConfigs',
      'ConfigController',
    );

    await firstValueFrom(interceptor.intercept(context, buildNext()));

    expect(auditService.log.mock.calls[0][0].resourceId).toBe('cfg-999');
  });

  it('computes response size for a null/undefined success payload', async () => {
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(request);

    await firstValueFrom(
      interceptor.intercept(context, buildNext(of(undefined))),
    );

    const successCall = auditService.log.mock.calls.find(
      ([data]) => data.eventPhase === EventPhase.SUCCESS,
    )?.[0];
    expect(successCall.outcome.responseSize).toBe(JSON.stringify({}).length);
  });

  it('logs "Unknown error" when the audit logger rejects with a non-Error value', async () => {
    auditService.log.mockRejectedValue('backend unavailable');
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(request);

    await firstValueFrom(interceptor.intercept(context, buildNext()));
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('returns an undefined resource id when neither request nor response carry one', async () => {
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const response = { statusCode: 200, body: 'not-an-object' };
    const context = buildContext(request, response);

    await firstValueFrom(interceptor.intercept(context, buildNext()));

    expect(auditService.log.mock.calls[0][0].resourceId).toBeUndefined();
  });

  it('falls back to the "user" role when the user has no claims at all', async () => {
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
      user: {
        userId: 'user123',
        tenantId: 'tenant123',
        validClaims: [],
        token: { claims: [] },
      } as unknown as AuthenticatedUser,
    };
    const context = buildContext(request);

    await firstValueFrom(interceptor.intercept(context, buildNext()));

    expect(auditService.log.mock.calls[0][0].actorRole).toBe('user');
  });

  it('swallows audit logging failures without affecting the response', async () => {
    auditService.log.mockRejectedValue(new Error('audit backend down'));
    const request = {
      method: 'GET',
      url: '/jobs',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(request);

    const result = await firstValueFrom(
      interceptor.intercept(context, buildNext(of({ ok: true }))),
    );

    expect(result).toEqual({ ok: true });
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('builds a generic description for unmapped handlers', async () => {
    const request = {
      method: 'DELETE',
      url: '/unmapped',
      params: {},
      query: {},
      headers: {},
      socket: { remoteAddress: '10.0.0.2' },
    };
    const context = buildContext(
      request,
      { statusCode: 200 },
      'someRandomHandler',
      'SomeController',
    );

    await firstValueFrom(interceptor.intercept(context, buildNext()));

    const intentCall = auditService.log.mock.calls[0][0];
    expect(intentCall.eventType).toBe('UNKNOWN_EVENT');
    expect(intentCall.description).toBe('DELETE request to /unmapped');
    expect(intentCall.resourceType).toBe('unknown');
  });
});
