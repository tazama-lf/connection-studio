import { getConnectionType, formatJSON } from '@/features/data-enrichment/utils/index';

describe('features/data-enrichment/utils/index.ts', () => {
  it('module loads', async () => {
    await expect(import('@/features/data-enrichment/utils/index')).resolves.toBeDefined();
  });

  describe('getConnectionType', () => {
    it('returns source_type when source_type is provided (truthy branch)', () => {
      const job = { source_type: 'HTTP', connection: {} } as any;
      expect(getConnectionType(job)).toBe('HTTP');
    });

    it('returns null when source_type missing and connection has no host or url', () => {
      const job = { connection: { customKey: 'val' } } as any;
      expect(getConnectionType(job)).toBeNull();
    });

    it('returns SFTP when connection is object with host', () => {
      const job = { connection: { host: 'sftp.example.com' } } as any;
      expect(getConnectionType(job)).toBe('SFTP');
    });

    it('returns HTTP when connection is object with url', () => {
      const job = { connection: { url: 'https://example.com' } } as any;
      expect(getConnectionType(job)).toBe('HTTP');
    });

    it('returns null when connection is absent', () => {
      const job = {} as any;
      expect(getConnectionType(job)).toBeNull();
    });
  });

  describe('formatJSON', () => {
    it('formats valid JSON string', () => {
      expect(formatJSON('{"a":1}')).toBe('{\n  "a": 1\n}');
    });

    it('formats non-string object', () => {
      expect(formatJSON({ a: 1 })).toBe('{\n  "a": 1\n}');
    });

    it('returns original string when JSON.parse fails (invalid JSON string)', () => {
      // JSON.parse fails: typeof obj === 'string' → returns obj
      expect(formatJSON('invalid json {')).toBe('invalid json {');
    });

    it('returns JSON.stringify result when JSON.stringify throws on non-string (circular)', () => {
      // Force catch block with typeof obj !== 'string' → JSON.stringify(obj)
      // A circular reference makes JSON.stringify throw inside the try block
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      // JSON.stringify(circular) throws in try, then catch runs: typeof circular !== 'string' → JSON.stringify(circular)
      // But JSON.stringify(circular) also throws in catch! So expect throw.
      expect(() => formatJSON(circular)).toThrow();
    });
  });
});


