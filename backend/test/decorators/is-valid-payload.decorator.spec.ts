import { validateSync } from 'class-validator';
import {
  IsValidPayload,
  IsValidPayloadConstraint,
} from '../../src/decorators/is-valid-payload.decorator';

class PayloadDto {
  @IsValidPayload()
  payload!: unknown;
}

describe('IsValidPayloadConstraint', () => {
  const constraint = new IsValidPayloadConstraint();

  it('accepts non-empty strings and non-empty objects', () => {
    expect(constraint.validate('{"name":"alice"}')).toBe(true);
    expect(constraint.validate({ name: 'alice' })).toBe(true);
  });

  it('rejects empty strings, empty objects, arrays, null, and primitives', () => {
    expect(constraint.validate('')).toBe(false);
    expect(constraint.validate({})).toBe(false);
    expect(constraint.validate([])).toBe(false);
    expect(constraint.validate(null)).toBe(false);
    expect(constraint.validate(123)).toBe(false);
    expect(constraint.validate(true)).toBe(false);
  });

  it('returns the expected validation message', () => {
    expect(constraint.defaultMessage({} as never)).toBe(
      'Payload must be a non-empty string or a non-empty object',
    );
  });

  it('registers as a class-validator decorator', () => {
    const validDto = new PayloadDto();
    validDto.payload = { name: 'alice' };

    const invalidDto = new PayloadDto();
    invalidDto.payload = {};

    expect(validateSync(validDto)).toHaveLength(0);
    expect(validateSync(invalidDto)[0].constraints).toEqual({
      IsValidPayload:
        'Payload must be a non-empty string or a non-empty object',
    });
  });
});
