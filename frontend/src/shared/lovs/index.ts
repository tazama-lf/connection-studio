export const getDemsStatusLov = {
  editor: [
    { label: 'In Progress', value: 'STATUS_01_IN_PROGRESS' },
    { label: 'On Hold', value: 'STATUS_02_ON_HOLD' },
    { label: 'Under Review', value: 'STATUS_03_UNDER_REVIEW' },
    { label: 'Approved', value: 'STATUS_04_APPROVED' },
    { label: 'Rejected', value: 'STATUS_05_REJECTED' },
    { label: 'Exported', value: 'STATUS_06_EXPORTED' },
    { label: 'Ready for Deployment', value: 'STATUS_07_READY_FOR_DEPLOYMENT' },
    { label: 'Deployed', value: 'STATUS_08_DEPLOYED' },
  ],
  approver: [
    { label: 'On Hold', value: 'STATUS_02_ON_HOLD' },
    { label: 'Under Review', value: 'STATUS_03_UNDER_REVIEW' },
    { label: 'Approved', value: 'STATUS_04_APPROVED' },
    { label: 'Exported', value: 'STATUS_06_EXPORTED' },
    { label: 'Ready for Deployment', value: 'STATUS_07_READY_FOR_DEPLOYMENT' },
    { label: 'Deployed', value: 'STATUS_08_DEPLOYED' },
  ],
  exporter: [
    { label: 'Approved', value: 'STATUS_04_APPROVED' },
    { label: 'Exported', value: 'STATUS_06_EXPORTED' },
    { label: 'Deployed', value: 'STATUS_08_DEPLOYED' },
  ],
  publisher: [
    { label: 'Exported', value: 'STATUS_06_EXPORTED' },
    { label: 'Deployed', value: 'STATUS_08_DEPLOYED' },
  ],
};
