import { useEffect } from 'react';
import { usePagination } from './usePagination';
import useDebouncedSearch from './useDebouncedSearch';

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 10;
const DEFAULT_SEARCH_DELAY = 500;

interface UseFiltersOptions {
  defaultOffset?: number;
  defaultLimit?: number;
  searchDelay?: number;
  initialSearch?: string;
}

export interface UseFiltersReturn {
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  offset: number;
  limit: number;
  setOffset: (offset: number) => void;
  setLimit: (limit: number) => void;
  getPaginationParams: () => { offset: number; limit: number };
  resetPagination: () => void;
}

const useFilters = ({
  defaultOffset = DEFAULT_OFFSET,
  defaultLimit = DEFAULT_LIMIT,
  searchDelay = DEFAULT_SEARCH_DELAY,
  initialSearch = '',
}: UseFiltersOptions = {}): UseFiltersReturn => {
  const {
    offset,
    limit,
    setOffset,
    setLimit,
    getPaginationParams,
    resetPagination,
  } = usePagination({ defaultOffset, defaultLimit });

  const [search, debouncedSearch, setSearch] = useDebouncedSearch(
    initialSearch,
    searchDelay,
  );

  useEffect(() => {
    setOffset(defaultOffset);
  }, [debouncedSearch, setOffset, defaultOffset]);

  return {
    search,
    debouncedSearch,
    setSearch,
    offset,
    limit,
    setOffset,
    setLimit,
    getPaginationParams,
    resetPagination,
  };
};

export default useFilters;
