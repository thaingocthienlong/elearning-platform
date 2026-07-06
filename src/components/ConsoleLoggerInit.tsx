'use client';

import { useEffect } from 'react';
import { initializeConsoleLogger } from '@/lib/console-logger';

export function ConsoleLoggerInit() {
    useEffect(() => {
        // Initialize console logger on client side
        if (typeof window !== 'undefined') {
            initializeConsoleLogger();
            console.log(
                `[app-version] version=${process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown'} sha=${(process.env.NEXT_PUBLIC_APP_BUILD_SHA ?? 'local').slice(0, 12)}`
            );
        }
    }, []);

    return null; // This component doesn't render anything
}
