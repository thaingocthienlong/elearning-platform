'use client';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldAlert } from 'lucide-react';

interface IPRConsentOverlayProps {
    onAccept: () => void;
}

export default function IPRConsentOverlay({ onAccept }: IPRConsentOverlayProps) {
    const { t } = useLanguage();

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black p-4 text-center text-white md:p-6">
            <div className="my-auto flex w-full flex-col items-center">
                <div className="mb-2 rounded-full bg-red-500/10 p-3 md:mb-6">
                    <ShieldAlert className="h-8 w-8 text-red-500 md:h-12 md:w-12" />
                </div>
                <h2 className="mb-1 text-base font-bold uppercase tracking-wider leading-none text-red-500 md:mb-4 md:text-xl">
                    {t('iprWarning')}
                </h2>
                <p className="mb-4 max-w-md text-xs leading-tight text-gray-400 md:mb-8 md:text-base">
                    {t('iprWarning')}
                </p>
                <Button
                    onClick={onAccept}
                    variant="destructive"
                    size="sm"
                    className="font-semibold md:h-10 md:px-4 md:py-2 md:text-base"
                >
                    {t('iAgree')}
                </Button>
            </div>
        </div>
    );
}
