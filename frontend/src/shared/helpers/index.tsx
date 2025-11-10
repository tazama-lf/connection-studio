import { Input } from '@mui/material';
import React from 'react';

interface InputFilterProps {
  fieldName: string;
  isDisable?: boolean;
  type?: string;
  maxLength?: number;
  searchingFilters: Record<string, any>;
  setSearchingFilters: React.Dispatch<
    React.SetStateAction<Record<string, any>>
  >;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  fieldName: string;
  options: SelectOption[];
  searchingFilters?: Record<string, any>;
  setSearchingFilters: React.Dispatch<
    React.SetStateAction<Record<string, any>>
  >;
}

// HANDLE SEARCH INPUT FILTER
export const handleInputFilter = ({
  fieldName,
  isDisable = false,
  type,
  maxLength,
  searchingFilters,
  setSearchingFilters,
}: InputFilterProps) => {
  return (
    <div className="relative w-full">
      <input
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            const target = event.target as HTMLInputElement;
            setSearchingFilters((prev: Record<string, any>) => ({
              ...prev,
              [fieldName]: target.value.trim(),
            }));
            // setTableLoading(true);
          }
        }}
        onChange={(event) => {
          const value = event.target.value;

          // Trigger API call if the filter value is cleared
          if (value.length <= 0) {
            // setTableLoading(true);
            // deleting that search filter key which is cleared
            const updatedFilters = { ...searchingFilters };
            delete updatedFilters[fieldName];
            setSearchingFilters(updatedFilters);
          }
        }}
        className="w-full rounded-sm border border-gray-300 bg-white px-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none"
        disabled={isDisable}
        type={type || 'text'}
        // inputProps={{ maxLength: maxLength || 25 }}
        placeholder="search..."
      />
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <svg
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
};

// HANDLE SEARCH SELECT FILTER
export const handleSelectFilter = ({
  fieldName,
  options,
  setSearchingFilters,
}: SelectFilterProps) => {
  return (
    <select
      defaultValue=""
      style={{ width: '100%', height: '34px' }}
      onChange={(event) => {
        const selectedValue = event.target.value;
        // setTableLoading(true);
        setSearchingFilters((prevFilters: Record<string, any>) => ({
          ...prevFilters,
          [fieldName]: selectedValue || undefined,
        }));
      }}
    >
      <option value="">Show All</option>
      {options?.map((item: SelectOption) => (
        <option key={item?.value} value={item?.value}>
          {item?.label}
        </option>
      ))}
    </select>
  );
};
