describe('shared/types/backend.types.ts', () => {
  it('module loads', async () => {
    await expect(import('@/shared/types/backend.types')).resolves.toBeDefined();
  });
});
