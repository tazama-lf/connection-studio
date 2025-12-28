import { useState, useCallback } from 'react';

export const useDataEnrichmentModals = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const openCreateModal = useCallback(() => {
    setCreateModalOpen(true);
  }, []);
  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

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

  const openCloneModal = useCallback(() => {
    setCloneModalOpen(true);
  }, []);
  const closeCloneModal = useCallback(() => {
    setCloneModalOpen(false);
  }, []);

  const openRejectionDialog = useCallback(() => {
    setShowRejectionDialog(true);
  }, []);
  const closeRejectionDialog = useCallback(() => {
    setShowRejectionDialog(false);
  }, []);

  const openDeleteDialog = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);
  const closeDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  return {
    createModalOpen,
    viewModalOpen,
    editModalOpen,
    cloneModalOpen,
    showRejectionDialog,
    showDeleteDialog,
    openCreateModal,
    closeCreateModal,
    openViewModal,
    closeViewModal,
    openEditModal,
    closeEditModal,
    openCloneModal,
    closeCloneModal,
    openRejectionDialog,
    closeRejectionDialog,
    openDeleteDialog,
    closeDeleteDialog,
    setCreateModalOpen,
    setViewModalOpen,
    setEditModalOpen,
    setCloneModalOpen,
    setShowRejectionDialog,
    setShowDeleteDialog,
  };
};
