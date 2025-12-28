import React, { useState } from 'react';
import { DataEnrichmentFormModal } from '../DataEnrichmentFormModal';
import type { DataEnrichmentJobFormProps } from '../../types';
import { useToast } from '../../../../shared/providers/ToastProvider';

export const DataEnrichmentJobForm: React.FC<DataEnrichmentJobFormProps> = ({
  onJobCreated,
  onCancel,
  editFormData,
}) => {
  const { showSuccess } = useToast();
  const [isFormOpen] = useState(true);

  const handleSave = () => {
    onJobCreated?.();
    showSuccess('Job created successfully!');
  };

  const handleClose = () => {
    onCancel?.();
  };

  
  
  return (
    <DataEnrichmentFormModal
      isOpen={isFormOpen}
      onClose={handleClose}
      onSave={handleSave}
      editMode={!!editFormData}
      jobId={editFormData?.id}
      jobType={editFormData?.type as 'pull' | 'push'}
    />
  );
};

export default DataEnrichmentJobForm;
