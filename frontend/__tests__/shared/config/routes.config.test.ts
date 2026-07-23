import { NAVIGATION, ROUTES } from '../../../src/shared/config/routes.config';

describe('routes.config', () => {
  it('contains expected route paths', () => {
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.DEMS).toBe('/dems');
    expect(ROUTES.DATA_ENRICHMENT).toBe('data-enrichment');
    expect(ROUTES.CRON).toBe('/cron');
    expect(ROUTES.PUBLISHER).toBe('/publisher');
  });

  it('defines unique main navigation module ids', () => {
    const ids = NAVIGATION.mainModules.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps navigation module paths to known routes', () => {
    const knownRoutes = new Set(Object.values(ROUTES));

    NAVIGATION.mainModules.forEach((module) => {
      expect(knownRoutes.has(module.path)).toBe(true);
    });
  });
});
