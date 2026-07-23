import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AuthService } from '../../src/auth/auth.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as jwt from 'jsonwebtoken';

// Create a mock for jwt
const mockJwt = {
  ...jest.requireActual('jsonwebtoken'),
  decode: jest.fn(),
  sign: jwt.sign,
};

describe('AuthService', () => {
  let service: AuthService;
  let httpService: HttpService;
  let configService: ConfigService;
  let loggerService: LoggerService;

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
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const username = 'test@example.com';
    const password = 'password123';
    const authUrl = 'http://localhost:3001/auth/login';

    it('should throw ServiceUnavailableException when TAZAMA_AUTH_URL is not set', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.login(username, password)).rejects.toThrow(
        'Authentication service unavailable',
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'TAZAMA_AUTH_URL is not set in environment variables',
      );
    });

    it('should successfully login with token as string response', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const mockToken = 'mock-jwt-token-string';
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockToken }) as any);

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
      expect(httpService.post).toHaveBeenCalledWith(`${authUrl}/login`, {
        username,
        password,
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        'Auth service responded',
        'AuthService',
      );
    });

    it('should successfully login with token in data.token field', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const mockToken = 'mock-jwt-token';
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(
          of({ data: { token: mockToken, expires_in: 3600 } }) as any,
        );

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: 3600,
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        'Auth service responded',
        'AuthService',
      );
    });

    it('should successfully login with token in data.access_token field', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const mockToken = 'mock-access-token';
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(
          of({ data: { access_token: mockToken, expiresIn: 7200 } }) as any,
        );

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: 7200,
      });
    });

    it('should successfully login with token in data.jwt field', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const mockToken = 'mock-jwt';
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { jwt: mockToken } }) as any);

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should successfully login with token in data.user.token field', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const mockToken = 'mock-user-token';
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { user: { token: mockToken } } }) as any);

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should throw ServiceUnavailableException when response data is invalid', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      jest.spyOn(httpService, 'post').mockReturnValue(of({}) as any);

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Auth service did not return a valid response',
        AuthService.name,
      );
    });

    it('should throw UnauthorizedException for 401 status code', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error) as any);

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(username, password)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(loggerService.warn).toHaveBeenCalledWith(
        `Invalid credentials for user ${username}`,
      );
    });

    it('should throw ServiceUnavailableException for network errors', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const error = new Error('Network error');
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error) as any);

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Auth service error during login: Network error',
      );
    });

    it('should throw ServiceUnavailableException for 500 server errors', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(authUrl);
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
      };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => error) as any);

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(loggerService.error).toHaveBeenCalledWith(
        'Auth service error during login: Internal Server Error',
      );
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = jwt.sign({ exp: futureTime, user: 'test' }, 'secret');

      const result = service.isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = jwt.sign({ exp: pastTime, user: 'test' }, 'secret');

      const result = service.isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for token without exp field', () => {
      const token = jwt.sign({ user: 'test' }, 'secret');

      const result = service.isTokenExpired(token);

      expect(result).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle potential errors in isTokenExpired', () => {
      expect(service.isTokenExpired('')).toBe(true);
      expect(service.isTokenExpired(' ')).toBe(true);
      expect(service.isTokenExpired('not.a.token')).toBe(true);
      expect(service.isTokenExpired('.')).toBe(true);
      expect(service.isTokenExpired('..')).toBe(true);
    });

    it('should handle potential errors in getTokenTimeToExpiry', () => {
      expect(service.getTokenTimeToExpiry('')).toBe(0);
      expect(service.getTokenTimeToExpiry(' ')).toBe(0);
      expect(service.getTokenTimeToExpiry('not.a.token')).toBe(0);
      expect(service.getTokenTimeToExpiry('.')).toBe(0);
      expect(service.getTokenTimeToExpiry('..')).toBe(0);
    });
  });

  describe('getTokenTimeToExpiry', () => {
    it('should return time to expiry for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const token = jwt.sign({ exp: futureTime, user: 'test' }, 'secret');

      const result = service.getTokenTimeToExpiry(token);

      expect(result).toBeGreaterThan(3500);
      expect(result).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired token', () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const token = jwt.sign({ exp: pastTime, user: 'test' }, 'secret');

      const result = service.getTokenTimeToExpiry(token);

      expect(result).toBe(0);
    });

    it('should return 0 for token without exp field', () => {
      const token = jwt.sign({ user: 'test' }, 'secret');

      const result = service.getTokenTimeToExpiry(token);

      expect(result).toBe(0);
    });

    it('should return exact time difference when token expires in 30 seconds', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 30;
      const token = jwt.sign({ exp: futureTime, user: 'test' }, 'secret');

      const result = service.getTokenTimeToExpiry(token);

      expect(result).toBeGreaterThan(25);
      expect(result).toBeLessThanOrEqual(30);
    });
  });
});
