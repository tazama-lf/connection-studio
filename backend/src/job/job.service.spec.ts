import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { DatabaseService } from '../database/database.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { DryRunService } from '../dry-run/dry-run.service';
import { ConfigService } from '@nestjs/config';
import { SftpService } from '../sftp/sftp.service';
import { NotifyService } from '../notify/notify.service';
import { AdminServiceClient } from 'src/services/admin-service-client.service';

describe('JobService', () => {
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: DatabaseService,
          useValue: {},
        },
        {
          provide: DryRunService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: SftpService,
          useValue: {},
        },
        {
          provide: NotifyService,
          useValue: {},
        },
        {
          provide: LoggerService,
          useValue: {
            error: jest.fn(),
          },
        },
        {
          provide: AdminServiceClient,
          useValue: {
            createPushJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
