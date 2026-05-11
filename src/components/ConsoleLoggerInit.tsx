'use client';

import { useEffect } from 'react';
import { initializeConsoleLogger } from '@/lib/console-logger';

export function ConsoleLoggerInit() {
    useEffect(() => {
        // Initialize console logger on client side
        if (typeof window !== 'undefined') {
            initializeConsoleLogger();
        }
    }, []);

    return null; // This component doesn't render anything
}
