import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CloneConfigDto, CreateConfigDto } from '../../../src/config/dto';

// Mirrors the options main.ts's global ValidationPipe actually uses
// (whitelist + forbidNonWhitelisted).
const validateAsPipeWould = (
  dtoClass: typeof CreateConfigDto | typeof CloneConfigDto,
  plain: Record<string, unknown>,
) => {
  const dto = plainToInstance(dtoClass, plain);
  return validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
};

const basePayload = {
  msgFam: 'pacs.008',
  transactionType: 'pacs.008',
  version: '1.0.0',
  schema: {},
  payload: { sample: 'value' },
};

const mapping = [
  {
    source: ['Document.FIToFICstmrCdtTrf.GrpHdr.MsgId'],
    destination: 'transactionDetails.MsgId',
  },
];

describe('CreateConfigDto', () => {
  it('accepts a payload without mapping', () => {
    expect(validateAsPipeWould(CreateConfigDto, basePayload)).toHaveLength(0);
  });

  it('rejects mapping: creating a config does not take mappings', () => {
    const errors = validateAsPipeWould(CreateConfigDto, {
      ...basePayload,
      mapping,
    });

    expect(errors.some((error) => error.property === 'mapping')).toBe(true);
  });
});

describe('CloneConfigDto (issue #136 - cloning with existing mappings)', () => {
  it('accepts a mapping array', () => {
    expect(
      validateAsPipeWould(CloneConfigDto, { ...basePayload, mapping }),
    ).toHaveLength(0);
  });

  it('still allows mapping to be omitted (optional)', () => {
    expect(validateAsPipeWould(CloneConfigDto, basePayload)).toHaveLength(0);
  });

  it('rejects a non-array mapping value', () => {
    const errors = validateAsPipeWould(CloneConfigDto, {
      ...basePayload,
      mapping: 'not-an-array',
    });

    expect(errors.some((error) => error.property === 'mapping')).toBe(true);
  });

  it('rejects non-object mapping entries', () => {
    const errors = validateAsPipeWould(CloneConfigDto, {
      ...basePayload,
      mapping: [null],
    });

    expect(errors.some((error) => error.property === 'mapping')).toBe(true);
  });

  it('keeps the create rules: still requires msgFam and rejects unknown fields', () => {
    const { msgFam: _omitted, ...withoutMsgFam } = basePayload;

    expect(
      validateAsPipeWould(CloneConfigDto, withoutMsgFam).some(
        (error) => error.property === 'msgFam',
      ),
    ).toBe(true);
    expect(
      validateAsPipeWould(CloneConfigDto, {
        ...basePayload,
        someUnknownField: 'x',
      }).some((error) => error.property === 'someUnknownField'),
    ).toBe(true);
  });
});
