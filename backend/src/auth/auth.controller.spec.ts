import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { AuditService } from '../audit/audit.service';
import { TazamaAuthGuard } from './tazama-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let auditService: jest.Mocked<AuditService>;
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

  const mockAuditLogs = [
    {
      id: 1,
      tenantId: 'tenant1',
      entityType: 'config',
      entityId: '123',
      action: 'create',
      actor: 'user@example.com',
      timestamp: new Date(),
      details: {},
    },
    {
      id: 2,
      tenantId: 'tenant1',
      entityType: 'config',
      entityId: '124',
      action: 'update',
      actor: 'user@example.com',
      timestamp: new Date(),
      details: {},
    },
  ];

  beforeEach(async () => {
    const mockAuthService = {
      authenticate: jest.fn(),
      checkTokenExpiry: jest.fn(),
      getTimeToExpiry: jest.fn(),
      login: jest.fn(),
      isTokenExpired: jest.fn(),
    };

    const mockAuditService = {
      getAuditLogs: jest.fn(),
      logAction: jest.fn(),
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
          provide: AuditService,
          useValue: mockAuditService,
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
    auditService = module.get(AuditService);
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

      authService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(loggerService.log).toHaveBeenCalledWith('Login successful', 'AuthController');
      expect(result).toEqual({
        message: 'Login successful',
        token: 'mock-jwt-token',
        expiresIn: 3600,
      });
    });

    it('should return token without expiresIn when not provided', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      const mockAuthResult = {
        token: 'mock-jwt-token',
      };

      authService.login.mockResolvedValue(mockAuthResult);

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

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
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

  describe('getMe', () => {
    it('should return current user information', () => {
      const result = controller.getMe(mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should return user with all properties', () => {
      const fullUser = {
        ...mockUser,
        email: 'user@example.com',
        roles: ['editor', 'viewer'],
      };

      const result = controller.getMe(fullUser);

      expect(result).toEqual(fullUser);
      expect(result.email).toBe('user@example.com');
      expect(result.roles).toEqual(['editor', 'viewer']);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs for tenant', async () => {
      auditService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await controller.getAuditLogs(mockUser);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        undefined,
        undefined,
        undefined,
        undefined,
        100,
      );
      expect(result).toEqual({
        success: true,
        data: mockAuditLogs,
        count: 2,
        filters: {
          tenantId: 'tenant1',
          entityType: undefined,
          actor: undefined,
          startDate: undefined,
          endDate: undefined,
          limit: 100,
        },
      });
    });

    it('should return audit logs with custom limit', async () => {
      auditService.getAuditLogs.mockResolvedValue(mockAuditLogs.slice(0, 1));

      const result = await controller.getAuditLogs(mockUser, '1');

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        undefined,
        undefined,
        undefined,
        undefined,
        1,
      );
      expect(result.count).toBe(1);
      expect(result.filters.limit).toBe(1);
    });

    it('should filter audit logs by entityType', async () => {
      const filteredLogs = mockAuditLogs.filter((log) => log.entityType === 'config');
      auditService.getAuditLogs.mockResolvedValue(filteredLogs);

      const result = await controller.getAuditLogs(mockUser, undefined, 'config');

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        'config',
        undefined,
        undefined,
        undefined,
        100,
      );
      expect(result.filters.entityType).toBe('config');
    });

    it('should filter audit logs by actor', async () => {
      auditService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await controller.getAuditLogs(mockUser, undefined, undefined, 'user@example.com');

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        undefined,
        'user@example.com',
        undefined,
        undefined,
        100,
      );
      expect(result.filters.actor).toBe('user@example.com');
    });

    it('should filter audit logs by date range', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      auditService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await controller.getAuditLogs(mockUser, undefined, undefined, undefined, startDate, endDate);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        undefined,
        undefined,
        new Date(startDate),
        new Date(endDate),
        100,
      );
      expect(result.filters.startDate).toBe(startDate);
      expect(result.filters.endDate).toBe(endDate);
    });

    it('should handle user with tenantId in root', async () => {
      const userWithRootTenantId = {
        ...mockUser,
        token: undefined,
        tenantId: 'tenant2',
      };
      auditService.getAuditLogs.mockResolvedValue([]);

      const result = await controller.getAuditLogs(userWithRootTenantId);

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant2',
        undefined,
        undefined,
        undefined,
        undefined,
        100,
      );
      expect(result.filters.tenantId).toBe('tenant2');
    });

    it('should throw error when tenantId is not found', async () => {
      const userWithoutTenantId = {
        userId: 'user123',
        validClaims: ['view-profile'],
      };

      await expect(controller.getAuditLogs(userWithoutTenantId)).rejects.toThrow(
        'Tenant ID not found in user token or claims',
      );
    });

    it('should return empty array when no logs found', async () => {
      auditService.getAuditLogs.mockResolvedValue([]);

      const result = await controller.getAuditLogs(mockUser);

      expect(result).toEqual({
        success: true,
        data: [],
        count: 0,
        filters: {
          tenantId: 'tenant1',
          entityType: undefined,
          actor: undefined,
          startDate: undefined,
          endDate: undefined,
          limit: 100,
        },
      });
    });

    it('should apply all filters simultaneously', async () => {
      auditService.getAuditLogs.mockResolvedValue([mockAuditLogs[0]]);

      const result = await controller.getAuditLogs(
        mockUser,
        '50',
        'config',
        'user@example.com',
        '2025-01-01',
        '2025-12-31',
      );

      expect(auditService.getAuditLogs).toHaveBeenCalledWith(
        'tenant1',
        'config',
        'user@example.com',
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        50,
      );
      expect(result.filters).toEqual({
        tenantId: 'tenant1',
        entityType: 'config',
        actor: 'user@example.com',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        limit: 50,
      });
    });
  });
});

