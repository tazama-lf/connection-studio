import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { of, throwError } from 'rxjs';

describe('AdminServiceClient', () => {
  let service: AdminServiceClient;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminServiceClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://admin-service:3105'),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            patch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminServiceClient>(AdminServiceClient);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Regression coverage for the impact-analysis / issue-rate-limiting-admin-service.md finding:
  // handleError used to collapse every upstream error to a hardcoded 502, discarding the real
  // status (e.g. a 429 from admin-service's rate limiter) and all response headers.
  describe('handleError (via getConfigById)', () => {
    it('preserves the real upstream status code instead of collapsing it to 502', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 429, data: { message: 'Rate limit exceeded, retry in 12 seconds' }, headers: {} },
        })),
      );

      await expect(service.getConfigById(1, 'token')).rejects.toMatchObject({
        status: 429,
      });
    });

    it('surfaces the upstream Retry-After header in the response body', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 429,
            data: { message: 'Rate limit exceeded, retry in 12 seconds' },
            headers: { 'retry-after': '12' },
          },
        })),
      );

      try {
        await service.getConfigById(1, 'token');
        fail('expected getConfigById to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(429);
        expect(httpError.getResponse()).toMatchObject({
          statusCode: 429,
          message: 'Rate limit exceeded, retry in 12 seconds',
          retryAfter: '12',
        });
      }
    });

    it('omits retryAfter from the body when the upstream response has no Retry-After header', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404, data: { message: 'Config not found' }, headers: {} },
        })),
      );

      try {
        await service.getConfigById(1, 'token');
        fail('expected getConfigById to reject');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(404);
        const body = httpError.getResponse() as Record<string, unknown>;
        expect(body).toMatchObject({ statusCode: 404, message: 'Config not found' });
        expect(body).not.toHaveProperty('retryAfter');
      }
    });

    it('falls back to a generic message when the upstream response body has no message field', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 500, data: {}, headers: {} },
        })),
      );

      try {
        await service.getConfigById(1, 'token');
        fail('expected getConfigById to reject');
      } catch (error) {
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(500);
        expect(httpError.getResponse()).toMatchObject({
          statusCode: 500,
          message: 'Admin service returned an error response',
        });
      }
    });

    it('still returns 503 when admin-service is unreachable (no response at all)', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({ request: {}, message: 'connect ECONNREFUSED' })),
      );

      await expect(service.getConfigById(1, 'token')).rejects.toMatchObject({
        status: 503,
      });
    });

    it('still returns 500 for errors with neither a response nor a request', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('boom')));

      await expect(service.getConfigById(1, 'token')).rejects.toMatchObject({
        status: 500,
      });
    });

    it('resolves normally when admin-service returns a 2xx response', async () => {
      httpService.get.mockReturnValue(
        of({ data: { config: { id: 1 } } } as never),
      );

      await expect(service.getConfigById(1, 'token')).resolves.toEqual({ id: 1 });
    });
  });
});
