import { act, renderHook, waitFor } from '@testing-library/react';
import { useResourceList } from '../../../src/shared/hooks/useResourceList';

const mockShowError = jest.fn();
let mockAuthUser: { claims: string[] } | null = { claims: ['editor'] };

jest.mock('@shared/providers/ToastProvider', () => ({
  useToast: () => ({ showError: mockShowError }),
}));

jest.mock('@features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock('@utils/common/roleUtils', () => ({
  isEditor: jest.fn(() => true),
  isExporter: jest.fn(() => false),
  isApprover: jest.fn(() => false),
  isPublisher: jest.fn(() => false),
  getPrimaryRole: jest.fn((claims: string[]) => claims[0] ?? null),
}));

type TestResource = {
  id: string;
  type?: string;
  status?: string;
  name?: string;
};

describe('useResourceList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = { claims: ['editor'] };
  });

  it('loads resources on mount and updates pagination', async () => {
    const load = jest.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Item 1' }],
      pages: 3,
      total: 30,
    });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(load).toHaveBeenCalledWith(1, 10, 'editor', {});
      expect(result.current.resources).toEqual([{ id: '1', name: 'Item 1' }]);
      expect(result.current.pagination.totalPages).toBe(3);
    });
  });

  it('uses custom itemsPerPage when provided', async () => {
    const load = jest.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Item 1' }],
      pages: 1,
      total: 1,
    });
    const options = { apiHandlers: { load }, itemsPerPage: 25 };

    renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(load).toHaveBeenCalledWith(1, 25, 'editor', {});
    });
  });

  it('uses jobs fallback when data is missing', async () => {
    const load = jest.fn().mockResolvedValue({
      jobs: [{ id: 'job-1' }],
      pages: 1,
      total: 1,
    });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.resources).toEqual([{ id: 'job-1' }]);
    });
  });

  it('uses items fallback when data and jobs are missing', async () => {
    const load = jest.fn().mockResolvedValue({
      items: [{ id: 'item-1' }],
      pages: 1,
      total: 1,
    });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.resources).toEqual([{ id: 'item-1' }]);
    });
  });

  it('uses empty array when response has no data keys', async () => {
    const load = jest.fn().mockResolvedValue({
      pages: 1,
      total: 0,
    });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.resources).toEqual([]);
    });
  });

  it('uses empty role and empty claims when auth user is null', async () => {
    mockAuthUser = null;
    const load = jest.fn().mockResolvedValue({
      data: [{ id: '1' }],
      pages: 1,
      total: 1,
    });
    const options = { apiHandlers: { load } };

    renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(load).toHaveBeenCalledWith(1, 10, '', {});
    });
  });

  it('handleView fetches details when getById exists', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const getById = jest
      .fn()
      .mockResolvedValue({ id: '22', name: 'Fetched item' });
    const options = { apiHandlers: { load, getById } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await act(async () => {
      await result.current.handleView('22', 'PULL');
    });

    expect(getById).toHaveBeenCalledWith('22', 'PULL');
    expect(result.current.selectedResource).toEqual({
      id: '22',
      name: 'Fetched item',
    });
    expect(result.current.editMode).toBe(false);
  });

  it('handleView returns early when getById is missing', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await act(async () => {
      await result.current.handleView('22', 'PULL');
    });

    expect(result.current.selectedResource).toBeNull();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('handleView shows toast when getById fails', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const getById = jest.fn().mockRejectedValue(new Error('boom'));
    const options = { apiHandlers: { load, getById } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await act(async () => {
      await result.current.handleView('22', 'PULL');
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to load resource details',
    );
  });

  it('handleEdit sets edit mode directly when getById is missing', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));
    const resource = { id: '10', type: 'pull', name: 'Local item' };

    await act(async () => {
      await result.current.handleEdit(resource);
    });

    expect(result.current.selectedResource).toEqual(resource);
    expect(result.current.editMode).toBe(true);
  });

  it('handleEdit fetches details using uppercase type when getById exists', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const getById = jest
      .fn()
      .mockResolvedValue({ id: '10', name: 'Fetched for edit' });
    const options = { apiHandlers: { load, getById } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));
    const resource = { id: '10', type: 'pull', name: 'Local item' };

    await act(async () => {
      await result.current.handleEdit(resource);
    });

    expect(getById).toHaveBeenCalledWith('10', 'PULL');
    expect(result.current.selectedResource).toEqual({
      id: '10',
      name: 'Fetched for edit',
    });
    expect(result.current.editMode).toBe(true);
  });

  it('handleEdit passes undefined type when resource type is missing', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const getById = jest
      .fn()
      .mockResolvedValue({ id: '11', name: 'Fetched without type' });
    const options = { apiHandlers: { load, getById } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await act(async () => {
      await result.current.handleEdit({ id: '11', name: 'No type present' });
    });

    expect(getById).toHaveBeenCalledWith('11', undefined);
    expect(result.current.selectedResource).toEqual({
      id: '11',
      name: 'Fetched without type',
    });
    expect(result.current.editMode).toBe(true);
  });

  it('handleEdit shows toast when getById fails', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const getById = jest.fn().mockRejectedValue(new Error('boom'));
    const options = { apiHandlers: { load, getById } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));
    const resource = { id: '10', type: 'pull', name: 'Local item' };

    await act(async () => {
      await result.current.handleEdit(resource);
    });

    expect(mockShowError).toHaveBeenCalledWith(
      'Failed to load resource details for edit',
    );
  });

  it('setPage updates current page', () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    act(() => {
      result.current.setPage(4);
    });

    expect(result.current.pagination.page).toBe(4);
  });

  it('sets error when load fails', async () => {
    const load = jest.fn().mockRejectedValue(new Error('Load failed hard'));
    const options = {
      apiHandlers: { load },
      errorMessages: { load: 'Could not load list' },
    };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.error).toBe('Load failed hard');
      expect(result.current.loading).toBe(false);
    });
  });

  it('uses string rejection directly as error message', async () => {
    const load = jest.fn().mockRejectedValue('Load failed string');
    const options = {
      apiHandlers: { load },
      errorMessages: { load: 'Could not load list' },
    };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.error).toBe('Load failed string');
    });
  });

  it('uses fallback message for non-error and non-string rejection', async () => {
    const load = jest.fn().mockRejectedValue({ reason: 'bad payload' });
    const options = {
      apiHandlers: { load },
      errorMessages: { load: 'Could not load list' },
    };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.error).toBe('Could not load list');
    });
  });

  it('uses default load fallback when custom load error message is not provided', async () => {
    const load = jest.fn().mockRejectedValue({ reason: 'bad payload' });
    const options = {
      apiHandlers: { load },
    };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load resources');
    });
  });

  it('should update confirmDialog state', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newDialog = {
      open: true,
      type: 'DELETE' as const,
      resource: { id: '123', name: 'Test' },
    };

    act(() => {
      result.current.setConfirmDialog(newDialog);
    });

    expect(result.current.confirmDialog).toEqual(newDialog);

    act(() => {
      result.current.setConfirmDialog({
        open: false,
        type: '',
        resource: null,
      });
    });

    expect(result.current.confirmDialog.open).toBe(false);
  });

  it('should update filters via setSearchingFilters', async () => {
    const load = jest.fn().mockResolvedValue({ data: [], pages: 0, total: 0 });
    const options = { apiHandlers: { load } };

    const { result } = renderHook(() => useResourceList<TestResource>(options));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchingFilters({ name: 'test', status: 'active' });
    });

    expect(result.current.searchingFilters).toEqual({
      name: 'test',
      status: 'active',
    });
  });
});
