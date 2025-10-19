import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { DatabaseService } from '../database/database.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';

describe('JobService', () => {
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: DatabaseService,
          useValue: {}
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn()
          }
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
