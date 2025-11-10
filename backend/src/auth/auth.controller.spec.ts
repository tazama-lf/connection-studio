import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { AuditService } from '../audit/audit.service';
import { TazamaAuthGuard } from './tazama-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            authenticate: jest.fn(),
            checkTokenExpiry: jest.fn(),
            getTimeToExpiry: jest.fn(),
            login: jest.fn(),
            isTokenExpired: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            getAuditLogs: jest.fn().mockResolvedValue([]),
            logAction: jest.fn().mockResolvedValue(undefined),
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
    })
      .overrideGuard(TazamaAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
