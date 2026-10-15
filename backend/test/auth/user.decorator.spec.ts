import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import { User } from '../../src/auth/user.decorator';

describe('User decorator', () => {
  it('extracts the authenticated user from the request', () => {
    class TestController {
      handler(@User() _user: unknown): void {}
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'handler',
    );
    const key = Object.keys(args).find((k) => k.includes(':0'));
    const factory = args[key as string].factory as (
      data: unknown,
      ctx: ExecutionContext,
    ) => unknown;

    const mockUser = { tenantId: 'tenant123' };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: mockUser }) }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, context)).toBe(mockUser);
  });
});
