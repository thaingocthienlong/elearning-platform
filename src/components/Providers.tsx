'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isMeetingPath = pathname?.startsWith('/meeting') ?? false;

  // Only monitor if authenticated
  useSessionSSE(status === 'authenticated', isMeetingPath ? 15000 : 300000);

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
