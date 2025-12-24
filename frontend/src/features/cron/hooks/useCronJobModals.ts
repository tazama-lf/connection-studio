import { useState, useCallback } from 'react';

export const useCronJobModals = () => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const openViewModal = useCallback(() => {
    setViewModalOpen(true);
  }, []);
  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
  }, []);

  const openEditModal = useCallback(() => {
    setEditModalOpen(true);
  }, []);
  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
  }, []);

  const openRejectionDialog = useCallback(() => {
    setShowRejectionDialog(true);
  }, []);
  const closeRejectionDialog = useCallback(() => {
    setShowRejectionDialog(false);
  }, []);

  return {
    viewModalOpen,
    editModalOpen,
    showRejectionDialog,
    openViewModal,
    closeViewModal,
    openEditModal,
    closeEditModal,
    openRejectionDialog,
    closeRejectionDialog,
    setViewModalOpen,
    setEditModalOpen,
    setShowRejectionDialog,
  };
};
