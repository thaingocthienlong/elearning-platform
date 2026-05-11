
import { useState, useMemo } from 'react';

/**
 * Generic hook for client-side filtering of data
 */
export function useAdminFilters<T>(
    data: T[],
    searchFields: (keyof T)[],
    filterFields: Partial<Record<keyof T, any>> = {}
) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Partial<Record<keyof T, any>>>(filterFields);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Search Filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = searchFields.some(field => {
                    const value = item[field];
                    return String(value).toLowerCase().includes(query);
                });
                if (!matchesSearch) return false;
            }

            // 2. Exact Match Filters (e.g., status, role)
            for (const [key, filterValue] of Object.entries(activeFilters)) {
                if (filterValue && filterValue !== 'all') {
                    if (item[key as keyof T] !== filterValue) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [data, searchQuery, activeFilters, searchFields]);

    const setFilter = (key: keyof T, value: any) => {
        setActiveFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return {
        searchQuery,
        setSearchQuery,
        activeFilters,
        setFilter,
        filteredData,
        totalCount: filteredData.length
    };
}
