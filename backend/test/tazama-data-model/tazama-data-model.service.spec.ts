import { Test, TestingModule } from '@nestjs/testing';
import { TazamaDataModelService } from '../../src/tazama-data-model/tazama-data-model.service';
import { TazamaDataModelRepository } from '../../src/tazama-data-model/tazama-data-model.repository';

describe('TazamaDataModelService', () => {
  let service: TazamaDataModelService;
  let repository: TazamaDataModelRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TazamaDataModelService,
        {
          provide: TazamaDataModelRepository,
          useValue: {
            getAllCollections: jest.fn().mockResolvedValue([]),
            createDestinationType: jest.fn().mockResolvedValue({}),
            addFieldToDestinationType: jest.fn().mockResolvedValue({}),
            destinationTypeExists: jest.fn().mockResolvedValue(true),
            getDestinationTypes: jest.fn().mockResolvedValue([]),
            updateDestinationType: jest.fn().mockResolvedValue({}),
            deleteDestinationType: jest.fn().mockResolvedValue({}),
            getFieldProperties: jest.fn().mockResolvedValue([]),
            createField: jest.fn().mockResolvedValue({}),
            updateField: jest.fn().mockResolvedValue({}),
            deleteField: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<TazamaDataModelService>(TazamaDataModelService);
    repository = module.get<TazamaDataModelRepository>(TazamaDataModelRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDestinationOptions', () => {
    it('should return empty array when no collections', async () => {
      const result = await service.getDestinationOptions('default', 'token');
      expect(result).toEqual([]);
      expect(repository.getAllCollections).toHaveBeenCalledWith('default', 'token');
    });

    it('should handle repository errors', async () => {
      jest.spyOn(repository, 'getAllCollections').mockRejectedValue(new Error('Repository error'));
      await expect(service.getDestinationOptions('default', 'token')).rejects.toThrow('Repository error');
    });
  });

  describe('createDestinationType', () => {
    it('should call repository createDestinationType', async () => {
      const result = await service.createDestinationType({} as any, 'token');
      expect(repository.createDestinationType).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      jest.spyOn(repository, 'createDestinationType').mockRejectedValue(new Error('Creation failed'));
      await expect(service.createDestinationType({} as any, 'token')).rejects.toThrow('Creation failed');
    });
  });

  describe('addFieldToDestinationType', () => {
    it('should call repository addFieldToDestinationType', async () => {
      const result = await service.addFieldToDestinationType(1, {} as any, 'token');
      expect(repository.addFieldToDestinationType).toHaveBeenCalled();
    });

    it('should handle addition errors', async () => {
      jest.spyOn(repository, 'addFieldToDestinationType').mockRejectedValue(new Error('Addition failed'));
      await expect(service.addFieldToDestinationType(1, {} as any, 'token')).rejects.toThrow('Addition failed');
    });
  });

  describe('getDestinationOptions with collections', () => {
    it('should process collections with nested properties', async () => {
      const mockCollections = [
        {
          name: 'TestCollection',
          type: 'node' as const,
          description: 'Test collection',
          fields: [
            {
              name: 'field1',
              type: 'string',
              required: true,
              parent_id: null,
              serial_no: 1,
              collection_id: 1,
              properties: []
            }
          ]
        }
      ];

      jest.spyOn(repository, 'getAllCollections').mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different field types', async () => {
      const mockCollections = [
        {
          name: 'ComplexCollection',
          type: 'node' as const,
          description: 'Complex test collection',
          fields: [
            {
              name: 'arrayField',
              type: 'array',
              required: true,
              parent_id: null,
              serial_no: 1,
              collection_id: 1,
              properties: []
            }
          ]
        }
      ];

      jest.spyOn(repository, 'getAllCollections').mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty collections gracefully', async () => {
      const mockCollections = [
        {
          name: 'EmptyCollection',
          type: 'node' as const,
          description: 'Empty collection',
          fields: []
        }
      ];

      jest.spyOn(repository, 'getAllCollections').mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing destinationType for addField', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(false);

      const dto = { name: 'test field', type: 'string' };
      
      await expect(service.addFieldToDestinationType(999, dto as any, 'token'))
        .rejects.toThrow('Destination type with ID 999 not found');
    });
  });
});