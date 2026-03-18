import { AppProviders } from '../../../src/shared/providers';

describe('shared/providers/index.ts', () => {
  it('exports AppProviders component', () => {
    expect(AppProviders).toBeDefined();
    expect(typeof AppProviders).toBe('function');
  });
});


