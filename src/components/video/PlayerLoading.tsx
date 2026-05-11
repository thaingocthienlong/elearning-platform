'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function PlayerLoading() {
    const { t } = useLanguage();

    return (
        <div className="w-full aspect-video bg-black animate-pulse flex items-center justify-center text-white/50">
            {t('loadingPlayer')}
        </div>
    );
}
