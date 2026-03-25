import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import { useDataEnrichmentModals } from '../../../../src/features/data-enrichment/hooks/useDataEnrichmentModals';

describe('features/data-enrichment/hooks/useDataEnrichmentModals.ts', () => {
  it('opens and closes all modal flags', () => {
    const { result } = renderHook(() => useDataEnrichmentModals());

    expect(result.current.createModalOpen).toBe(false);
    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.editModalOpen).toBe(false);
    expect(result.current.cloneModalOpen).toBe(false);
    expect(result.current.showRejectionDialog).toBe(false);
    expect(result.current.showDeleteDialog).toBe(false);

    act(() => {
      result.current.openCreateModal();
      result.current.openViewModal();
      result.current.openEditModal();
      result.current.openCloneModal();
      result.current.openRejectionDialog();
      result.current.openDeleteDialog();
    });

    expect(result.current.createModalOpen).toBe(true);
    expect(result.current.viewModalOpen).toBe(true);
    expect(result.current.editModalOpen).toBe(true);
    expect(result.current.cloneModalOpen).toBe(true);
    expect(result.current.showRejectionDialog).toBe(true);
    expect(result.current.showDeleteDialog).toBe(true);

    act(() => {
      result.current.closeCreateModal();
      result.current.closeViewModal();
      result.current.closeEditModal();
      result.current.closeCloneModal();
      result.current.closeRejectionDialog();
      result.current.closeDeleteDialog();
    });

    expect(result.current.createModalOpen).toBe(false);
    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.editModalOpen).toBe(false);
    expect(result.current.cloneModalOpen).toBe(false);
    expect(result.current.showRejectionDialog).toBe(false);
    expect(result.current.showDeleteDialog).toBe(false);
  });
});

