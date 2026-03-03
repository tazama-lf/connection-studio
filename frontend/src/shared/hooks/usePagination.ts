import { useState } from 'react';

interface UsePaginationOptions {
  defaultOffset?: number;
  defaultLimit?: number;
}

interface PaginationParams {
  offset: number;
  limit: number;
}

interface UsePaginationReturn {
  offset: number;
  limit: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  getPaginationParams: () => PaginationParams;
  resetPagination: () => void;
}

export const usePagination = ({
  defaultOffset = 0,
  defaultLimit = 10,
}: UsePaginationOptions = {}): UsePaginationReturn => {
  const [offset, setOffset] = useState<number>(defaultOffset);
  const [limit, setLimit] = useState<number>(defaultLimit);

  const getPaginationParams = (): PaginationParams => ({
    offset,
    limit,
  });

  const resetPagination = (): void => {
    setOffset(defaultOffset);
    setLimit(defaultLimit);
  };

  return {
    offset,
    limit,
    setOffset,
    setLimit,
    getPaginationParams,
    resetPagination,
  };
};