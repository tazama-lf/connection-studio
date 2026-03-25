describe('shared/lovs/index.ts', () => {
  it('module loads', async () => {
    await expect(import('@/shared/lovs/index')).resolves.toBeDefined();
  });
});

