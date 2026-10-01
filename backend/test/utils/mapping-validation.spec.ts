import {
  getFieldValue,
  validateMappings,
  validateMappingDestinations,
} from '../../src/utils/mapping-validation';

describe('utils/mapping-validation', () => {
  describe('getFieldValue', () => {
    it('returns undefined for empty path', () => {
      expect(getFieldValue({ field: 'value' }, '')).toBeUndefined();
    });

    it('normalizes bracket notation before resolving', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getFieldValue(obj, 'items[1].name')).toBe('second');
    });

    it('resolves plain dot paths', () => {
      const obj = { a: { b: { c: 1 } } };
      expect(getFieldValue(obj, 'a.b.c')).toBe(1);
    });

    it('returns undefined for a path that does not resolve', () => {
      expect(getFieldValue({ a: 1 }, 'a.b.c')).toBeUndefined();
    });
  });

  describe('validateMappings (source validation)', () => {
    it('returns no errors when all sources resolve in the payload', () => {
      const payload = { FIToFIPmtSts: { TxSts: 'ACSC' } };
      const mappings = [
        { source: 'FIToFIPmtSts.TxSts', destination: 'status' },
      ];
      expect(validateMappings(payload, mappings)).toEqual([]);
    });

    it('reports a mapping whose source does not exist in the payload', () => {
      const payload = { FIToFIPmtSts: { TxSts: 'ACSC' } };
      const mappings = [
        { source: 'FIToFIPmtSts.Missing', destination: 'status' },
      ];
      const errors = validateMappings(payload, mappings);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('FIToFIPmtSts.Missing');
      expect(errors[0].path).toBe('mappings[0]');
    });

    it('resolves array-of-objects [0] bracket-notation sources', () => {
      const payload = {
        FIToFIPmtSts: {
          TxInfAndSts: { ChrgsInf: [{ Amt: { Amt: '1', Ccy: 'USD' } }] },
        },
      };
      const mappings = [
        {
          source: 'FIToFIPmtSts.TxInfAndSts.ChrgsInf[0].Amt.Amt',
          destination: 'transactionDetails.Amt',
        },
      ];
      expect(validateMappings(payload, mappings)).toEqual([]);
    });

    it('skips CONSTANT mappings', () => {
      const payload = {};
      const mappings = [
        {
          transformation: 'CONSTANT',
          constantValue: 'fixed',
          destination: 'status',
        },
      ];
      expect(validateMappings(payload, mappings)).toEqual([]);
    });

    it('treats runtime-context fields (tenantId, userId) as always present', () => {
      const payload = {};
      const mappings = [{ source: 'tenantId', destination: 'tenant' }];
      expect(validateMappings(payload, mappings)).toEqual([]);
    });

    it('reports missing destination field', () => {
      const payload = { a: 1 };
      const mappings = [{ source: 'a' }];
      const errors = validateMappings(payload, mappings);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Missing destination field');
    });
  });

  describe('validateMappingDestinations', () => {
    it('returns no errors when all destinations resolve in the data model', () => {
      const dataModel = { transactionDetails: { Amt: 0, Ccy: '' } };
      const mappings = [
        { source: 'a.Amt', destination: 'transactionDetails.Amt' },
      ];
      expect(validateMappingDestinations(dataModel, mappings)).toEqual([]);
    });

    it('reports a mapping whose destination does not exist in the data model', () => {
      const dataModel = { transactionDetails: { Amt: 0 } };
      const mappings = [
        { source: 'a.Amt', destination: 'transactionDetails.Missing' },
      ];
      const errors = validateMappingDestinations(dataModel, mappings);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('transactionDetails.Missing');
    });

    it('skips CONSTANT mappings', () => {
      const dataModel = {};
      const mappings = [
        { transformation: 'CONSTANT', constantValue: 'x', destination: 'y' },
      ];
      expect(validateMappingDestinations(dataModel, mappings)).toEqual([]);
    });

    it('handles multiple destinations (SPLIT) and reports only the missing ones', () => {
      const dataModel = { a: 1 };
      const mappings = [{ source: 's', destination: ['a', 'b'] }];
      const errors = validateMappingDestinations(dataModel, mappings);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('b');
      expect(errors[0].message).not.toContain(', a');
    });

    it('reports missing destination when none is provided', () => {
      const dataModel = {};
      const mappings = [{ source: 's' }];
      const errors = validateMappingDestinations(dataModel, mappings);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Missing destination field');
    });
  });
});
