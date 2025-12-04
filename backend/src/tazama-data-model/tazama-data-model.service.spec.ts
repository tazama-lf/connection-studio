import { Test, TestingModule } from '@nestjs/testing';
import { TazamaDataModelService } from './tazama-data-model.service';

describe('TazamaDataModelService', () => {
  let service: TazamaDataModelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TazamaDataModelService],
    }).compile();

    service = module.get<TazamaDataModelService>(TazamaDataModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
