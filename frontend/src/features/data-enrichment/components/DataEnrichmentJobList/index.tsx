import React from 'react';
import { useDataEnrichmentJobList } from '../../hooks/useDataEnrichmentJobList';
import type { DataEnrichmentJobListProps } from '../../types';
import JobList from '../JobList';

export const DataEnrichmentJobList: React.FC<DataEnrichmentJobListProps> = () => {
  const {
    jobs,
    loading,
    pagination,
    searchingFilters,
    setPage,
    setSearchingFilters,
    loadJobs,
    handleView,
    handleEdit,
  } = useDataEnrichmentJobList();

  
  
  return (
    <JobList
      jobs={jobs}
      isLoading={loading}
      onViewLogs={handleView}
      onEdit={handleEdit}
      onRefresh={loadJobs}
      page={pagination.page}
      setPage={setPage}
      totalPages={pagination.totalPages}
      totalRecords={pagination.totalRecords}
      searchingFilters={searchingFilters}
      setSearchingFilters={setSearchingFilters}
    />
  );
};

export default DataEnrichmentJobList;
