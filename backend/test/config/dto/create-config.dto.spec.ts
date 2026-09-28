import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateConfigDto } from '../../../src/config/dto';

// Mirrors the options main.ts's global ValidationPipe actually uses
// (whitelist + forbidNonWhitelisted) — this is what turned an unknown
// 'mapping' field into a 400 before this field existed on the DTO.
const validateAsPipeWould = (plain: Record<string, unknown>) => {
  const dto = plainToInstance(CreateConfigDto, plain);
  return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
};

describe('CreateConfigDto (issue #136 — cloning with existing mappings)', () => {
  const basePayload = {
    transactionType: 'pacs.008',
    version: '1.0.0',
    payload: { sample: 'value' },
  };

  it('no longer rejects a mapping array as an unrecognized property', () => {
    const errors = validateAsPipeWould({
      ...basePayload,
      mapping: [
        {
          source: ['Document.FIToFICstmrCdtTrf.GrpHdr.MsgId'],
          destination: 'transactionDetails.MsgId',
        },
      ],
    });

    expect(errors).toHaveLength(0);
  });

  it('still allows mapping to be omitted (optional)', () => {
    const errors = validateAsPipeWould({ ...basePayload });

    expect(errors).toHaveLength(0);
  });

  it('still rejects a genuinely unknown field (whitelist behavior otherwise unchanged)', () => {
    const errors = validateAsPipeWould({
      ...basePayload,
      someUnknownField: 'should be rejected',
    });

    expect(errors.some((error) => error.property === 'someUnknownField')).toBe(
      true,
    );
  });

  it('rejects a non-array mapping value', () => {
    const errors = validateAsPipeWould({
      ...basePayload,
      mapping: 'not-an-array',
    });

    expect(errors.some((error) => error.property === 'mapping')).toBe(true);
  });
});
