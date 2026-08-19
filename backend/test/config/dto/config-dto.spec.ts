import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateConfigDto } from '../../../src/config/dto/create-config.dto';
import { UpdateConfigDto } from '../../../src/config/dto/update-config.dto';

const LONG_51 = 'a'.repeat(51);
const MAX_50 = 'a'.repeat(50);

describe('config/dto', () => {
  describe('CreateConfigDto', () => {
    const basePayload = {
      transactionType: 'pacs008',
      version: '1.0.0',
      payload: { foo: 'bar' },
    };

    it.each(['version', 'transactionType', 'msgFam'] as const)(
      'accepts %s at exactly 50 characters',
      async (field) => {
        const dto = plainToInstance(CreateConfigDto, {
          ...basePayload,
          [field]: MAX_50,
        });

        const errors = await validate(dto);

        expect(errors.find((e) => e.property === field)).toBeUndefined();
      },
    );

    it.each(['version', 'transactionType', 'msgFam'] as const)(
      'rejects %s longer than 50 characters',
      async (field) => {
        const dto = plainToInstance(CreateConfigDto, {
          ...basePayload,
          [field]: LONG_51,
        });

        const errors = await validate(dto);
        const fieldError = errors.find((e) => e.property === field);

        expect(fieldError).toBeDefined();
        expect(fieldError?.constraints).toHaveProperty('maxLength');
      },
    );

    it.each(['version', 'transactionType', 'msgFam'] as const)(
      'rejects an empty %s when provided',
      async (field) => {
        const dto = plainToInstance(CreateConfigDto, {
          ...basePayload,
          [field]: '',
        });

        const errors = await validate(dto);
        const fieldError = errors.find((e) => e.property === field);

        expect(fieldError).toBeDefined();
        expect(fieldError?.constraints).toHaveProperty('minLength');
      },
    );
  });

  describe('UpdateConfigDto', () => {
    it.each(['version', 'transactionType', 'msgFam'] as const)(
      'rejects %s longer than 50 characters',
      async (field) => {
        const dto = plainToInstance(UpdateConfigDto, {
          [field]: LONG_51,
        });

        const errors = await validate(dto);
        const fieldError = errors.find((e) => e.property === field);

        expect(fieldError).toBeDefined();
        expect(fieldError?.constraints).toHaveProperty('maxLength');
      },
    );

    it('allows omitting version, transactionType, and msgFam entirely', async () => {
      const dto = plainToInstance(UpdateConfigDto, {});

      const errors = await validate(dto);

      expect(
        errors.filter((e) =>
          ['version', 'transactionType', 'msgFam'].includes(e.property),
        ),
      ).toHaveLength(0);
    });
  });
});
