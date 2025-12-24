import { useState, useCallback } from 'react';

export const useDataEnrichmentModals = () => {
  const [jobFormModalOpen, setJobFormModalOpen] = useState(false);
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [jobEditModalOpen, setJobEditModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);

  const openJobFormModal = useCallback(() => {
    setJobFormModalOpen(true);
  }, []);
  const closeJobFormModal = useCallback(() => {
    setJobFormModalOpen(false);
  }, []);

  const openJobDetailsModal = useCallback(() => {
    setJobDetailsModalOpen(true);
  }, []);
  const closeJobDetailsModal = useCallback(() => {
    setJobDetailsModalOpen(false);
  }, []);

  const openJobEditModal = useCallback(() => {
    setJobEditModalOpen(true);
  }, []);
  const closeJobEditModal = useCallback(() => {
    setJobEditModalOpen(false);
  }, []);

  const openCloneModal = useCallback(() => {
    setCloneModalOpen(true);
  }, []);
  const closeCloneModal = useCallback(() => {
    setCloneModalOpen(false);
  }, []);

  return {
    jobFormModalOpen,
    jobDetailsModalOpen,
    jobEditModalOpen,
    cloneModalOpen,
    openJobFormModal,
    closeJobFormModal,
    openJobDetailsModal,
    closeJobDetailsModal,
    openJobEditModal,
    closeJobEditModal,
    openCloneModal,
    closeCloneModal,
    setJobFormModalOpen,
    setJobDetailsModalOpen,
    setJobEditModalOpen,
    setCloneModalOpen,
  };
};
