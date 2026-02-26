import React from 'react';
import { JobRejectionDialog } from './JobRejectionDialog';

interface RejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  configName: string;
}

// Reuse shared JobRejectionDialog for consistent approver UI
export const RejectionDialog: React.FC<RejectionDialogProps> = ({
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
