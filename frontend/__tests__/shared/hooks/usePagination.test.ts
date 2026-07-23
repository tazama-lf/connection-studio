import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../../../src/shared/hooks/usePagination';

describe('usePagination', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(() =>
      usePagination({ defaultOffset: 5, defaultLimit: 20 }),
    );

    expect(result.current.offset).toBe(5);
    expect(result.current.limit).toBe(20);
  });

  it('should update offset via setOffset', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setOffset(30);
    });

    expect(result.current.offset).toBe(30);
  });

  it('should update limit via setLimit', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setLimit(25);
    });

    expect(result.current.limit).toBe(25);
  });

  it('should return current pagination params via getPaginationParams', () => {
    const { result } = renderHook(() =>
      usePagination({ defaultOffset: 10, defaultLimit: 5 }),
    );

    const params = result.current.getPaginationParams();

    expect(params).toEqual({ offset: 10, limit: 5 });
  });

  it('should reset pagination to defaults via resetPagination', () => {
    const { result } = renderHook(() =>
      usePagination({ defaultOffset: 0, defaultLimit: 10 }),
    );

    act(() => {
      result.current.setOffset(50);
      result.current.setLimit(100);
    });

    expect(result.current.offset).toBe(50);
    expect(result.current.limit).toBe(100);

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
  });

  it('should getPaginationParams reflect updated offset and limit', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setOffset(20);
      result.current.setLimit(50);
    });

    const params = result.current.getPaginationParams();
    expect(params).toEqual({ offset: 20, limit: 50 });
  });
});
