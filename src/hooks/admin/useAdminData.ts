
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAdminDataOptions<T> {
    endpoint: string;
    initialFilters?: Record<string, string>;
    transform?: (data: any) => T[];
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
}

export function useAdminData<T>({
    endpoint,
    initialFilters = {},
    transform = (d) => d,
    onSuccess,
    onError,
}: UseAdminDataOptions<T>) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
    const [refreshKey, setRefreshKey] = useState(0);

    // Use refs for callbacks to prevent re-creation of fetchData on every render
    const callbacksRef = useRef({ transform, onSuccess, onError });

    useEffect(() => {
        callbacksRef.current = { transform, onSuccess, onError };
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Clean filters (remove empty values)
            const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
                if (value && value !== 'all') {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, string>);

            const params = new URLSearchParams(cleanFilters);
            const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;

            const res = await fetch(url);

            if (!res.ok) throw new Error('Failed to fetch data');

            const json = await res.json();
            const { transform, onSuccess } = callbacksRef.current;
            const transformedData = transform(json);

            setData(transformedData);
            setError(null);
            onSuccess?.(transformedData);
        } catch (e) {
            const errorObj = e instanceof Error ? e : new Error('Unknown error');
            const errorMessage = errorObj.message;
            setError(errorMessage);
            callbacksRef.current.onError?.(errorObj);
        } finally {
            setLoading(false);
        }
    }, [endpoint, filters, refreshKey]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = () => setRefreshKey(prev => prev + 1);

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters(initialFilters);
    };

    return {
        data,
        loading,
        error,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        refetch,
        setData // Expose setData for optimistic updates
    };
}
