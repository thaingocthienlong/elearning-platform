'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Home } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import LanguageToggle from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    // Don't show back button on homepage
    const showBackButton = pathname !== '/';

    // Hide Navbar on meeting page
    if (pathname === '/meeting') return null;

    return (
        <nav className="fixed left-0 right-0 top-0 z-50 h-11 bg-black text-white">
            <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    {showBackButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="mr-1 size-8 text-white hover:bg-white/10 hover:text-white"
                            aria-label="Go back"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <Link href="/" className="flex min-w-0 items-center gap-2 text-xs text-white/90" aria-label="Viện Phương Nam">
                        <Image
                            src="https://i.ibb.co/twbq42gB/Logo-VPN.png"
                            alt="Viện Phương Nam"
                            width={28}
                            height={28}
                            className="h-7 w-7 object-contain"
                            priority
                        />
                        {!showBackButton && <span className="hidden sm:inline">Viện Phương Nam</span>}
                        {showBackButton && <Home className="hidden h-3.5 w-3.5 sm:block" />}
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
