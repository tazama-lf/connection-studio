import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { TazamaAuthGuard } from './tazama-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockUser = {
    userId: 'user123',
    tenantId: 'tenant1',
    token: {
      tokenString: 'mock-token',
      tenantId: 'tenant1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    validClaims: ['view-profile'],
  };

  beforeEach(async () => {
    const mockAuthService = {
      authenticate: jest.fn(),
      checkTokenExpiry: jest.fn(),
      getTimeToExpiry: jest.fn(),
      login: jest.fn(),
      isTokenExpired: jest.fn(),
    };

    const mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    })
      .overrideGuard(TazamaAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should successfully login with valid credentials', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      const mockAuthResult = {
        token: 'mock-jwt-token',
        expiresIn: 3600,
      };

      // authService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(loggerService.log).toHaveBeenCalledWith(
        'Login successful',
        'AuthController',
      );
      expect(result).toEqual({
        message: 'Login successful',
        token: 'mock-jwt-token',
        expiresIn: 3600,
      });
    });

    it('should return token without expiresIn when not provided', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      // const mockAuthResult = {
      //   token: 'mock-jwt-token',
      // };

      // authService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual({
        message: 'Login successful',
        token: 'mock-jwt-token',
      });
      expect(result.expiresIn).toBeUndefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { username: 'testuser', password: 'wrongpassword' };

      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Login failed'),
        'AuthController',
      );
    });

    it('should log warning on authentication failure', async () => {
      const loginDto = { username: 'testuser', password: 'wrongpassword' };
      const errorMessage = 'Authentication service error';

      authService.login.mockRejectedValue(new Error(errorMessage));

      try {
        await controller.login(loginDto);
      } catch (error) {
        // Expected to throw
      }

      expect(loggerService.warn).toHaveBeenCalledWith(
        `Login failed: ${errorMessage}`,
        'AuthController',
      );
    });
  });
});
