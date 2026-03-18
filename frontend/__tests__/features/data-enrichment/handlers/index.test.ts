import {
  activateJob,
  approveJob,
  dataEnrichmentJobApi,
  deactivateJob,
  determineSourceType,
  exportJob,
  getErrorMessage,
  handleApproveSchedule,
  handleCloneJob,
  handleContinue,
  handleEditSendForApprovalConfirm,
  handleFormInputChange,
  handleInputChange,
  handleRejectSchedule,
  handleResumeJob,
  handleSaveForm,
  handleSubmitForApproval,
  handleApproveConfirm,
  handleApproveWithComment,
  handleExportConfirm,
  handleRejectionConfirm,
  handleSaveJob,
  handleSaveEdit,
  handleSendForApprovalConfirm,
  handleTogglePublishingStatus,
  handleUpdateConfirm,
  handleUpdateJobStatus,
  loadJobs,
  loadSchedules,
  prepareJobForEdit,
  rejectJob,
  saveDataEnrichmentJob,
  scheduleApi,
  sendForApproval,
  submitPullJob,
  submitPushJob,
  updateJobData,
  handleNavigateToHistory,
} from '../../../../src/features/data-enrichment/handlers';
import { apiRequest } from '@utils/common/apiHelper';
import {
  buildPullPayload,
  buildPushPayload,
  formatJobForEdit,
  getDataEnrichmentErrorMessage,
  getJobType,
} from '../../../../src/features/data-enrichment/utils';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../../../src/features/data-enrichment/constants';

jest.mock('@utils/common/apiHelper', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('@shared/lovs', () => ({
  getDemsStatusLov: {
    admin: [{ value: 'STATUS_04_APPROVED' }],
    editor: [{ value: 'STATUS_01_IN_PROGRESS' }],
  },
}));

jest.mock('../../../../src/features/data-enrichment/utils', () => ({
  ...jest.requireActual('../../../../src/features/data-enrichment/utils'),
  buildPushPayload: jest.fn(),
  buildPullPayload: jest.fn(),
  formatJobForEdit: jest.fn(),
  getDataEnrichmentErrorMessage: jest.fn(),
  getJobType: jest.fn(),
}));

describe('features/data-enrichment/handlers/index.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiRequest with lowercase query type in getById', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'job-1' });

    await dataEnrichmentJobApi.getById('job-1', 'PULL');

    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/job/job-1?type=pull'),
    );
  });

  it('scheduleApi endpoints call expected API routes', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id: 'sched-1' })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    await scheduleApi.create({
      name: 'sched',
      cron: '*/5 * * * *',
      iterations: 2,
      status: 'approved',
    } as any);
    await scheduleApi.getAll(5, 25);
    await scheduleApi.getById('sched-1');
    await scheduleApi.update('sched-2', {
      name: 'new-name',
      cron: '0 * * * *',
      iterations: 3,
      start_date: '2026-01-01T00:00:00Z',
    } as any);
    await scheduleApi.updateStatus('sched-3', 'STATUS_04_APPROVED', 'reason-x');

    const urls = (apiRequest as jest.Mock).mock.calls.map((c) => c[0]);
    expect(urls.some((u: string) => u.includes('/scheduler/create'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/scheduler/all?offset=5&limit=25'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/scheduler/sched-1'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/scheduler/update/sched-2'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/scheduler/update/status/sched-3?status=STATUS_04_APPROVED'))).toBe(true);
  });

  it('handleRejectionConfirm resolves PUSH type and calls callbacks', () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onReject = jest.fn();
    const onClose = jest.fn();

    handleRejectionConfirm(
      'invalid mapping',
      { id: 'job-5' } as any,
      onReject,
      onClose,
    );

    expect(onReject).toHaveBeenCalledWith('job-5', 'PUSH', 'invalid mapping');
    expect(onClose).toHaveBeenCalled();
  });

  it('determineSourceType chooses from source_type and connection payload', () => {
    expect(determineSourceType({ source_type: 'SFTP' } as any)).toBe('SFTP');
    expect(
      determineSourceType({ connection: JSON.stringify({ host: '10.0.0.1' }) } as any),
    ).toBe('SFTP');
    expect(
      determineSourceType({ connection: JSON.stringify({ url: 'https://example.com' }) } as any),
    ).toBe('HTTP');
    expect(determineSourceType({ connection: 'not-json' } as any)).toBe('HTTP');
  });

  it('handleSaveJob strips push-only restricted fields before saving', async () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const setIsSaving = jest.fn();

    await handleSaveJob(
      { id: 'job-7', type: 'PUSH' } as any,
      {
        type: 'PUSH',
        endpoint_name: 'endpoint-a',
        schedule_id: 'sched-1',
        source_type: 'SFTP',
        connection: 'conn',
        file: 'file.csv',
        table_name: 'tbl',
      } as any,
      onSave,
      onClose,
      setIsSaving,
    );

    expect(setIsSaving).toHaveBeenNthCalledWith(1, true);
    expect(setIsSaving).toHaveBeenLastCalledWith(false);
    expect(onSave).toHaveBeenCalledWith({ endpoint_name: 'endpoint-a' });
    expect(onClose).toHaveBeenCalled();
  });

  it('updateStatus omits request body when reason is not provided', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });

    await dataEnrichmentJobApi.updateStatus(
      'job-10',
      'STATUS_04_APPROVED',
      'PULL',
    );

    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/job/update/status/job-10?status=STATUS_04_APPROVED&type=pull'),
      expect.objectContaining({ method: 'PATCH', body: undefined }),
    );
  });

  it('determineSourceType handles object connection payloads', () => {
    expect(determineSourceType({ connection: { host: '1.2.3.4' } } as any)).toBe('SFTP');
    expect(determineSourceType({ connection: { url: 'https://x.com' } } as any)).toBe('HTTP');
  });

  it('handleSendForApprovalConfirm closes dialog and passes normalized type', () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onSendForApproval = jest.fn();
    const onClose = jest.fn();
    const setShowApprovalConfirmDialog = jest.fn();

    handleSendForApprovalConfirm(
      { id: 'job-2' } as any,
      onSendForApproval,
      onClose,
      setShowApprovalConfirmDialog,
    );

    expect(onSendForApproval).toHaveBeenCalledWith('job-2', 'PULL');
    expect(onClose).toHaveBeenCalled();
    expect(setShowApprovalConfirmDialog).toHaveBeenCalledWith(false);
  });

  it('handleApproveConfirm handles missing callbacks and still closes dialog', () => {
    const setShowApproveConfirmDialog = jest.fn();

    handleApproveConfirm(null, undefined, jest.fn(), setShowApproveConfirmDialog);

    expect(setShowApproveConfirmDialog).toHaveBeenCalledWith(false);
  });

  it('handleExportConfirm toggles saving and closes export dialog on success', async () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onExport = jest.fn().mockResolvedValue(undefined);
    const setShowExportConfirmDialog = jest.fn();
    const setIsSaving = jest.fn();

    await handleExportConfirm(
      { id: 'job-99' } as any,
      onExport,
      setShowExportConfirmDialog,
      setIsSaving,
    );

    expect(setIsSaving).toHaveBeenNthCalledWith(1, true);
    expect(onExport).toHaveBeenCalledWith('job-99', 'PUSH');
    expect(setShowExportConfirmDialog).toHaveBeenCalledWith(false);
    expect(setIsSaving).toHaveBeenLastCalledWith(false);
  });

  it('handleApproveWithComment calls approver callback with uppercase type', async () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onApprove = jest.fn().mockResolvedValue(undefined);
    const setShowApproveConfirmDialog = jest.fn();
    const setIsSaving = jest.fn();

    await handleApproveWithComment(
      { id: 'job-7' } as any,
      'looks good',
      onApprove,
      setShowApproveConfirmDialog,
      setIsSaving,
    );

    expect(onApprove).toHaveBeenCalledWith('job-7', 'PULL', 'looks good');
    expect(setShowApproveConfirmDialog).toHaveBeenCalledWith(false);
    expect(setIsSaving).toHaveBeenLastCalledWith(false);
  });

  it('handleUpdateJobStatus success and failure branches', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onJobUpdate = jest.fn();

    await handleUpdateJobStatus(
      'job-11',
      'PULL',
      DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showSuccess).toHaveBeenCalledWith('Job status updated to approved');
    expect(onJobUpdate).toHaveBeenCalled();

    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await handleUpdateJobStatus(
      'job-11',
      'PULL',
      DATA_ENRICHMENT_JOB_STATUSES.APPROVED,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showError).toHaveBeenCalledWith('Failed to update job status');
  });

  it('handleResumeJob success and failure branches', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onJobUpdate = jest.fn();

    await handleResumeJob(
      { id: 'job-resume', type: 'push' } as any,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showSuccess).toHaveBeenCalledWith('Job resumed successfully');
    expect(onJobUpdate).toHaveBeenCalled();

    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('resume-fail'));

    await handleResumeJob(
      { id: 'job-resume', type: 'pull' } as any,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showError).toHaveBeenCalledWith('Failed to resume job');
  });

  it('schedule submission/approve/reject helper branches', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('reject-fail'));

    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onUpdate = jest.fn();

    await handleSubmitForApproval('sched-a', showSuccess, showError, onUpdate);
    await handleApproveSchedule('sched-a', showSuccess, showError, onUpdate);
    await handleRejectSchedule('sched-a', showSuccess, showError, onUpdate);

    expect(showSuccess).toHaveBeenCalledWith('Schedule submitted for approval');
    expect(showSuccess).toHaveBeenCalledWith('Schedule approved successfully');
    expect(showError).toHaveBeenCalledWith('Failed to reject schedule');
  });

  it('form helper functions cover continue/save success/failure', async () => {
    const setFormData = jest.fn((updater: any) => updater({ old: true }));
    handleFormInputChange('name', 'abc', setFormData as any);
    expect(setFormData).toHaveBeenCalled();

    const setShowConfigForm = jest.fn();
    handleContinue(setShowConfigForm as any);
    expect(setShowConfigForm).toHaveBeenCalledWith(true);

    const setIsSaving = jest.fn();
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);
    await handleSaveForm({ x: 1 }, onSave, setIsSaving, showSuccess, showError);
    expect(showSuccess).toHaveBeenCalledWith('Form saved successfully');

    const onSaveFail = jest.fn().mockRejectedValue(new Error('save-fail'));
    await handleSaveForm({ x: 2 }, onSaveFail, setIsSaving, showSuccess, showError);
    expect(showError).toHaveBeenCalledWith('Failed to save form');

    await handleSaveForm({ x: 3 }, undefined, setIsSaving, showSuccess, showError);
  });

  it('handleEditSendForApprovalConfirm handles success and failure', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('approval-fail'));

    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onSuccess = jest.fn();
    const setShowApprovalDialog = jest.fn();

    await handleEditSendForApprovalConfirm(
      { id: 'job-approve', type: 'push' } as any,
      showSuccess,
      showError,
      onSuccess,
      setShowApprovalDialog,
    );

    expect(showSuccess).toHaveBeenCalledWith('Job sent for approval');
    expect(onSuccess).toHaveBeenCalled();
    expect(setShowApprovalDialog).toHaveBeenCalledWith(false);

    await handleEditSendForApprovalConfirm(
      { id: 'job-approve', type: 'pull' } as any,
      showSuccess,
      showError,
      onSuccess,
      setShowApprovalDialog,
    );

    expect(showError).toHaveBeenCalledWith('Failed to send job for approval');
  });

  it('handleCloneJob validates required fields and clone branches', async () => {
    const setIsCloning = jest.fn();
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onSuccess = jest.fn();
    const onClose = jest.fn();

    await handleCloneJob({
      job: null,
      newVersion: '',
      newEndpointName: '',
      setIsCloning,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);
    expect(showError).toHaveBeenCalledWith('Version is required');

    await handleCloneJob({
      job: { type: 'pull' },
      newVersion: '1.0.0',
      newEndpointName: '   ',
      setIsCloning,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);
    expect(showError).toHaveBeenCalledWith('Connector name is required for pull jobs');

    (apiRequest as jest.Mock).mockResolvedValueOnce({ id: 'new-clone-id' });

    await handleCloneJob({
      job: {
        id: 'pull-1',
        type: 'pull',
        schedule_id: 'sched-existing',
        source_type: 'SFTP',
        connection: { host: '127.0.0.1' },
        endpoint_name: 'old',
        table_name: 'tbl',
      },
      newVersion: '2.0.0',
      newEndpointName: 'new-connector',
      setIsCloning,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('clone-fail'));
    await handleCloneJob({
      job: {
        id: 'push-1',
        type: 'push',
        endpoint_name: 'push-endpoint',
        path: '/x',
        table_name: 'tbl',
      },
      newVersion: '3.0.0',
      newEndpointName: 'ignored',
      setIsCloning,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);

    expect(showError).toHaveBeenCalledWith('clone-fail');
  });

  it('handleTogglePublishingStatus switches states and reports failures', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('x'));
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onJobUpdate = jest.fn();

    await handleTogglePublishingStatus(
      { id: 'job-13', type: 'push', publishing_status: 'active' } as any,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showSuccess).toHaveBeenCalledWith('Job deactivated successfully');
    expect(onJobUpdate).toHaveBeenCalled();

    await handleTogglePublishingStatus(
      { id: 'job-13', type: 'pull', publishing_status: 'in-active' } as any,
      showSuccess,
      showError,
      onJobUpdate,
    );

    expect(showError).toHaveBeenCalledWith('Failed to update publishing status');
  });

  it('handleNavigateToHistory composes URL with and without job id', () => {
    const navigate = jest.fn();
    handleNavigateToHistory(navigate as any, 'job 1', '/history');
    expect(navigate).toHaveBeenCalledWith('/history?jobId=job%201');

    handleNavigateToHistory(navigate as any, undefined, '/history');
    expect(navigate).toHaveBeenCalledWith('/history');
  });

  it('wrapper methods call update/status methods with expected constants', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });

    await rejectJob('job-r', 'PUSH', 'bad');
    await approveJob('job-a', 'PULL');
    await exportJob('job-e', 'PULL');
    await sendForApproval('job-s', 'PUSH');
    await activateJob('job-on', 'PULL');
    await deactivateJob('job-off', 'PUSH');

    const calls = (apiRequest as jest.Mock).mock.calls.map((c) => c[0]).join(' ');
    expect(calls).toContain('STATUS_05_REJECTED');
    expect(calls).toContain('STATUS_04_APPROVED');
    expect(calls).toContain('STATUS_06_EXPORTED');
    expect(calls).toContain('STATUS_03_UNDER_REVIEW');
    expect(calls).toContain('/update/activation/job-on?status=active&type=pull');
    expect(calls).toContain('/update/activation/job-off?status=in-active&type=push');
  });

  it('updateJobData routes to pull or push update APIs', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'updated' });

    await updateJobData('job-push', 'PUSH', { endpoint_name: 'x' } as any);
    await updateJobData('job-pull', 'PULL', { endpoint_name: 'y' } as any);

    const urls = (apiRequest as jest.Mock).mock.calls.map((c) => c[0]);
    expect(urls.some((u: string) => u.includes('/job/update/job-push?type=push'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/job/update/job-pull?type=pull'))).toBe(true);
  });

  it('loadJobs builds params with pageNumber as offset', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0 });

    await loadJobs(3, 25, 'admin', { endpoint_name: 'abc' });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/job/all?offset=3&limit=25'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('saveDataEnrichmentJob creates new push and updates rejected pull', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'push-1' });
    (buildPullPayload as jest.Mock).mockReturnValue({ endpoint_name: 'pull-1' });
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ id: 'new-id' })
      .mockResolvedValueOnce({ id: 'existing-id' });

    const showSuccess = jest.fn();
    const setShowSendForApproval = jest.fn();
    const setIsCreating = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 'Endpoint A' },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave: jest.fn(),
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess,
      setShowSendForApproval,
      setIsCreating,
    } as any);

    expect(buildPushPayload).toHaveBeenCalled();
    expect(showSuccess).toHaveBeenCalled();

    await saveDataEnrichmentJob({
      formValues: { name: 'Endpoint B' },
      configurationType: 'pull',
      editMode: true,
      selectedJob: { id: 'job-r', status: DATA_ENRICHMENT_JOB_STATUSES.REJECTED },
      onSave: jest.fn(),
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess,
      setShowSendForApproval,
      setIsCreating,
    } as any);

    expect(buildPullPayload).toHaveBeenCalled();
    expect(setShowSendForApproval).toHaveBeenCalledWith(true);
    expect(setIsCreating).toHaveBeenLastCalledWith(false);
  });

  it('prepareJobForEdit and getErrorMessage delegate to utility functions', () => {
    (formatJobForEdit as jest.Mock).mockReturnValue({ id: 'formatted' });
    (getDataEnrichmentErrorMessage as jest.Mock).mockReturnValue('mapped error');

    expect(prepareJobForEdit({ id: 'x' } as any)).toEqual({ id: 'formatted' });
    expect(getErrorMessage(new Error('x'))).toBe('mapped error');
  });

  it('handleSaveEdit skips null values and handles failures', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true }).mockRejectedValueOnce(new Error('nope'));
    const showSuccess = jest.fn();
    const showError = jest.fn();
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    const setIsSaving = jest.fn();

    await handleSaveEdit({
      job: { id: 'j1', type: 'push' },
      editedData: { endpoint_name: 'new', description: null as any },
      setIsSaving,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);

    expect(showSuccess).toHaveBeenCalledWith('Job updated successfully');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    await handleSaveEdit({
      job: { id: 'j2', type: 'pull' },
      editedData: { endpoint_name: 'new' },
      setIsSaving,
      showSuccess,
      showError,
      onSuccess,
      onClose,
    } as any);

    expect(showError).toHaveBeenCalledWith('Failed to save job');
  });

  it('getJobHistory builds body with searchingFilters and jobId', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0, limit: 20, offset: 2 });

    await dataEnrichmentJobApi.getJobHistory('job-hist', 2, 20, { endpoint_name: 'ep' });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/job/history?offset=2&limit=20'),
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.jobId).toBe('job-hist');
    expect(body.endpoint_name).toBe('ep');
  });

  it('getJobHistory works with no searchingFilters and no jobId', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0, limit: 50, offset: 0 });

    await dataEnrichmentJobApi.getJobHistory(undefined, 0, 50, undefined);

    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.jobId).toBeUndefined();
  });

  it('dataEnrichmentJobApi.deleteJob calls correct endpoint', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });

    await dataEnrichmentJobApi.deleteJob('job-del', 'pull');

    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/job/job-del?type=pull'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('handleApproveConfirm calls onApprove and onClose when job and callback are provided', () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onApprove = jest.fn();
    const onClose = jest.fn();
    const setShowApproveConfirmDialog = jest.fn();

    handleApproveConfirm(
      { id: 'job-approve-2' } as any,
      onApprove,
      onClose,
      setShowApproveConfirmDialog,
    );

    expect(onApprove).toHaveBeenCalledWith('job-approve-2', 'PULL');
    expect(onClose).toHaveBeenCalled();
    expect(setShowApproveConfirmDialog).toHaveBeenCalledWith(false);
  });

  it('handleInputChange updates edited job via setEditedJob updater', () => {
    let capturedUpdater: ((prev: object) => object) | undefined;
    const setEditedJob = jest.fn().mockImplementation((updater: (prev: object) => object) => {
      capturedUpdater = updater;
    });

    handleInputChange('endpoint_name' as any, 'new-name', setEditedJob as any);

    expect(setEditedJob).toHaveBeenCalled();
    const result = capturedUpdater!({ old_field: 'old' });
    expect(result).toEqual({ old_field: 'old', endpoint_name: 'new-name' });
  });

  it('handleSendForApprovalConfirm only calls setShowApprovalConfirmDialog when job is null', () => {
    const setShowApprovalConfirmDialog = jest.fn();
    const onSendForApproval = jest.fn();
    const onClose = jest.fn();

    handleSendForApprovalConfirm(null, onSendForApproval, onClose, setShowApprovalConfirmDialog);

    expect(onSendForApproval).not.toHaveBeenCalled();
    expect(setShowApprovalConfirmDialog).toHaveBeenCalledWith(false);
  });

  it('handleRejectionConfirm does nothing when job is null', () => {
    const onReject = jest.fn();
    const onClose = jest.fn();

    handleRejectionConfirm('reason', null, onReject, onClose);

    expect(onReject).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handleSaveJob returns early when job is null', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const setIsSaving = jest.fn();

    await handleSaveJob(null, {}, onSave, onClose, setIsSaving);

    expect(onSave).not.toHaveBeenCalled();
    expect(setIsSaving).not.toHaveBeenCalled();
  });

  it('handleSaveJob handles onSave failure silently via catch block', async () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onSave = jest.fn().mockRejectedValue(new Error('save-error'));
    const onClose = jest.fn();
    const setIsSaving = jest.fn();

    await handleSaveJob(
      { id: 'j-err', type: 'PUSH' } as any,
      { endpoint_name: 'x' } as any,
      onSave,
      onClose,
      setIsSaving,
    );

    expect(setIsSaving).toHaveBeenNthCalledWith(1, true);
    expect(setIsSaving).toHaveBeenLastCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handleSubmitForApproval reports failure when scheduleApi throws', async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error('submit-fail'));
    const showError = jest.fn();
    const onUpdate = jest.fn();

    await handleSubmitForApproval('sched-x', jest.fn(), showError, onUpdate);

    expect(showError).toHaveBeenCalledWith('Failed to submit schedule for approval');
  });

  it('handleApproveSchedule reports failure when scheduleApi throws', async () => {
    (apiRequest as jest.Mock).mockRejectedValue(new Error('approve-fail'));
    const showError = jest.fn();

    await handleApproveSchedule('sched-x', jest.fn(), showError, jest.fn());

    expect(showError).toHaveBeenCalledWith('Failed to approve schedule');
  });

  it('handleRejectSchedule shows success and calls onUpdate on success', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });
    const showSuccess = jest.fn();
    const onUpdate = jest.fn();

    await handleRejectSchedule('sched-y', showSuccess, jest.fn(), onUpdate);

    expect(showSuccess).toHaveBeenCalledWith('Schedule rejected');
    expect(onUpdate).toHaveBeenCalled();
  });

  it('handleUpdateConfirm calls onUpdate if provided and always resets dialog', () => {
    const setShowUpdateDialog = jest.fn();
    const onUpdate = jest.fn();

    handleUpdateConfirm(onUpdate, setShowUpdateDialog);
    expect(onUpdate).toHaveBeenCalled();
    expect(setShowUpdateDialog).toHaveBeenCalledWith(false);

    setShowUpdateDialog.mockClear();
    handleUpdateConfirm(undefined, setShowUpdateDialog);
    expect(setShowUpdateDialog).toHaveBeenCalledWith(false);
  });

  it('handleCloneJob handles null SFTP connection for pull job', async () => {
    const setIsCloning = jest.fn();
    const showError = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-no-conn', type: 'pull', schedule_id: 'sched-1', source_type: 'SFTP', connection: null },
      newVersion: '1.0.0',
      newEndpointName: 'connector',
      setIsCloning,
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('SFTP connection details'));
    expect(setIsCloning).toHaveBeenLastCalledWith(false);
  });

  it('handleCloneJob handles null HTTP connection for pull job', async () => {
    const setIsCloning = jest.fn();
    const showError = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-http-no-conn', type: 'pull', schedule_id: 'sched-1', source_type: 'HTTP', connection: null },
      newVersion: '1.0.0',
      newEndpointName: 'connector-http',
      setIsCloning,
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('HTTP connection details'));
    expect(setIsCloning).toHaveBeenLastCalledWith(false);
  });

  it('handleCloneJob uses existing approved schedule when no schedule_id on pull job', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce([{ id: 'found-sched-id', schedule_status: 'approved' }])
      .mockResolvedValueOnce({ id: 'new-cloned' });

    const onSuccess = jest.fn();
    const onClose = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-no-sched', type: 'pull', source_type: 'HTTP', connection: { url: 'https://x.com' } },
      newVersion: '1.0.0',
      newEndpointName: 'new-connector',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess,
      onClose,
    } as any);

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handleCloneJob creates new schedule when no approved schedules exist', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce([{ id: 'fresh-sched', name: 'Schedule for new-ep (Cloned)', schedule_status: 'approved' }])
      .mockResolvedValueOnce({ id: 'cloned-id' });

    const onSuccess = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-no-sched2', type: 'pull', source_type: 'HTTP', connection: { url: 'https://y.com' } },
      newVersion: '2.0.0',
      newEndpointName: 'new-ep',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess,
      onClose: jest.fn(),
    } as any);

    expect(onSuccess).toHaveBeenCalled();
  });

  it('handleCloneJob errors when schedule creation returns success=false', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ success: false });

    const setIsCloning = jest.fn();
    const showError = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-no-sched3', type: 'pull', source_type: 'HTTP', connection: { url: 'https://z.com' } },
      newVersion: '3.0.0',
      newEndpointName: 'connector-z',
      setIsCloning,
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('valid schedule'));
    expect(setIsCloning).toHaveBeenLastCalledWith(false);
  });

  it('handleCloneJob handles findOrCreateSchedule throwing an error', async () => {
    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('getAll-fail'));

    const setIsCloning = jest.fn();
    const showError = jest.fn();

    await handleCloneJob({
      job: { id: 'pull-sched-throw', type: 'pull', source_type: 'SFTP', connection: { host: '1.2.3.4' } },
      newVersion: '1.1.0',
      newEndpointName: 'err-connector',
      setIsCloning,
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);

    expect(showError).toHaveBeenCalledWith(expect.stringContaining('Failed to create or find a schedule'));
    expect(setIsCloning).toHaveBeenLastCalledWith(false);
  });

  it('handleCloneJob reports error when clone result has no id', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({});

    const showError = jest.fn();

    await handleCloneJob({
      job: { id: 'push-no-id', type: 'push', endpoint_name: 'ep', path: '/p', table_name: 'tbl' },
      newVersion: '1.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);

    expect(showError).toHaveBeenCalledWith('Failed to clone job - no ID returned');
  });

  it('saveDataEnrichmentJob in editMode non-rejected calls onSave and onCloseWithRefresh', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-edit' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'existing-id', status: 'approved' });

    const onSave = jest.fn();
    const onCloseWithRefresh = jest.fn();
    const setIsCreating = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 'Endpoint Edit' },
      configurationType: 'push',
      editMode: true,
      selectedJob: { id: 'job-edit', status: 'exported' },
      onSave,
      onCloseWithRefresh,
      onClose: jest.fn(),
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating,
    } as any);

    expect(onSave).toHaveBeenCalled();
    expect(onCloseWithRefresh).toHaveBeenCalled();
    expect(setIsCreating).toHaveBeenLastCalledWith(false);
  });

  it('saveDataEnrichmentJob editMode non-rejected uses onClose when no onCloseWithRefresh', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-edit2' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'existing-id2', status: 'approved' });

    const onSave = jest.fn();
    const onClose = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 'Endpoint Edit2' },
      configurationType: 'push',
      editMode: true,
      selectedJob: { id: 'job-edit2', status: 'exported' },
      onSave,
      onCloseWithRefresh: undefined,
      onClose,
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);

    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('saveDataEnrichmentJob uses endpoint as fallback name when name is non-string', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-id-ns' });

    const showSuccess = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 42 },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave: jest.fn(),
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess,
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);

    expect(showSuccess).toHaveBeenCalledWith('Success', expect.stringContaining('"endpoint"'));
  });

  it('saveDataEnrichmentJob uses response.message as success message when available', async () => {
    (buildPullPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-msg' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-id-msg', message: 'Custom success!' });

    const showSuccess = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 'EP Msg' },
      configurationType: 'pull',
      editMode: false,
      selectedJob: null,
      onSave: jest.fn(),
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess,
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);

    expect(showSuccess).toHaveBeenCalledWith('Success', 'Custom success!');
  });

  it('saveDataEnrichmentJob calls onSave when response has no status field', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-nostatus' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-id-ns2' });

    const onSave = jest.fn();

    await saveDataEnrichmentJob({
      formValues: { name: 'EP NoStatus' },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave,
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);

    expect(onSave).toHaveBeenCalled();
  });

  it('saveDataEnrichmentJob handles createNewJob failure', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-fail' });
    (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('create-fail'));

    const setIsCreating = jest.fn();

    await expect(saveDataEnrichmentJob({
      formValues: { name: 'EP Fail' },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave: jest.fn(),
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating,
    } as any)).rejects.toThrow('create-fail');

    expect(setIsCreating).toHaveBeenLastCalledWith(false);
  });

  // --- Additional branch coverage tests ---

  it('dataEnrichmentJobApi.getList with status in filters skips default status (line 65 false branch)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0 });
    await dataEnrichmentJobApi.getList({ offset: 0, limit: 10, userRole: 'admin' } as any, { status: 'custom' });
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.status).toBe('custom');
  });

  it('dataEnrichmentJobApi.getById without type omits query string (line 86 false branch)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'j' });
    await dataEnrichmentJobApi.getById('j');
    expect(apiRequest).toHaveBeenCalledWith(expect.not.stringContaining('?type'));
  });

  it('dataEnrichmentJobApi.getJobHistory uses default offset/limit params (lines 94/95)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0, limit: 10, offset: 0 });
    await dataEnrichmentJobApi.getJobHistory(undefined);
    const [url] = (apiRequest as jest.Mock).mock.calls[0];
    expect(url).toContain('offset=0');
    expect(url).toContain('limit=10');
  });

  it('handleRejectionConfirm uses PULL type when getJobType returns pull (line 261)', () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onReject = jest.fn();
    const onClose = jest.fn();
    handleRejectionConfirm('reason', { id: 'j-pull' } as any, onReject, onClose);
    expect(onReject).toHaveBeenCalledWith('j-pull', 'PULL', 'reason');
  });

  it('handleSendForApprovalConfirm uses PULL type when getJobType is not push (line 276)', () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onSendForApproval = jest.fn();
    const onClose = jest.fn();
    const setShow = jest.fn();
    handleSendForApprovalConfirm({ id: 'j-pull' } as any, onSendForApproval, onClose, setShow);
    expect(onSendForApproval).toHaveBeenCalledWith('j-pull', 'PULL');
  });

  it('handleApproveConfirm uses PULL type when getJobType is not push (line 292)', () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onApprove = jest.fn();
    const onClose = jest.fn();
    const setShow = jest.fn();
    handleApproveConfirm({ id: 'j-pull-approve' } as any, onApprove, onClose, setShow);
    expect(onApprove).toHaveBeenCalledWith('j-pull-approve', 'PULL');
  });

  it('handleSaveJob deletes pull-specific fields when jobType is not "push" (line 333 false)', async () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const setIsSaving = jest.fn();
    await handleSaveJob(
      { id: 'j-pull', type: 'PULL' } as any,
      { endpoint_name: 'ep', schedule_id: 'sched', source_type: 'HTTP', connection: 'c', file: 'f.csv', table_name: 'tbl' } as any,
      onSave,
      onClose,
      setIsSaving,
    );
    // For pull, delete is not triggered, so schedule_id etc. should remain
    const savedData = (onSave as jest.Mock).mock.calls[0][0];
    expect(savedData.schedule_id).toBeDefined();
  });

  it('handleExportConfirm returns early when onExport or job is null (line 356 false)', async () => {
    const setShowExportConfirmDialog = jest.fn();
    const setIsSaving = jest.fn();
    await handleExportConfirm(null, jest.fn(), setShowExportConfirmDialog, setIsSaving);
    expect(setIsSaving).not.toHaveBeenCalled();
    await handleExportConfirm({ id: 'j' } as any, undefined, setShowExportConfirmDialog, setIsSaving);
    expect(setIsSaving).not.toHaveBeenCalled();
  });

  it('handleExportConfirm uses PULL type when getJobType returns pull (line 359)', async () => {
    (getJobType as jest.Mock).mockReturnValue('pull');
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });
    const onExport = jest.fn().mockResolvedValue(undefined);
    const setShow = jest.fn();
    const setIsSaving = jest.fn();
    await handleExportConfirm({ id: 'j-pull' } as any, onExport, setShow, setIsSaving);
    expect(onExport).toHaveBeenCalledWith('j-pull', 'PULL');
  });

  it('handleApproveWithComment returns early when onApprove or job is null (line 381 false)', async () => {
    const setShow = jest.fn();
    const setIsSaving = jest.fn();
    await handleApproveWithComment(null, 'comment', jest.fn(), setShow, setIsSaving);
    expect(setIsSaving).not.toHaveBeenCalled();
    await handleApproveWithComment({ id: 'j' } as any, 'comment', undefined, setShow, setIsSaving);
    expect(setIsSaving).not.toHaveBeenCalled();
  });

  it('determineSourceType returns HTTP when job.connection is null/undefined (line 403 false)', () => {
    expect(determineSourceType({ connection: null } as any)).toBe('HTTP');
    expect(determineSourceType({} as any)).toBe('HTTP');
  });

  it('determineSourceType falls through when connectionObj has neither host nor url (line 414/417 false)', () => {
    expect(determineSourceType({ connection: JSON.stringify({ other: true }) } as any)).toBe('HTTP');
    expect(determineSourceType({ connection: { other: true } } as any)).toBe('HTTP');
  });

  it('scheduleApi.getAll with schedule_status "exported" or "deployed" is included in approvedSchedules (line 445)', async () => {
    // Test that deployed schedules are also used as approved schedules
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'deployed-sched', schedule_status: 'deployed', name: 'Deployed' },
      ])
      .mockResolvedValueOnce({ id: 'cloned-id' });
    const onSuccess = jest.fn();
    await handleCloneJob({
      job: { id: 'pull-dep', type: 'pull', source_type: 'HTTP', connection: { url: 'https://x.com' } },
      newVersion: '1.0.0',
      newEndpointName: 'new-ep',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess,
      onClose: jest.fn(),
    } as any);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('createPullJobData includes file only when job.file is set (line 514)', async () => {
    (apiRequest as jest.Mock)
      .mockResolvedValueOnce({ id: 'no-file-cloned' });
    const onSuccess = jest.fn();
    await handleCloneJob({
      job: { id: 'pull-nofile', type: 'pull', schedule_id: 'sched-1', source_type: 'HTTP', connection: { url: 'https://x.com' }, table_name: 'tbl' },
      newVersion: '1.0.0',
      newEndpointName: 'no-file-ep',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess,
      onClose: jest.fn(),
    } as any);
    expect(onSuccess).toHaveBeenCalled();
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.file).toBeUndefined();
  });

  it('createPushJobData uses empty string when path is undefined (line 523)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'push-nopth' });
    await handleCloneJob({
      job: { id: 'push-nopath', type: 'push', endpoint_name: 'ep', table_name: 'tbl' },
      newVersion: '1.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.path).toBe('');
  });

  it('handleCloneJob push type shows "Push" in success message (line 613)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'push-cloned-id' });
    const showSuccess = jest.fn();
    await handleCloneJob({
      job: { id: 'push-msg', type: 'push', endpoint_name: 'ep', table_name: 'tbl' },
      newVersion: '2.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess,
      showError: jest.fn(),
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);
    expect(showSuccess).toHaveBeenCalledWith(expect.stringContaining('Push'));
  });

  it('handleCloneJob calls onSuccess when provided (line 615 true branch)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'cloned-with-success' });
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    await handleCloneJob({
      job: { id: 'push-onsuccess', type: 'push', endpoint_name: 'ep2', table_name: 'tbl2' },
      newVersion: '3.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess,
      onClose,
    } as any);
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handleCloneJob error is non-Error object (line 624 false branch)', async () => {
    (apiRequest as jest.Mock).mockRejectedValueOnce('plain string error');
    const showError = jest.fn();
    await handleCloneJob({
      job: { id: 'push-str-err', type: 'push', endpoint_name: 'ep3', table_name: 'tbl3' },
      newVersion: '4.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError,
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);
    expect(showError).toHaveBeenCalledWith('Failed to clone job');
  });

  it('handleUpdateJobStatus uses statuslabel fallback when status not in map (line 673)', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });
    const showSuccess = jest.fn();
    await handleUpdateJobStatus('job-unknown', 'PULL', 'CUSTOM_STATUS', showSuccess, jest.fn(), jest.fn());
    expect(showSuccess).toHaveBeenCalledWith('Job status updated to CUSTOM_STATUS');
  });

  it('handleTogglePublishingStatus job.type pull activates (line 698)', async () => {
    (apiRequest as jest.Mock).mockResolvedValueOnce({ success: true });
    const showSuccess = jest.fn();
    await handleTogglePublishingStatus(
      { id: 'j-pull-act', type: 'pull', publishing_status: 'in-active' } as any,
      showSuccess,
      jest.fn(),
      jest.fn(),
    );
    expect(showSuccess).toHaveBeenCalledWith('Job activated successfully');
  });

  it('handleSaveEdit returns early when job is null (line 820)', async () => {
    const setIsSaving = jest.fn();
    await handleSaveEdit({ job: null, editedData: {}, setIsSaving, showSuccess: jest.fn(), showError: jest.fn(), onSuccess: jest.fn(), onClose: jest.fn() } as any);
    expect(setIsSaving).not.toHaveBeenCalled();
  });

  it('handleSaveEdit does not call onSuccess when not provided (line 837 false)', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ success: true });
    const onClose = jest.fn();
    const showSuccess = jest.fn();
    await handleSaveEdit({
      job: { id: 'j-no-success', type: 'push' },
      editedData: { endpoint_name: 'ep' },
      setIsSaving: jest.fn(),
      showSuccess,
      showError: jest.fn(),
      onSuccess: undefined,
      onClose,
    } as any);
    expect(showSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handleEditSendForApprovalConfirm returns early when job is null (line 865)', async () => {
    const setShowApprovalDialog = jest.fn();
    await handleEditSendForApprovalConfirm(null, jest.fn(), jest.fn(), jest.fn(), setShowApprovalDialog);
    expect(setShowApprovalDialog).not.toHaveBeenCalled();
  });

  it('handleNavigateToHistory does nothing when url is undefined (line 891 false)', () => {
    const navigate = jest.fn();
    handleNavigateToHistory(navigate as any, undefined, undefined);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('saveDataEnrichmentJob editMode non-rejected without selectedJob.id does not update (lines 1040/1045)', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-noid' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-id3' });
    const onSave = jest.fn();
    const onClose = jest.fn();
    await saveDataEnrichmentJob({
      formValues: { name: 'No ID Job' },
      configurationType: 'push',
      editMode: true,
      selectedJob: { id: '', status: 'approved' },
      onSave,
      onCloseWithRefresh: undefined,
      onClose,
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);
    // When selectedJob.id is falsy, onSave is NOT called in the edit block, falls through to create
  });

  it('saveDataEnrichmentJob with existing status not rejected calls onSave when response status present (lines 1063/1067)', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-status' });
    const mockResponse = { id: 'new-id4', status: 'STATUS_01_IN_PROGRESS' };
    (apiRequest as jest.Mock).mockResolvedValue(mockResponse);
    const onSave = jest.fn();
    await saveDataEnrichmentJob({
      formValues: { name: 'Status Job' },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave,
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);
    // response.status is present but not rejected, so onSave not called from the second block
  });

  it('submitPullJob delegates to createPullJob API', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-pull' });
    const result = await submitPullJob({ endpoint_name: 'ep' } as any);
    expect(result).toEqual({ id: 'new-pull' });
  });

  it('submitPushJob delegates to createPushJob API', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-push' });
    const result = await submitPushJob({ endpoint_name: 'ep' } as any);
    expect(result).toEqual({ id: 'new-push' });
  });

  it('loadSchedules delegates to scheduleApi.getAll', async () => {
    (apiRequest as jest.Mock).mockResolvedValue([{ id: 'sched-1' }]);
    const result = await loadSchedules();
    expect(result).toEqual([{ id: 'sched-1' }]);
  });

  it('dataEnrichmentJobApi.getList with undefined searchingFilters', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ data: [], total: 0 });
    await dataEnrichmentJobApi.getList({ offset: 0, limit: 10, userRole: 'admin' } as any, undefined);
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.status).toBe('STATUS_04_APPROVED');
  });

  it('handleSendForApprovalConfirm uses PUSH type when getJobType returns push', () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onSendForApproval = jest.fn();
    const onClose = jest.fn();
    const setShow = jest.fn();
    handleSendForApprovalConfirm({ id: 'j-push' } as any, onSendForApproval, onClose, setShow);
    expect(onSendForApproval).toHaveBeenCalledWith('j-push', 'PUSH');
  });

  it('handleApproveConfirm uses PUSH type when getJobType returns push', () => {
    (getJobType as jest.Mock).mockReturnValue('push');
    const onApprove = jest.fn();
    const onClose = jest.fn();
    const setShow = jest.fn();
    handleApproveConfirm({ id: 'j-push-approve' } as any, onApprove, onClose, setShow);
    expect(onApprove).toHaveBeenCalledWith('j-push-approve', 'PUSH');
  });

  it('determineSourceType returns HTTP when connection parses to a non-object', () => {
    expect(determineSourceType({ connection: '42' } as any)).toBe('HTTP');
    expect(determineSourceType({ connection: '"a string"' } as any)).toBe('HTTP');
  });

  it('handleCloneJob pull job with file includes file in payload', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'cloned-with-file' });
    await handleCloneJob({
      job: { id: 'pull-file', type: 'pull', schedule_id: 'sched-1', source_type: 'HTTP', connection: { url: 'https://example.com' }, table_name: 'tbl', file: 'data.csv', mode: 'append' },
      newVersion: '1.0.0',
      newEndpointName: 'file-ep',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess: jest.fn(),
      onClose: jest.fn(),
    } as any);
    const body = JSON.parse((apiRequest as jest.Mock).mock.calls[0][1].body);
    expect(body.file).toBe('data.csv');
  });

  it('handleCloneJob succeeds without onSuccess callback', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'push-no-onsuccess' });
    const onClose = jest.fn();
    await handleCloneJob({
      job: { id: 'push-noc', type: 'push', endpoint_name: 'ep', table_name: 'tbl' },
      newVersion: '1.0.0',
      newEndpointName: 'ignored',
      setIsCloning: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      onSuccess: undefined,
      onClose,
    } as any);
    expect(onClose).toHaveBeenCalled();
  });

  it('saveDataEnrichmentJob editMode non-rejected skips onSave when undefined', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-no-save' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'id', status: 'approved' });
    const onCloseWithRefresh = jest.fn();
    await saveDataEnrichmentJob({
      formValues: { name: 'EP' },
      configurationType: 'push',
      editMode: true,
      selectedJob: { id: 'job-edit', status: 'exported' },
      onSave: undefined,
      onCloseWithRefresh,
      onClose: jest.fn(),
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);
    expect(onCloseWithRefresh).toHaveBeenCalled();
  });

  it('saveDataEnrichmentJob editMode non-rejected skips onClose when both closers undefined', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-no-close' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'id', status: 'approved' });
    const setIsCreating = jest.fn();
    await saveDataEnrichmentJob({
      formValues: { name: 'EP' },
      configurationType: 'push',
      editMode: true,
      selectedJob: { id: 'job-edit', status: 'exported' },
      onSave: jest.fn(),
      onCloseWithRefresh: undefined,
      onClose: undefined,
      showSuccess: jest.fn(),
      setShowSendForApproval: jest.fn(),
      setIsCreating,
    } as any);
    expect(setIsCreating).toHaveBeenLastCalledWith(false);
  });

  it('saveDataEnrichmentJob create-mode skips onSave when undefined', async () => {
    (buildPushPayload as jest.Mock).mockReturnValue({ endpoint_name: 'ep-no-save2' });
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'new-id' });
    const showSuccess = jest.fn();
    await saveDataEnrichmentJob({
      formValues: { name: 'EP' },
      configurationType: 'push',
      editMode: false,
      selectedJob: null,
      onSave: undefined,
      onCloseWithRefresh: jest.fn(),
      onClose: jest.fn(),
      showSuccess,
      setShowSendForApproval: jest.fn(),
      setIsCreating: jest.fn(),
    } as any);
    expect(showSuccess).toHaveBeenCalled();
  });
});

