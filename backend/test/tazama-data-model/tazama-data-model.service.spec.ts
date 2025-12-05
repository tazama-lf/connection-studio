import { Test, TestingModule } from '@nestjs/testing';
import { TazamaDataModelService } from '../../src/tazama-data-model/tazama-data-model.service';
import { TazamaDataModelRepository } from '../../src/tazama-data-model/tazama-data-model.repository';

describe('TazamaDataModelService', () => {
  let service: TazamaDataModelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TazamaDataModelService,
        {
          provide: TazamaDataModelRepository,
          useValue: {
            // Mock methods that the service might use
            getCollectionFields: jest.fn(),
            getFieldProperties: jest.fn(),
            createField: jest.fn(),
            updateField: jest.fn(),
            deleteField: jest.fn(),
            getDestinationTypes: jest.fn(),
            createDestinationType: jest.fn(),
            updateDestinationType: jest.fn(),
            deleteDestinationType: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TazamaDataModelService>(TazamaDataModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});