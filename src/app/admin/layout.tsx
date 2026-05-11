'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Video,
    Ticket,
    Mail,
    UserCog,
    Eye,
    Menu,
    X,
    AlertTriangle,
    BarChart,
    Fingerprint,
    Shield,
    Palette,
} from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const sidebarItems = [
        { href: '/admin', label: t('overview'), icon: LayoutDashboard },
        { href: '/admin/analytics', label: t('analytics'), icon: BarChart },
        { href: '/admin/users', label: t('users'), icon: Users },
        { href: '/admin/courses', label: t('courses'), icon: BookOpen },
        { href: '/admin/videos', label: t('videos'), icon: Video },
        { href: '/admin/user-permissions', label: t('userPermissions'), icon: UserCog },
        { href: '/admin/views', label: t('viewsManagement'), icon: Eye },
        { href: '/admin/security-events', label: t('securityEvents'), icon: AlertTriangle },
        { href: '/admin/session-fingerprints', label: t('sessionFingerprints'), icon: Fingerprint },
        { href: '/admin/tickets', label: t('tickets'), icon: Ticket },
        { href: '/admin/whitelist', label: t('emailWhitelist'), icon: Mail },
        { href: '/admin/drm-monitoring', label: t('drmMonitoring'), icon: Shield },
        { href: '/admin/watermark-settings', label: 'Watermark Settings', icon: Palette },
    ];

    // Redirect non-admin users
    if (status === 'loading') {
        return <div className="flex min-h-screen items-center justify-center">{t('loading')}</div>;
    }

    if (!session || session.user?.role !== 'ADMIN') {
        router.push('/');
        return null;
    }

    return (
        <div className="flex min-h-screen">
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-muted/30 border-r hidden md:block">
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-6">{t('adminPanel')}</h2>
                    <nav className="space-y-2">
                        {sidebarItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button variant="ghost" className="w-full justify-start">
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-background border-r z-50 transform transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">{t('adminPanel')}</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <nav className="space-y-2">
                        {sidebarItems.map((item) => (
                            <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-start">
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                {/* Mobile Header with Menu Button */}
                <div className="md:hidden sticky top-0 z-30 bg-background border-b p-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
                {children}
            </main>
        </div>
    );
}
