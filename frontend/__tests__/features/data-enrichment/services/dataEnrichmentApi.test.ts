import { dataEnrichmentApi } from '../../../../src/features/data-enrichment/services/dataEnrichmentApi';
import { getDemsStatusLov } from '@shared/lovs';

jest.mock('@shared/lovs', () => ({
  getDemsStatusLov: {
    admin: [{ value: 'STATUS_04_APPROVED' }, { value: 'STATUS_06_EXPORTED' }],
  },
}));

describe('dataEnrichmentApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('includes lowercase type in getJob request URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'job-1' }),
    });

    await dataEnrichmentApi.getJob('job-1', 'PULL');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/job/job-1?type=pull'),
      expect.any(Object),
    );
  });

  it('removes auth token and throws on 401', async () => {
    localStorage.setItem('authToken', 'token-value');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(dataEnrichmentApi.createPullJob({} as any)).rejects.toThrow(
      'Authentication failed',
    );
    expect(localStorage.getItem('authToken')).toBeFalsy();
  });

  it('applies default status filter in getAllJobs when none is supplied', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });

    await dataEnrichmentApi.getAllJobs(
      { offset: 0, limit: 10, userRole: 'admin' } as any,
      { endpoint_name: 'payments' },
    );

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);

    expect(body.status).toBe('STATUS_04_APPROVED,STATUS_06_EXPORTED');
    expect(body.endpoint_name).toBe('payments');
  });

  it('transforms array response into paginated response for getJobsByStatus', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
    });

    const result = await dataEnrichmentApi.getJobsByStatus('approved');

    expect(result.jobs).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('normalizes getJobHistory response shape from jobs/count payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        jobs: [{ id: 'history-1' }],
        count: 1,
        totalPages: 3,
      }),
    });

    const result = await dataEnrichmentApi.getJobHistory(undefined, 0, 10, {
      endpointName: 'ep',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([{ id: 'history-1' }]);
    expect(result.total).toBe(1);
    expect(result.pages).toBe(3);
  });

  it('throws on getJobHistory when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(
      dataEnrichmentApi.getJobHistory('job-1', 0, 10, {}),
    ).rejects.toThrow('Failed to fetch job history');
  });

  it('sends reason body for updateStatus and lowercases type', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.updateStatus(
      'job-2',
      'STATUS_04_APPROVED',
      'PULL',
      'ok to approve',
    );

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('type=pull');
    expect((options as RequestInit).method).toBe('PATCH');
    expect((options as RequestInit).body).toBeDefined();
  });

  it('creates push job using push endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'push-1' }),
    });

    await dataEnrichmentApi.createPushJob({ endpoint_name: 'x' } as any);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/job/create/push');
    expect((options as RequestInit).method).toBe('POST');
  });

  it('passes through paginated getJobsByStatus payload unchanged', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        jobs: [{ id: 'j1' }],
        page: 2,
        limit: 5,
        total: 20,
        totalPages: 4,
      }),
    });

    const result = await dataEnrichmentApi.getJobsByStatus('pending', 2, 5);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(4);
  });

  it('deletes jobs using lowercased type', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.deleteJob('job-del', 'PUSH' as any);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/job/job-del?type=push');
    expect((options as RequestInit).method).toBe('DELETE');
  });

  it('supports legacy updateJob and updateJobStatus without reason body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.updateJob('job-legacy', {
      job_status: 'STATUS_01_IN_PROGRESS',
    });
    let [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/job/job-legacy');
    expect((options as RequestInit).method).toBe('PATCH');

    await dataEnrichmentApi.updateJobStatus(
      'job-status',
      'STATUS_04_APPROVED',
      'PULL',
    );
    [url, options] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toContain('type=pull');
    expect((options as RequestInit).body).toBeUndefined();
  });

  it('updates activation and publishing status using lowercase type', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.updateJobActivation('job-a', true, 'PUSH');
    await dataEnrichmentApi.updatePublishingStatus(
      'job-b',
      'in-active',
      'PULL',
    );

    const firstUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    const secondUrl = (global.fetch as jest.Mock).mock.calls[1][0];
    expect(firstUrl).toContain('status=active&type=push');
    expect(secondUrl).toContain('status=in-active&type=pull');
  });

  it('covers schedule CRUD endpoints and status update', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.createSchedule({ name: 'sched' } as any);
    await dataEnrichmentApi.getAllSchedules(0, 50);
    await dataEnrichmentApi.getSchedule('sched-1');
    await dataEnrichmentApi.updateSchedule('sched-2', {
      name: 'x',
      startDate: '2025-01-01',
      iterations: 3,
      cronExpression: '0 * * * *',
    } as any);
    await dataEnrichmentApi.updateScheduleStatus(
      'sched-3',
      'STATUS_04_APPROVED',
    );

    const urls = (global.fetch as jest.Mock).mock.calls
      .map((c) => c[0])
      .join(' ');
    expect(urls).toContain('/scheduler/create');
    expect(urls).toContain('/scheduler/all?offset=0&limit=50');
    expect(urls).toContain('/scheduler/sched-1');
    expect(urls).toContain('/scheduler/update/sched-2');
    expect(urls).toContain(
      '/scheduler/update/status/sched-3?status=STATUS_04_APPROVED',
    );
  });

  it('includes job_id in getJobHistory request body when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [] }),
    });

    await dataEnrichmentApi.getJobHistory('job-x', 1, 25, {
      endpointName: 'ep',
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.job_id).toBe('job-x');
    expect(body.endpointName).toBe('ep');
  });

  it('calls connection test and data preview endpoints', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.testConnection({ source_type: 'HTTP' } as any);
    await dataEnrichmentApi.previewData({ source_type: 'HTTP' } as any);

    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => c[0]);
    expect(urls.some((u: string) => u.includes('/job/test/connection'))).toBe(
      true,
    );
    expect(urls.some((u: string) => u.includes('/job/preview/data'))).toBe(
      true,
    );
  });

  it('getCronJobList applies default status and throws on bad response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });

    await dataEnrichmentApi.getCronJobList(
      { offset: 0, limit: 10, userRole: 'admin' } as any,
      {
        endpoint_name: 'cron-a',
      },
    );

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.status).toBe('STATUS_04_APPROVED,STATUS_06_EXPORTED');
    expect(body.endpoint_name).toBe('cron-a');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn(),
    });

    await expect(
      dataEnrichmentApi.getCronJobList(
        { offset: 0, limit: 10, userRole: 'admin' } as any,
        {},
      ),
    ).rejects.toThrow('Failed to fetch paginated schedules');
  });

  it('throws on non-ok, non-401 response from apiRequest (lines 79-80)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ message: 'Server error' }),
    });

    await expect(dataEnrichmentApi.createPullJob({} as any)).rejects.toThrow(
      'Server error',
    );
  });

  it('throws when getAllJobs response is not ok (line 137)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(
      dataEnrichmentApi.getAllJobs(
        { offset: 0, limit: 10, userRole: 'admin' } as any,
        {},
      ),
    ).rejects.toThrow('Failed to fetch data enrichment jobs');
  });

  it('calls updatePullJob with PATCH to pull update endpoint (line 190)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'pull-1' }),
    });

    await dataEnrichmentApi.updatePullJob('pull-1', {
      endpoint_name: 'x',
    } as any);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/job/update/pull-1?type=pull');
    expect((options as RequestInit).method).toBe('PATCH');
  });

  it('calls updatePushJob with PATCH to push update endpoint (line 203)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'push-1' }),
    });

    await dataEnrichmentApi.updatePushJob('push-1', {
      endpoint_name: 'y',
    } as any);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/job/update/push-1?type=push');
    expect((options as RequestInit).method).toBe('PATCH');
  });

  it('includes reason in updateJobStatus request body when reason is provided (line 267)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await dataEnrichmentApi.updateJobStatus(
      'job-reason',
      'STATUS_05_REJECTED',
      'PULL',
      'rejected because of errors',
    );

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('type=pull');
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.reason).toBe('rejected because of errors');
  });

  it('updateJobStatus without reason: covers if(reason) false and ternary false branches', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    await dataEnrichmentApi.updateJobStatus(
      'job-x',
      'STATUS_04_APPROVED',
      'PUSH',
    );
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    // reason is undefined → body should be undefined
    expect((options as RequestInit).body).toBeUndefined();
  });

  it('updateJobActivation with isActive=false uses in-active branch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    await dataEnrichmentApi.updateJobActivation('job-b', false, 'PULL');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('status=in-active');
  });

  it('getAllSchedules without args uses default offset and limit parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([]),
    });
    await dataEnrichmentApi.getAllSchedules();
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('offset=0');
    expect(url).toContain('limit=50');
  });

  it('getJobHistory without offset/limit uses default parameter values', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [] }),
    });
    await dataEnrichmentApi.getJobHistory('job-def');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('offset=0');
    expect(url).toContain('limit=10');
  });

  it('getJobHistory returns empty data array when json has neither data nor jobs', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    const result = await dataEnrichmentApi.getJobHistory('job-empty');
    expect(result.data).toEqual([]);
  });

  it('updateSchedule with cron (no cronExpression) uses cron ?? fallback', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
    await dataEnrichmentApi.updateSchedule('sched-x', {
      cron: '*/5 * * * *',
    } as any);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.cron).toBe('*/5 * * * *');
  });

  it('getCronJobList with status in searchingFilters skips default status filter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });
    await dataEnrichmentApi.getCronJobList(
      { offset: 0, limit: 10, userRole: 'admin' } as any,
      { status: 'STATUS_04_APPROVED' },
    );
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    // status was provided in filters, so the default should not be applied
    expect(body.status).toBe('STATUS_04_APPROVED');
  });

  it('apiRequest throws with HTTP error fallback when error response has no message field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockResolvedValue({}),
    });
    await expect(dataEnrichmentApi.createPullJob({} as any)).rejects.toThrow(
      'HTTP error! status: 503',
    );
  });

  it('getJob without type omits query param', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'job-no-type' }),
    });
    await dataEnrichmentApi.getJob('job-no-type');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).not.toContain('?type');
  });

  it('getAllJobs with status in searchingFilters skips default status filter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });
    await dataEnrichmentApi.getAllJobs(
      { offset: 0, limit: 10, userRole: 'admin' } as any,
      { status: 'custom-status' },
    );
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.status).toBe('custom-status');
  });

  it('getAuthHeaders omits Authorization when no token in localStorage', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 'x' }),
    });
    await dataEnrichmentApi.getJob('x');
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(
      (options as RequestInit & { headers?: Record<string, string> }).headers
        ?.Authorization,
    ).toBeUndefined();
  });

  it('apiRequest .catch(() => ({})) when response.json() rejects', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    });

    await expect(dataEnrichmentApi.createPullJob({} as any)).rejects.toThrow(
      'HTTP error! status: 500',
    );
  });

  it('getAllJobs without searchingFilters uses default empty object', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });

    await dataEnrichmentApi.getAllJobs({
      offset: 0,
      limit: 10,
      userRole: 'admin',
    } as any);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.status).toBe('STATUS_04_APPROVED,STATUS_06_EXPORTED');
  });

  it('updateStatus without reason omits body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ message: 'fail' }),
    });

    await expect(
      dataEnrichmentApi.updateStatus(
        'job-no-reason',
        'STATUS_04_APPROVED',
        'PUSH',
      ),
    ).rejects.toThrow('fail');
  });

  it('getCronJobList without searchingFilters uses default empty object', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true, data: [], total: 0 }),
    });

    await dataEnrichmentApi.getCronJobList({
      offset: 0,
      limit: 10,
      userRole: 'admin',
    } as any);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.status).toBe('STATUS_04_APPROVED,STATUS_06_EXPORTED');
  });
});
