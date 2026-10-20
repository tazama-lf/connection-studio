import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TazamaDataModelController } from '../../src/tazama-data-model/tazama-data-model.controller';
import { TazamaDataModelService } from '../../src/tazama-data-model/tazama-data-model.service';
import type { AuthenticatedUser } from '../../src/auth/auth.types';

describe('TazamaDataModelController', () => {
  let controller: TazamaDataModelController;
  let service: TazamaDataModelService;

  const mockUser: AuthenticatedUser = {
    tenantId: 'tenant123',
    token: { tokenString: 'token123' },
  } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TazamaDataModelController],
      providers: [
        {
          provide: TazamaDataModelService,
          useValue: {
            getDataModelJson: jest.fn(),
            putDataModelJson: jest.fn(),
          },
        },
        {
          provide: 'AUDIT_LOGGER',
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<TazamaDataModelController>(
      TazamaDataModelController,
    );
    service = module.get<TazamaDataModelService>(TazamaDataModelService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDataModelJson', () => {
    it('returns success:true with data on a successful service call', async () => {
      const mockData = { redis: { host: 'localhost' } };
      jest.spyOn(service, 'getDataModelJson').mockResolvedValue(mockData);

      const result = await controller.getDataModelJson(mockUser);

      expect(result).toEqual({ success: true, data: mockData });
    });

    it('propagates BadRequestException instead of returning 200 with success:false', async () => {
      jest
        .spyOn(service, 'getDataModelJson')
        .mockRejectedValue(
          new BadRequestException('Failed to get data model JSON: boom'),
        );

      await expect(controller.getDataModelJson(mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('putDataModelJson', () => {
    const body = { data_model_json: { redis: { host: 'localhost' } } };

    it('returns success:true with data on a successful service call', async () => {
      const mockResult = {
        tenant_id: 'tenant123',
        updated_at: '2026-10-15T00:00:00.000Z',
      };
      jest.spyOn(service, 'putDataModelJson').mockResolvedValue(mockResult);

      const result = await controller.putDataModelJson(body, mockUser);

      expect(result).toEqual({
        success: true,
        message: `Data model JSON saved for tenant: ${mockUser.tenantId}`,
        data: mockResult,
      });
    });

    it('propagates BadRequestException instead of returning 200 with success:false', async () => {
      jest
        .spyOn(service, 'putDataModelJson')
        .mockRejectedValue(
          new BadRequestException(
            'Field "redis" has an empty or invalid name/value. Please provide a valid name and value before saving.',
          ),
        );

      await expect(controller.putDataModelJson(body, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
