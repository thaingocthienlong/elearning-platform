'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BrowserBanner() {
    const { t } = useLanguage();
    const [messageKey, setMessageKey] = useState<string>('browserRecommendation');

    useEffect(() => {
        // Simple client-side detection
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);
        const isMac = /Mac OS/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
        const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);

        if (isIOS) {
            setMessageKey('browserRecommendationIOS');
        } else if (isMac && isSafari) {
            setMessageKey('browserRecommendationMac');
        } else {
            setMessageKey('browserRecommendation');
        }
    }, []);

    return (
        <div className="flex items-center justify-center gap-2">
            <Info className="h-4 w-4" />
            <span>{t(messageKey as any)}</span>
        </div>
    );
}
