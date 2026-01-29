import { renderHook, act } from '@testing-library/react';
import { useCronJobModals } from '../../../../features/cron/hooks/useCronJobModals';

describe('useCronJobModals', () => {
  it('should initialize with all modals closed', () => {
    const { result } = renderHook(() => useCronJobModals());

    expect(result.current.viewModalOpen).toBe(false);
    expect(result.current.editModalOpen).toBe(false);
    expect(result.current.showRejectionDialog).toBe(false);
  });

  describe('View Modal', () => {
    it('should open view modal', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openViewModal();
      });

      expect(result.current.viewModalOpen).toBe(true);
    });

    it('should close view modal', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openViewModal();
      });

      expect(result.current.viewModalOpen).toBe(true);

      act(() => {
        result.current.closeViewModal();
      });

      expect(result.current.viewModalOpen).toBe(false);
    });

    it('should set view modal state directly', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.setViewModalOpen(true);
      });

      expect(result.current.viewModalOpen).toBe(true);

      act(() => {
        result.current.setViewModalOpen(false);
      });

      expect(result.current.viewModalOpen).toBe(false);
    });
  });

  describe('Edit Modal', () => {
    it('should open edit modal', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openEditModal();
      });

      expect(result.current.editModalOpen).toBe(true);
    });

    it('should close edit modal', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openEditModal();
      });

      expect(result.current.editModalOpen).toBe(true);

      act(() => {
        result.current.closeEditModal();
      });

      expect(result.current.editModalOpen).toBe(false);
    });

    it('should set edit modal state directly', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.setEditModalOpen(true);
      });

      expect(result.current.editModalOpen).toBe(true);

      act(() => {
        result.current.setEditModalOpen(false);
      });

      expect(result.current.editModalOpen).toBe(false);
    });
  });

  describe('Rejection Dialog', () => {
    it('should open rejection dialog', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openRejectionDialog();
      });

      expect(result.current.showRejectionDialog).toBe(true);
    });

    it('should close rejection dialog', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openRejectionDialog();
      });

      expect(result.current.showRejectionDialog).toBe(true);

      act(() => {
        result.current.closeRejectionDialog();
      });

      expect(result.current.showRejectionDialog).toBe(false);
    });

    it('should set rejection dialog state directly', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.setShowRejectionDialog(true);
      });

      expect(result.current.showRejectionDialog).toBe(true);

      act(() => {
        result.current.setShowRejectionDialog(false);
      });

      expect(result.current.showRejectionDialog).toBe(false);
    });
  });

  describe('Multiple Modals', () => {
    it('should handle multiple modals being open simultaneously', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openViewModal();
        result.current.openEditModal();
        result.current.openRejectionDialog();
      });

      expect(result.current.viewModalOpen).toBe(true);
      expect(result.current.editModalOpen).toBe(true);
      expect(result.current.showRejectionDialog).toBe(true);
    });

    it('should close all modals independently', () => {
      const { result } = renderHook(() => useCronJobModals());

      act(() => {
        result.current.openViewModal();
        result.current.openEditModal();
        result.current.openRejectionDialog();
      });

      act(() => {
        result.current.closeViewModal();
      });

      expect(result.current.viewModalOpen).toBe(false);
      expect(result.current.editModalOpen).toBe(true);
      expect(result.current.showRejectionDialog).toBe(true);

      act(() => {
        result.current.closeEditModal();
      });

      expect(result.current.viewModalOpen).toBe(false);
      expect(result.current.editModalOpen).toBe(false);
      expect(result.current.showRejectionDialog).toBe(true);

      act(() => {
        result.current.closeRejectionDialog();
      });

      expect(result.current.viewModalOpen).toBe(false);
      expect(result.current.editModalOpen).toBe(false);
      expect(result.current.showRejectionDialog).toBe(false);
    });
  });

  describe('Callback Stability', () => {
    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useCronJobModals());

      const firstCallbacks = {
        openViewModal: result.current.openViewModal,
        closeViewModal: result.current.closeViewModal,
        openEditModal: result.current.openEditModal,
        closeEditModal: result.current.closeEditModal,
        openRejectionDialog: result.current.openRejectionDialog,
        closeRejectionDialog: result.current.closeRejectionDialog,
      };

      rerender();

      expect(result.current.openViewModal).toBe(firstCallbacks.openViewModal);
      expect(result.current.closeViewModal).toBe(firstCallbacks.closeViewModal);
      expect(result.current.openEditModal).toBe(firstCallbacks.openEditModal);
      expect(result.current.closeEditModal).toBe(firstCallbacks.closeEditModal);
      expect(result.current.openRejectionDialog).toBe(firstCallbacks.openRejectionDialog);
      expect(result.current.closeRejectionDialog).toBe(firstCallbacks.closeRejectionDialog);
    });
  });
});
