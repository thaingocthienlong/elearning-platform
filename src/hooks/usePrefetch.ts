'use client';

import { useEffect } from 'react';

/**
 * Hook to prefetch data in the background
 * @param url API endpoint to prefetch
 * @param enabled Whether prefetching is enabled
 */
export function usePrefetch(url: string, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        // Prefetch in the background
        const prefetch = async () => {
            try {
                await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                console.log(`✅ Prefetched: ${url}`);
            } catch (error) {
                console.error(`❌ Prefetch failed: ${url}`, error);
            }
        };

        // Small delay to avoid blocking initial render
        const timer = setTimeout(prefetch, 100);

        return () => clearTimeout(timer);
    }, [url, enabled]);
}

/**
 * Hook to prefetch on hover
 * @param url API endpoint to prefetch
 */
export function usePrefetchOnHover(url: string) {
    const prefetch = () => {
        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch(err => console.error('Prefetch error:', err));
    };

    return {
        onMouseEnter: prefetch,
        onTouchStart: prefetch, // For mobile
    };
}
