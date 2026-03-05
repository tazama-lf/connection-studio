import { GridPagination, gridPageCountSelector, useGridApiContext, useGridSelector } from '@mui/x-data-grid';
import MuiPagination from '@mui/material/Pagination';
import React from 'react';

interface PaginationTableProps {
    page: number;
    onPageChange: (event: React.ChangeEvent<unknown>, newPage: number) => void;
    className?: string;
}

function PaginationTable({ page, onPageChange, className }: PaginationTableProps): React.ReactElement {
    const apiRef = useGridApiContext();
    const pageCount = useGridSelector(apiRef, gridPageCountSelector);

    return (
        <MuiPagination
            color="primary"
            className={className}
            count={pageCount}
            page={page + 1}
            onChange={(event, newPage) => {
                onPageChange(event, newPage - 1);
            }}
        />
    );
}

export function Pagination(props: any): React.ReactElement {
    return <GridPagination ActionsComponent={PaginationTable} {...props} />;
}
