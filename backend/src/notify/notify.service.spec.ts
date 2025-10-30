import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import { Test, TestingModule } from '@nestjs/testing';
import { NotifyService } from './notify.service';
import { LoggerService } from '@tazama-lf/frms-coe-lib';

describe('NotifyService', () => {
  let service: NotifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyService,
        { provide: LoggerService, useValue: {} }
      ],
    }).compile();

    service = module.get<NotifyService>(NotifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
