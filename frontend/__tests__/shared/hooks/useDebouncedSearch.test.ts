import { renderHook, act } from '@testing-library/react';
import useDebouncedSearch from '../../../src/shared/hooks/useDebouncedSearch';

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with the default empty value', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    const [value, debouncedValue] = result.current;
    expect(value).toBe('');
    expect(debouncedValue).toBe('');
  });

  it('should initialize with the provided initial value', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial'));

    const [value, debouncedValue] = result.current;
    expect(value).toBe('initial');
    expect(debouncedValue).toBe('initial');
  });

  it('should update value immediately via onChange', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current[2]('hello');
    });

    expect(result.current[0]).toBe('hello');
  });

  it('should not update debouncedValue immediately', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 500));

    act(() => {
      result.current[2]('test search');
    });

    // debouncedValue should still be old value
    expect(result.current[1]).toBe('');
  });

  it('should update debouncedValue after the delay', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 500));

    act(() => {
      result.current[2]('test search');
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current[1]).toBe('test search');
  });

  it('should cancel previous debounce timer when value changes rapidly', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 500));

    act(() => {
      result.current[2]('a');
    });

    act(() => {
      jest.advanceTimersByTime(200);
      result.current[2]('ab');
    });

    act(() => {
      jest.advanceTimersByTime(200);
      result.current[2]('abc');
    });

    // debounced value should still be empty since timer hasn't completed
    expect(result.current[1]).toBe('');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // only the last value should have been debounced
    expect(result.current[1]).toBe('abc');
  });

  it('should use default delay of 500ms', () => {
    const { result } = renderHook(() => useDebouncedSearch());

    act(() => {
      result.current[2]('query');
    });

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current[1]).toBe('');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current[1]).toBe('query');
  });

  it('should use custom delay', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));

    act(() => {
      result.current[2]('search');
    });

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current[1]).toBe('');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current[1]).toBe('search');
  });

  it('should return stable onChange function', () => {
    const { result, rerender } = renderHook(() => useDebouncedSearch('', 500));

    const onChange1 = result.current[2];
    rerender();
    const onChange2 = result.current[2];

    expect(onChange1).toBe(onChange2);
  });
});
