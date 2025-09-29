import { MappingTransformations } from './mapping-transformations';
describe('MappingTransformations', () => {
  describe('direct', () => {
    it('should return the input value unchanged', () => {
      expect(MappingTransformations.direct('test')).toBe('test');
      expect(MappingTransformations.direct(123)).toBe(123);
      expect(MappingTransformations.direct({ key: 'value' })).toEqual({
        key: 'value',
      });
    });
  });
  describe('concat', () => {
    it('should concatenate strings with default separator', () => {
      const result = MappingTransformations.concat(['Hello', 'World']);
      expect(result).toBe('Hello World');
    });
    it('should concatenate strings with custom separator', () => {
      const result = MappingTransformations.concat(['John', 'Doe'], ', ');
      expect(result).toBe('John, Doe');
    });
    it('should handle null and undefined values', () => {
      const result = MappingTransformations.concat([
        'Hello',
        null,
        'World',
        undefined,
      ]);
      expect(result).toBe('Hello World');
    });
    it('should convert non-string values to strings', () => {
      const result = MappingTransformations.concat([123, 456], '-');
      expect(result).toBe('123-456');
    });
    it('should throw error for non-array input', () => {
      expect(() => MappingTransformations.concat('not-array' as any)).toThrow();
    });
  });
  describe('sum', () => {
    it('should sum numeric values', () => {
      const result = MappingTransformations.sum([1, 2, 3, 4]);
      expect(result).toBe(10);
    });
    it('should handle string numbers', () => {
      const result = MappingTransformations.sum([1, '2', 3]);
      expect(result).toBe(6);
    });
    it('should handle null and undefined values', () => {
      const result = MappingTransformations.sum([1, null, 3, undefined]);
      expect(result).toBe(4);
    });
    it('should throw error for non-numeric values', () => {
      expect(() => MappingTransformations.sum([1, 'invalid', 3])).toThrow();
    });
    it('should throw error for non-array input', () => {
      expect(() => MappingTransformations.sum('not-array' as any)).toThrow();
    });
  });
  describe('split', () => {
    it('should split string by default comma delimiter', () => {
      const result = MappingTransformations.split('apple,banana,cherry');
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });
    it('should split string by custom delimiter', () => {
      const result = MappingTransformations.split('apple|banana|cherry', '|');
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });
    it('should trim whitespace from parts', () => {
      const result = MappingTransformations.split('apple, banana , cherry');
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });
    it('should split string by space delimiter', () => {
      const result = MappingTransformations.split('John Doe', ' ');
      expect(result).toEqual(['John', 'Doe']);
    });
    it('should handle empty string split by space', () => {
      const result = MappingTransformations.split('', ' ');
      expect(result).toEqual(['']);
    });
    it('should handle string with no delimiter', () => {
      const result = MappingTransformations.split('NoDelimiterHere', ' ');
      expect(result).toEqual(['NoDelimiterHere']);
    });
    it('should throw BadRequestException for non-string input', () => {
      expect(() => MappingTransformations.split(123 as any)).toThrow(
        'SPLIT transformation requires a string value',
      );
    });
    it('should throw error for empty delimiter', () => {
      expect(() => MappingTransformations.split('test', '')).toThrow();
    });
  });
  describe('applyTransformation', () => {
    it('should apply NONE transformation', () => {
      const result = MappingTransformations.applyTransformation('NONE', [
        'test',
      ]);
      expect(result).toBe('test');
    });
    it('should apply CONCAT transformation', () => {
      const result = MappingTransformations.applyTransformation(
        'CONCAT',
        ['Hello', 'World'],
        { separator: ' ' },
      );
      expect(result).toBe('Hello World');
    });
    it('should apply SUM transformation', () => {
      const result = MappingTransformations.applyTransformation(
        'SUM',
        [1, 2, 3],
      );
      expect(result).toBe(6);
    });
    it('should apply SPLIT transformation', () => {
      const result = MappingTransformations.applyTransformation(
        'SPLIT',
        ['a,b,c'],
        { delimiter: ',' },
      );
      expect(result).toEqual(['a', 'b', 'c']);
    });
    it('should throw error for unknown transformation type', () => {
      expect(() =>
        MappingTransformations.applyTransformation('UNKNOWN' as any, ['test']),
      ).toThrow();
    });
  });
  describe('validateTransformation', () => {
    it('should validate NONE transformation', () => {
      const result = MappingTransformations.validateTransformation(
        'NONE',
        ['string'],
        'string',
      );
      expect(result.valid).toBe(true);
      const invalidResult = MappingTransformations.validateTransformation(
        'NONE',
        ['string'],
        'number',
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('Type mismatch');
    });
    it('should validate CONCAT transformation', () => {
      const result = MappingTransformations.validateTransformation(
        'CONCAT',
        ['string', 'string'],
        'string',
      );
      expect(result.valid).toBe(true);
      const invalidResult = MappingTransformations.validateTransformation(
        'CONCAT',
        ['string'],
        'number',
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('requires string destination type');
    });
    it('should validate SUM transformation', () => {
      const result = MappingTransformations.validateTransformation(
        'SUM',
        ['number', 'integer'],
        'number',
      );
      expect(result.valid).toBe(true);
      const invalidResult = MappingTransformations.validateTransformation(
        'SUM',
        ['string'],
        'number',
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain(
        'requires all source fields to be numeric',
      );
    });
    it('should validate SPLIT transformation', () => {
      const result = MappingTransformations.validateTransformation(
        'SPLIT',
        ['string'],
        'string[]',
      );
      expect(result.valid).toBe(true);
      const invalidResult = MappingTransformations.validateTransformation(
        'SPLIT',
        ['number'],
        'string[]',
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('requires string source type');
    });
  });
});
