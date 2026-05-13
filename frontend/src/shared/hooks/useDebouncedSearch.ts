import { useEffect, useState, useCallback } from 'react';

const DEFAULT_DEBOUNCE_DELAY = 500;

type UseDebouncedSearchReturn = [string, string, (value: string) => void];

const useDebouncedSearch = (
  initialValue = '',
  delay = DEFAULT_DEBOUNCE_DELAY,
): UseDebouncedSearchReturn => {
  const [value, setValue] = useState<string>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<string>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  const onChange = useCallback((value: string) => {
    setValue(value);
  }, []);

  return [value, debouncedValue, onChange];
};

export default useDebouncedSearch;
