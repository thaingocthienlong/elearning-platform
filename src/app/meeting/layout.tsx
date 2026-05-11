import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'Zoom Meeting',
    description: 'Secure Video Meeting',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Critical for Zoom Mobile
    themeColor: '#000000',
};

export default function MeetingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
