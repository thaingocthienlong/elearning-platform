'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MeetingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [iframeSrc, setIframeSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Refs to prevent re-initialization on tab switch
    const hasInitialized = useRef(false);
    const initialUserEmail = useRef<string | null>(null);

    // Session validation effect - detect user changes and require auth
    useEffect(() => {
        if (status === 'loading') return;

        // Require authentication
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        // After initialization, check if user changed
        if (hasInitialized.current && initialUserEmail.current) {
            const currentEmail = session?.user?.email;
            if (currentEmail && currentEmail !== initialUserEmail.current) {
                // User changed - force redirect to login
                console.warn('Session user changed, redirecting to login');
                router.push('/login?reason=session_changed');
            }
        }
    }, [session, status, router]);

    // Meeting initialization effect - runs only once
    useEffect(() => {
        // Wait for session to be determined
        if (status === 'loading') return;

        // Require authentication
        if (status === 'unauthenticated') return;

        // Skip if already initialized (prevents rejoin on tab switch)
        if (hasInitialized.current) return;

        const initMeeting = async () => {
            const email = session?.user?.email || '';
            const name = session?.user?.name || (email ? email.split('@')[0] : 'Guest');

            try {
                // Mark as initialized and store initial user
                hasInitialized.current = true;
                initialUserEmail.current = email || null;

                // Get Signature and Watermark Text from API
                const res = await fetch('/api/zoom/signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                if (!res.ok) throw new Error("Meeting is unavailable");
                const {
                    signature,
                    sdkKey,
                    meetingNumber,
                    passcode,
                    watermarkText,
                    zoomWatermarkColor,
                    zoomWatermarkOpacity,
                    zoomWatermarkSizePercent,
                } = await res.json();

                // Construct Iframe URL with all necessary params
                const params = new URLSearchParams({
                    mn: meetingNumber,
                    pwd: passcode || '',
                    signature: signature,
                    sdkKey: sdkKey,
                    userName: name,
                    email: email,
                    watermarkText: watermarkText,
                    wmColor: zoomWatermarkColor || '#FFFFFF',
                    wmOpacity: String(zoomWatermarkOpacity ?? 0.2),
                    wmSize: String(zoomWatermarkSizePercent ?? 2.5),
                });

                setIframeSrc(`/zoom-meeting.html?${params.toString()}`);

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Meeting is unavailable');
            }
        };

        initMeeting();
    }, [status]); // Only depend on status, not session - prevents rejoin on tab switch

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="text-red-500 font-bold p-4 bg-white/10 rounded">
                    Error: {error}
                </div>
            </div>
        );
    }

    if (!iframeSrc) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Preparing Secure Meeting Environment...</p>
                </div>
            </div>
        );
    }

    // Render Isolated Iframe
    return (
        <div className="fixed inset-0 bg-black overflow-hidden z-[100]">
            <iframe
                src={iframeSrc}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-none"
                title="Zoom Meeting"
            />
        </div>
    );
}
