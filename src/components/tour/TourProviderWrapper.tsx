'use client';

import { NextStepProvider, NextStep, useNextStep } from 'nextstepjs';
import { useNextAdapter } from 'nextstepjs/adapters/next';
import { tourSteps } from './TourRegistry';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const TourInitializer = () => {
    const { startNextStep } = useNextStep();
    const { status } = useSession();

    useEffect(() => {
        console.log("[TourDebug] Status:", status);
        if (status === 'loading') return;

        const hasSeenTour = localStorage.getItem('hasSeenTour');
        console.log("[TourDebug] hasSeenTour:", hasSeenTour);

        if (!hasSeenTour) {
            // Wait briefly for hydration
            setTimeout(() => {
                console.log("[TourDebug] Starting 'onboarding' tour");
                startNextStep('onboarding');
            }, 1000);
        }
    }, [status, startNextStep]);

    return null;
}

export function TourProviderWrapper({ children }: { children: React.ReactNode }) {
    const handleComplete = () => {
        localStorage.setItem('hasSeenTour', 'true');
    }

    return (
        <NextStepProvider>
            <NextStep
                steps={tourSteps}
                onComplete={handleComplete}
                onSkip={handleComplete}
                navigationAdapter={useNextAdapter}
            >
                {children}
            </NextStep>
            <TourInitializer />
        </NextStepProvider>
    );
}
