
import { useState, useMemo, useEffect } from 'react';

export function useTablePagination<T>(data: T[], itemsPerPage = 10) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(itemsPerPage);

    const totalPages = Math.ceil(data.length / pageSize);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, currentPage, pageSize]);

    // Reset to first page when data length changes (e.g. filtering)
    useEffect(() => {
        const calculatedTotalPages = Math.ceil(data.length / pageSize);
        if (currentPage > 1 && calculatedTotalPages < currentPage) {
            setCurrentPage(1);
        }
    }, [data.length, pageSize, currentPage]);

    const goToPage = (page: number) => {
        const p = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(p);
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);

    return {
        currentPage,
        pageSize,
        setPageSize,
        totalPages,
        paginatedData,
        goToPage,
        nextPage,
        prevPage,
        startIndex: (currentPage - 1) * pageSize,
        endIndex: Math.min(currentPage * pageSize, data.length),
        totalItems: data.length
    };
}
