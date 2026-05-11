'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useSessionFingerprint } from '@/hooks/useSessionFingerprint';
import { useSessionSSE } from '@/hooks/useSessionSSE';
import { TourProviderWrapper } from '@/components/tour/TourProviderWrapper';

/**
 * Tracks session fingerprint for security
 */
function SessionFingerprintTracker({ children }: { children: React.ReactNode }) {
  useSessionFingerprint();
  return <>{children}</>;
}

/**
 * SSE-based session monitoring - only active when user is authenticated
 * Provides instant session revocation when admin revokes a session
 */
function SessionMonitor({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  // Only monitor if authenticated
  useSessionSSE(status === 'authenticated');

  return <>{children}</>;
}

// Feature flag for the guided tour
const IS_TOUR_ENABLED = false;

export function Providers({ children }: { children: React.ReactNode }) {

  const content = (
    <SessionFingerprintTracker>
      <SessionMonitor>
        {children}
      </SessionMonitor>
    </SessionFingerprintTracker>
  );

  return (
    <SessionProvider>
      <LanguageProvider>
        {IS_TOUR_ENABLED ? (
          <TourProviderWrapper>
            {content}
          </TourProviderWrapper>
        ) : (
          content
        )}
      </LanguageProvider>
    </SessionProvider>
  );
}
