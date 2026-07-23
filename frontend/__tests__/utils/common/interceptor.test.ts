describe('utils/common/interceptor.ts', () => {
  it('module loads', async () => {
    await expect(import('@/utils/common/interceptor')).resolves.toBeDefined();
  });
});
