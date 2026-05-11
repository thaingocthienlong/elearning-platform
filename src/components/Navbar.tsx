'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
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
                    <Link href="/" className="flex min-w-0 items-center" aria-label="Viện Phương Nam">
                        <Image
                            src="https://i.ibb.co/twbq42gB/Logo-VPN.png"
                            alt="Viện Phương Nam"
                            width={44}
                            height={44}
                            className="h-11 w-11 object-contain"
                            priority
                        />
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
