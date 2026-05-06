'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import LanguageToggle from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();

    // Don't show back button on homepage
    const showBackButton = pathname !== '/';

    // Hide Navbar on meeting page
    if (pathname === '/meeting') return null;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <div className="container flex h-full items-center justify-between px-4 mx-auto">
                <div className="flex min-w-0 items-center gap-3">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="mr-1"
                            aria-label="Go back"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <Link href="/" className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/20 bg-primary text-primary-foreground">
                            <GraduationCap className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold leading-tight sm:text-base">{t('appTitle')}</span>
                            <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Academic Portal</span>
                        </span>
                    </Link>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <ThemeToggle />
                    <LanguageToggle />
                    <UserMenu />
                </div>
            </div>
        </nav>
    );
}
