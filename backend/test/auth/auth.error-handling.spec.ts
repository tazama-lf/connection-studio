import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '@tazama-lf/frms-coe-lib';

// Mock jwt module completely for this test file
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  decode: jest.fn(),
}));

import { AuthService } from '../../src/auth/auth.service';
import * as jwt from 'jsonwebtoken';

describe('AuthService Error Handling', () => {
  let service: AuthService;
  let loggerService: LoggerService;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isTokenExpired error handling', () => {
    it('should handle jwt.decode errors gracefully', () => {
      mockJwt.decode.mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      const result = service.isTokenExpired('invalid-token');

      expect(result).toBe(true);
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Failed to check token expiry: Invalid token format',
      );
    });
  });

  describe('getTokenTimeToExpiry error handling', () => {
    it('should handle jwt.decode errors gracefully', () => {
      mockJwt.decode.mockImplementation(() => {
        throw new Error('Token decode failed');
      });

      const result = service.getTokenTimeToExpiry('invalid-token');

      expect(result).toBe(0);
      expect(loggerService.warn).toHaveBeenCalledWith(
        'Failed to get time to expiry: Token decode failed',
      );
    });
  });
});
