import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
            getDataModelJson: jest.fn(),
            putDataModelJson: jest.fn(),
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

  describe('getDataModelJson', () => {
    it('should successfully get data model JSON', async () => {
      const mockData = { model: 'test' };
      const tenantId = 'tenant123';
      const token = 'token123';

      jest.spyOn(repository, 'getDataModelJson').mockResolvedValue(mockData);

      const result = await service.getDataModelJson(tenantId, token);

      expect(result).toEqual(mockData);
      expect(repository.getDataModelJson).toHaveBeenCalledWith(tenantId, token);
      expect(service['logger'].log).toHaveBeenCalledWith(`Getting data model JSON for tenant: ${tenantId}`);
      expect(service['logger'].log).toHaveBeenCalledWith(`Successfully retrieved data model JSON for tenant: ${tenantId}`);
    });

    it('should handle errors and throw BadRequestException', async () => {
      const tenantId = 'tenant123';
      const token = 'token123';
      const errorMessage = 'Database error';

      jest.spyOn(repository, 'getDataModelJson').mockRejectedValue(new Error(errorMessage));

      await expect(service.getDataModelJson(tenantId, token))
        .rejects.toThrow(BadRequestException);

      expect(service['logger'].error).toHaveBeenCalledWith(`Failed to get data model JSON: ${errorMessage}`);
    });

    it('should handle unknown error without message', async () => {
      const tenantId = 'tenant123';
      const token = 'token123';

      jest.spyOn(repository, 'getDataModelJson').mockRejectedValue({});

      await expect(service.getDataModelJson(tenantId, token))
        .rejects.toThrow('Failed to get data model JSON: Unknown error');

      expect(service['logger'].error).toHaveBeenCalledWith('Failed to get data model JSON: Unknown error');
    });
  });

  describe('putDataModelJson', () => {
    it('should successfully save data model JSON', async () => {
      const tenantId = 'tenant123';
      const dataModelJson = { model: 'test' };
      const token = 'token123';
      const mockResult = { tenant_id: tenantId, updated_at: '2023-01-01T00:00:00Z' };

      jest.spyOn(repository, 'putDataModelJson').mockResolvedValue(mockResult);

      const result = await service.putDataModelJson(tenantId, dataModelJson, token);

      expect(result).toEqual(mockResult);
      expect(repository.putDataModelJson).toHaveBeenCalledWith(tenantId, dataModelJson, token);
      expect(service['logger'].log).toHaveBeenCalledWith(`Saving data model JSON for tenant: ${tenantId}`);
      expect(service['logger'].log).toHaveBeenCalledWith(`Successfully saved data model JSON for tenant: ${tenantId}`);
    });

    it('should handle errors and throw BadRequestException', async () => {
      const tenantId = 'tenant123';
      const dataModelJson = { model: 'test' };
      const token = 'token123';
      const errorMessage = 'Save failed';

      jest.spyOn(repository, 'putDataModelJson').mockRejectedValue(new Error(errorMessage));

      await expect(service.putDataModelJson(tenantId, dataModelJson, token))
        .rejects.toThrow(BadRequestException);

      expect(service['logger'].error).toHaveBeenCalledWith(`Failed to save data model JSON: ${errorMessage}`);
    });

    it('should handle unknown error without message', async () => {
      const tenantId = 'tenant123';
      const dataModelJson = { model: 'test' };
      const token = 'token123';

      jest.spyOn(repository, 'putDataModelJson').mockRejectedValue({});

      await expect(service.putDataModelJson(tenantId, dataModelJson, token))
        .rejects.toThrow('Failed to save data model JSON: Unknown error');

      expect(service['logger'].error).toHaveBeenCalledWith('Failed to save data model JSON: Unknown error');
    });
  });
});