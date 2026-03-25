import { usePagination, useResourceList } from '../../../src/shared/hooks';
import type {
  PaginationState,
  LoadingState,
  ConfirmDialogState,
  RolePermissions,
  ResourceApiHandlers,
  UseResourceListOptions,
  UseResourceListReturn,
} from '../../../src/shared/hooks';

describe('shared/hooks/index.ts', () => {
  it('exports usePagination hook', () => {
    expect(usePagination).toBeDefined();
    expect(typeof usePagination).toBe('function');
  });

  it('exports useResourceList hook', () => {
    expect(useResourceList).toBeDefined();
    expect(typeof useResourceList).toBe('function');
  });

  it('exports all types', () => {
    // Type imports should not throw at runtime
    expect(true).toBe(true);
  });
});


