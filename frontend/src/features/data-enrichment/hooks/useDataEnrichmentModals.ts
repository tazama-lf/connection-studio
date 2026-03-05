import { useState, useCallback } from 'react';

export const useDataEnrichmentModals = (): {
  createModalOpen: boolean;
  viewModalOpen: boolean;
  editModalOpen: boolean;
  cloneModalOpen: boolean;
  showRejectionDialog: boolean;
  showDeleteDialog: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openViewModal: () => void;
  closeViewModal: () => void;
  openEditModal: () => void;
  closeEditModal: () => void;
  openCloneModal: () => void;
  closeCloneModal: () => void;
  openRejectionDialog: () => void;
  closeRejectionDialog: () => void;
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setCreateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setViewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCloneModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRejectionDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
} => {
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
