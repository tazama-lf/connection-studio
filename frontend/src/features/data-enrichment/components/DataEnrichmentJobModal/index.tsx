import React from 'react';
import { DataEnrichmentJobForm } from '../DataEnrichmentJobForm';
import type { DataEnrichmentJobModalProps } from '../../types';

export const DataEnrichmentJobModal: React.FC<DataEnrichmentJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
}) => {
  if (!isOpen) return null;

  const handleJobCreated = () => {
    onJobCreated?.();
    onClose?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  // The DataEnrichmentJobForm renders its own modal (DataEnrichmentFormModal)
  // This component just orchestrates the callbacks
  return (
    <DataEnrichmentJobForm
      onJobCreated={handleJobCreated}
      onCancel={handleCancel}
    />
  );
};

export default DataEnrichmentJobModal;
