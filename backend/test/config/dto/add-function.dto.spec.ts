import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AddFunctionDto } from '../../../src/config/dto';

const validateDto = (partial: Partial<AddFunctionDto>) => {
  const dto = plainToInstance(AddFunctionDto, partial);
  return validateSync(dto);
};

describe('AddFunctionDto', () => {
  it('requires tableName for addDataModelTable functions', () => {
    const errors = validateDto({
      functionName: 'addDataModelTable',
      columns: [{ name: '_key', type: 'string', param: 'id' }],
    });

    expect(errors.some((error) => error.property === 'tableName')).toBe(true);
  });

  it('rejects an empty tableName for addDataModelTable functions', () => {
    const errors = validateDto({
      functionName: 'addDataModelTable',
      tableName: '',
      columns: [{ name: '_key', type: 'string', param: 'id' }],
    });

    expect(errors.some((error) => error.property === 'tableName')).toBe(true);
  });

  it('allows a non-empty tableName for addDataModelTable functions', () => {
    const errors = validateDto({
      functionName: 'addDataModelTable',
      tableName: 'dm_table',
      columns: [{ name: '_key', type: 'string', param: 'id' }],
    });

    expect(errors).toHaveLength(0);
  });

  it('keeps tableName optional for other function names', () => {
    const errors = validateDto({
      functionName: 'addAccount',
      params: ['redis.dbtrAcctId'],
    });

    expect(errors).toHaveLength(0);
  });
});
