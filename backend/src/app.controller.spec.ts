import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TazamaAuthGuard } from './auth/tazama-auth.guard';
import { SessionManagerService } from './auth/session-manager.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SessionManagerService,
          useValue: {
            recordActivity: jest.fn(),
            isSessionActive: jest.fn().mockReturnValue(true),
            getSessionTimeRemaining: jest.fn().mockReturnValue(1800),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(30),
          },
        },
      ],
    })
      .overrideGuard(TazamaAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
