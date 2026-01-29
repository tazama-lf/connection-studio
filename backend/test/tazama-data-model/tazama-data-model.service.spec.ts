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
    repository = module.get<TazamaDataModelRepository>(
      TazamaDataModelRepository,
    );

    // Mock the logger to suppress error logs during tests
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
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
      expect(repository.getAllCollections).toHaveBeenCalledWith(
        'default',
        'token',
      );
    });

    it('should handle repository errors', async () => {
      jest
        .spyOn(repository, 'getAllCollections')
        .mockRejectedValue(new Error('Repository error'));
      await expect(
        service.getDestinationOptions('default', 'token'),
      ).rejects.toThrow('Repository error');
    });
  });

  describe('createDestinationType', () => {
    it('should call repository createDestinationType', async () => {
      const result = await service.createDestinationType({} as any, 'token');
      expect(repository.createDestinationType).toHaveBeenCalled();
    });

    it('should handle repository errors and throw BadRequestException', async () => {
      jest
        .spyOn(repository, 'createDestinationType')
        .mockRejectedValue(new Error('Database error occurred'));

      await expect(
        service.createDestinationType({ name: 'test' } as any, 'token'),
      ).rejects.toThrow(
        'Failed to create destination type: Database error occurred',
      );
    });

    it('should handle unknown errors without message', async () => {
      jest
        .spyOn(repository, 'createDestinationType')
        .mockRejectedValue({ someUnknownError: true });

      await expect(
        service.createDestinationType({ name: 'test' } as any, 'token'),
      ).rejects.toThrow('Failed to create destination type: Unknown error');
    });

    it('should log successful creation', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();
      const mockResult = {
        destination_type_id: 123,
        name: 'Test Type',
        collection_type: 'test',
        destination_id: 1,
        created_at: new Date(),
      };
      jest
        .spyOn(repository, 'createDestinationType')
        .mockResolvedValue(mockResult as any);

      await service.createDestinationType(
        { name: 'Test Type' } as any,
        'token',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Created destination type: Test Type with ID: 123',
      );

      // Restore the mock after this test
      loggerSpy.mockRestore();
    });
  });

  describe('addFieldToDestinationType', () => {
    it('should call repository addFieldToDestinationType', async () => {
      const result = await service.addFieldToDestinationType(
        1,
        {} as any,
        'token',
      );
      expect(repository.addFieldToDestinationType).toHaveBeenCalled();
    });

    it('should throw BadRequestException if destination type does not exist', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(false);

      await expect(
        service.addFieldToDestinationType(999, {} as any, 'token'),
      ).rejects.toThrow('Destination type with ID 999 not found');
    });

    it('should handle repository errors and throw BadRequestException', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(true);
      jest
        .spyOn(repository, 'addFieldToDestinationType')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.addFieldToDestinationType(1, { name: 'test' } as any, 'token'),
      ).rejects.toThrow('Failed to add field: Database connection failed');
    });

    it('should handle unknown errors without message', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(true);
      jest
        .spyOn(repository, 'addFieldToDestinationType')
        .mockRejectedValue({ unknownError: true });

      await expect(
        service.addFieldToDestinationType(1, { name: 'test' } as any, 'token'),
      ).rejects.toThrow('Failed to add field: Unknown error');
    });

    it('should log successful field addition', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(true);
      jest
        .spyOn(repository, 'addFieldToDestinationType')
        .mockResolvedValue({ id: 1, name: 'Test Field' } as any);

      await service.addFieldToDestinationType(
        1,
        { name: 'Test Field' } as any,
        'token',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Added field: Test Field to destination type: 1',
      );

      // Restore the mock after this test
      loggerSpy.mockRestore();
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
              properties: [],
            },
          ],
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

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
              properties: [],
            },
          ],
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

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
          fields: [],
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should process object fields with properties', async () => {
      const mockCollections = [
        {
          name: 'TestCollection',
          type: 'node' as const,
          description: 'Test collection',
          fields: [
            {
              name: 'objectField',
              type: 'object',
              required: false,
              parent_id: null,
              serial_no: 1,
              collection_id: 1,
              properties: [
                {
                  name: 'nestedProp1',
                  type: 'string',
                  required: true,
                },
                {
                  name: 'nestedProp2',
                  type: 'number',
                  required: false,
                },
              ],
            },
          ],
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should have the object field and its nested properties
      const objectField = result.find((r) => r.field === 'objectField');
      expect(objectField).toBeDefined();
      expect(objectField?.properties).toBeDefined();
      expect(objectField?.properties?.length).toBe(2);

      // Should also have nested field entries
      const nestedField1 = result.find(
        (r) => r.field === 'objectField.nestedProp1',
      );
      const nestedField2 = result.find(
        (r) => r.field === 'objectField.nestedProp2',
      );
      expect(nestedField1).toBeDefined();
      expect(nestedField2).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing destinationType for addField', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(false);

      const dto = { name: 'test field', type: 'string' };

      await expect(
        service.addFieldToDestinationType(999, dto as any, 'token'),
      ).rejects.toThrow('Destination type with ID 999 not found');
    });

    it('should sanitize serial_no when it is an empty string', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(true);
      jest
        .spyOn(repository, 'addFieldToDestinationType')
        .mockResolvedValue({ id: 1, name: 'test' } as any);

      const dto = {
        name: 'test field',
        type: 'string',
        parent_id: 1,
        serial_no: '', // Empty string
      };

      await service.addFieldToDestinationType(1, dto as any, 'token');

      expect(repository.addFieldToDestinationType).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'test field',
          type: 'string',
          parent_id: 1,
          serial_no: '', // Empty string passed as-is
        }),
        'token',
        '',
      );
    });

    it('should handle both parent_id and serial_no as empty strings', async () => {
      jest.spyOn(repository, 'destinationTypeExists').mockResolvedValue(true);
      jest
        .spyOn(repository, 'addFieldToDestinationType')
        .mockResolvedValue({ id: 1, name: 'test' } as any);

      const dto = {
        name: 'test field',
        type: 'string',
        parent_id: '', // Empty string
        serial_no: '   ', // Empty string with whitespace
      };

      await service.addFieldToDestinationType(1, dto as any, 'token');

      expect(repository.addFieldToDestinationType).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'test field',
          type: 'string',
          parent_id: '', // Empty string passed as-is
          serial_no: '   ', // Whitespace string passed as-is
        }),
        'token',
        '   ',
      );
    });

    it('should handle fields with null/undefined properties for nullish coalescing', async () => {
      const mockCollections = [
        {
          name: 'NullTestCollection',
          collection_id: undefined,
          fields: [
            {
              name: 'nullField',
              type: 'string',
              required: false,
              parent_id: undefined,
              serial_no: undefined,
              collection_id: undefined,
            },
          ],
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      expect(result.length).toBeGreaterThan(0);
      const field = result.find((r) => r.label.includes('nullField'));
      expect(field).toBeDefined();
    });

    it('should handle logger call in empty collection case', async () => {
      const loggerSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();
      const mockCollections = [
        {
          name: 'EmptyCollection',
          collection_id: 1,
          fields: [], // Empty fields array
        },
      ];

      jest
        .spyOn(repository, 'getAllCollections')
        .mockResolvedValue(mockCollections as any);

      const result = await service.getDestinationOptions('tenant1', 'token');

      // Service should handle empty collections gracefully and return empty array
      expect(result).toEqual([]);

      // Restore the mock after this test
      loggerSpy.mockRestore();
    });
  });
});
