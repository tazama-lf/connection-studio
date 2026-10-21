import {
  RequireClaims,
  RequireAnyClaims,
  Public,
  RequireClaim,
  RequireEditorRole,
  RequireApproverRole,
  RequireExporterRole,
  RequirePublisherRole,
  RequireAccountManagement,
  TazamaClaims,
} from '../../src/auth/auth.decorator';

describe('auth.decorator', () => {
  it('exposes callable decorator factories that produce metadata decorators', () => {
    expect(typeof RequireClaims('editor')).toBe('function');
    expect(typeof RequireAnyClaims('editor', 'approver')).toBe('function');
    expect(typeof Public()).toBe('function');
    expect(typeof RequireClaim(TazamaClaims.EDITOR)).toBe('function');
    expect(typeof RequireEditorRole()).toBe('function');
    expect(typeof RequireApproverRole()).toBe('function');
    expect(typeof RequireExporterRole()).toBe('function');
    expect(typeof RequirePublisherRole()).toBe('function');
    expect(typeof RequireAccountManagement()).toBe('function');
  });
});
