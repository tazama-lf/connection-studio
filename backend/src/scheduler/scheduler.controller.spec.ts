import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';

describe('SchedulerController', () => {
  let controller: SchedulerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        SchedulerService,
        {
          provide: 'KNEX_CONNECTION',
          useValue: {},
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
          },
        },
      ]
    }).compile();

    controller = module.get<SchedulerController>(SchedulerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
