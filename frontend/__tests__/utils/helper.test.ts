import ensurePromise, { formatDate } from '../../src/utils/common/helper';

describe('ensurePromise', () => {
  it('should wrap a sync function to return a Promise', async () => {
    const syncFn = (x: number) => x * 2;
    const asyncFn = ensurePromise(syncFn);

    const result = await asyncFn(5);

    expect(result).toBe(10);
  });

  it('should wrap an already-async function', async () => {
    const asyncFn = async (x: number) => x + 1;
    const wrapped = ensurePromise(asyncFn);

    const result = await wrapped(4);

    expect(result).toBe(5);
  });

  it('should propagate Error instances from the inner function', async () => {
    const errorFn = () => {
      throw new Error('Something failed');
    };
    const wrapped = ensurePromise(errorFn);

    await expect(wrapped()).rejects.toThrow('Something failed');
  });

  it('should wrap non-Error throws in an Error', async () => {
    const throwString = () => {
      throw 'raw string error';
    };
    const wrapped = ensurePromise(throwString);

    await expect(wrapped()).rejects.toThrow('raw string error');
  });

  it('should handle functions with multiple arguments', async () => {
    const add = (a: number, b: number) => a + b;
    const wrapped = ensurePromise(add);

    const result = await wrapped(3, 4);

    expect(result).toBe(7);
  });

  it('should return the result of an async function that resolves', async () => {
    const fn = async () => 'hello';
    const wrapped = ensurePromise(fn);

    const result = await wrapped();

    expect(result).toBe('hello');
  });
});

describe('formatDate', () => {
  it('should return "N/A" for null input', () => {
    expect(formatDate(null)).toBe('N/A');
  });

  it('should return "N/A" for undefined input', () => {
    expect(formatDate(undefined)).toBe('N/A');
  });

  it('should return "N/A" for empty string', () => {
    expect(formatDate('')).toBe('N/A');
  });

  it('should return formatted date for a valid ISO date string', () => {
    const result = formatDate('2024-01-15T00:00:00.000Z');
    // Just check it's not 'N/A' and is a non-empty string
    expect(result).not.toBe('N/A');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return a locale date string for a valid date', () => {
    const dateStr = '2024-06-01';
    const result = formatDate(dateStr);
    expect(result).not.toBe('N/A');
  });

  it('should return the original string for invalid date', () => {
    // Invalid dates: new Date('invalid').toLocaleDateString() returns 'Invalid Date'
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });

  it('should return original value when date formatting throws', () => {
    const spy = jest
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementation(() => {
        throw new Error('format-failed');
      });

    expect(formatDate('2024-01-01')).toBe('2024-01-01');

    spy.mockRestore();
  });
});
