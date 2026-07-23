jest.mock('../../src/shared/components', () => ({
  __esModule: true,
  Button: () => null,
}));

jest.mock('../../src/shared/config', () => ({
  __esModule: true,
  API_BASE_URL: 'http://localhost',
}));

jest.mock('../../src/shared/constants', () => ({
  __esModule: true,
  APP_NAME: 'test-app',
}));

jest.mock('../../src/shared/services', () => ({
  __esModule: true,
  flowableApi: {},
}));

jest.mock('../../src/shared/hooks', () => ({
  __esModule: true,
  usePagination: () => ({}),
}));

describe('shared/index.ts', () => {
  it('re-exports shared module surfaces', async () => {
    const mod = await import('../../src/shared');

    expect(mod.Button).toBeDefined();
    expect(mod.API_BASE_URL).toBeDefined();
    expect(mod.APP_NAME).toBeDefined();
    expect(mod.flowableApi).toBeDefined();
    expect(mod.usePagination).toBeDefined();
  });
});
