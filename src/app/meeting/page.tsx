'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Video } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MeetingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useLanguage();
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

                if (!res.ok) throw new Error(t('meetingUnavailable'));
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
                setError(err.message || t('meetingUnavailable'));
            }
        };

        initMeeting();
    }, [status, session?.user?.email, session?.user?.name, t]);

    if (status === 'loading') {
        return (
            <div className="design-page flex items-center justify-center bg-[#f5f5f7] p-6">
                <div className="w-full max-w-md rounded-[18px] border border-border bg-white p-6 text-center shadow-none">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <h1 className="mt-4 text-[21px] font-semibold">{t('loadingMeetingAccess')}</h1>
                    <p className="mt-2 text-[15px] text-muted-foreground">{t('checkingMeetingSession')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="design-page flex items-center justify-center bg-[#f5f5f7] p-6">
                <div className="w-full max-w-md rounded-[18px] border border-border bg-white p-6 text-center shadow-none">
                    <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                    <h1 className="mt-4 text-[21px] font-semibold">{t('meetingUnavailable')}</h1>
                    <p className="mt-2 text-[15px] text-muted-foreground">{error}</p>
                    <Button className="mt-5" onClick={() => router.push('/')}>{t('returnToPortal')}</Button>
                </div>
            </div>
        );
    }

    if (!iframeSrc) {
        return (
            <div className="design-page flex items-center justify-center bg-[#f5f5f7] p-6">
                <div className="w-full max-w-md rounded-[18px] border border-border bg-white p-6 text-center shadow-none">
                    <Video className="mx-auto h-8 w-8 text-primary" />
                    <h1 className="mt-4 text-[21px] font-semibold">{t('preparingMeetingRoom')}</h1>
                    <p className="mt-2 text-[15px] text-muted-foreground">{t('generatingZoomSignature')}</p>
                    <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-muted-foreground" />
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
