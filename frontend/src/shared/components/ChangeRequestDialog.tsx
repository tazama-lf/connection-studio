import React from 'react';
import { JobRejectionDialog } from './JobRejectionDialog';

interface ChangeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (requestedChanges: string) => void;
  configName: string;
}

// Thin wrapper that reuses the shared JobRejectionDialog for consistent styling
export const ChangeRequestDialog: React.FC<ChangeRequestDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  configName,
}) => (
  <JobRejectionDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    jobName={configName}
    jobType="Data Enrichment Job"
  />
);
