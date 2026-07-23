import { renderHook, act, waitFor } from '@testing-library/react';
import useFilters from '../../../src/shared/hooks/useFilters';

describe('useFilters', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFilters());

    expect(result.current.search).toBe('');
    expect(result.current.debouncedSearch).toBe('');
    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
  });

  it('should initialize with custom options', () => {
    const { result } = renderHook(() =>
      useFilters({
        defaultOffset: 5,
        defaultLimit: 25,
        initialSearch: 'hello',
      }),
    );

    expect(result.current.offset).toBe(5);
    expect(result.current.limit).toBe(25);
    expect(result.current.search).toBe('hello');
    expect(result.current.debouncedSearch).toBe('hello');
  });

  it('should update search via setSearch', () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setSearch('my query');
    });

    expect(result.current.search).toBe('my query');
  });

  it('should debounce the search update', () => {
    const { result } = renderHook(() => useFilters({ searchDelay: 500 }));

    act(() => {
      result.current.setSearch('test');
    });

    expect(result.current.debouncedSearch).toBe('');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.debouncedSearch).toBe('test');
  });

  it('should reset offset to defaultOffset when debouncedSearch changes', async () => {
    const { result } = renderHook(() =>
      useFilters({ defaultOffset: 0, defaultLimit: 10 }),
    );

    act(() => {
      result.current.setOffset(50);
    });

    expect(result.current.offset).toBe(50);

    act(() => {
      result.current.setSearch('query');
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.offset).toBe(0);
    });
  });

  it('should update offset via setOffset', () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setOffset(20);
    });

    expect(result.current.offset).toBe(20);
  });

  it('should update limit via setLimit', () => {
    const { result } = renderHook(() => useFilters());

    act(() => {
      result.current.setLimit(50);
    });

    expect(result.current.limit).toBe(50);
  });

  it('should return pagination params via getPaginationParams', () => {
    const { result } = renderHook(() =>
      useFilters({ defaultOffset: 10, defaultLimit: 20 }),
    );

    const params = result.current.getPaginationParams();

    expect(params).toEqual({ offset: 10, limit: 20 });
  });

  it('should reset pagination via resetPagination', () => {
    const { result } = renderHook(() =>
      useFilters({ defaultOffset: 0, defaultLimit: 10 }),
    );

    act(() => {
      result.current.setOffset(30);
      result.current.setLimit(100);
    });

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
  });
});
