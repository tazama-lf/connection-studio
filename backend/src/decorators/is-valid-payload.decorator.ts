import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator that accepts only non-empty strings or non-empty objects.
 * - Non-empty string: typeof === 'string' && value.length > 0
 * - Non-empty object: typeof === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 0
 */
@ValidatorConstraint({ name: 'IsValidPayload', async: false })
export class IsValidPayloadConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.length > 0;
    }
    if (typeof value === 'object' && value !== null) {
      return !Array.isArray(value) && Object.keys(value).length > 0;
    }
    return false;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Payload must be a non-empty string or a non-empty object';
  }
}

export function IsValidPayload(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsValidPayload',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsValidPayloadConstraint,
    });
  };
}
