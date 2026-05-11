'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MeetingExitPage() {
    const router = useRouter();
    const [message, setMessage] = useState('Leaving meeting...');

    useEffect(() => {
        // Force a top-level redirect to break out of the iframe
        try {
            if (window.top) {
                window.top.location.href = '/';
            } else {
                router.push('/');
            }
        } catch (e) {
            // Fallback if cross-origin access is blocked (shouldn't happen on same origin)
            router.push('/');
        }
    }, [router]);

    return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p>{message}</p>
            </div>
        </div>
    );
}
