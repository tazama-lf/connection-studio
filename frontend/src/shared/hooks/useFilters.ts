import { useEffect } from 'react'
import { usePagination } from './usePagination'
import useDebouncedSearch from './useDebouncedSearch'

interface UseFiltersOptions {
  defaultOffset?: number
  defaultLimit?: number
  searchDelay?: number
  initialSearch?: string
}

export interface UseFiltersReturn {
  search: string
  debouncedSearch: string
  setSearch: (value: string) => void
  offset: number
  limit: number
  setOffset: (offset: number) => void
  setLimit: (limit: number) => void
  getPaginationParams: () => { offset: number; limit: number }
  resetPagination: () => void
}

const useFilters = ({
  defaultOffset = 0,
  defaultLimit = 10,
  searchDelay = 500,
  initialSearch = '',
}: UseFiltersOptions = {}): UseFiltersReturn => {
  const {
    offset,
    limit,
    setOffset,
    setLimit,
    getPaginationParams,
    resetPagination,
  } = usePagination({ defaultOffset, defaultLimit })

  const [search, debouncedSearch, setSearch] = useDebouncedSearch(
    initialSearch,
    searchDelay
  )

  useEffect(() => {
    setOffset(defaultOffset)
  }, [debouncedSearch, setOffset, defaultOffset])

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
  }
}

export default useFilters