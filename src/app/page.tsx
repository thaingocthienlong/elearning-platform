'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { usePrefetch } from '@/hooks/usePrefetch';
import { BookOpen, CalendarDays, LayoutDashboard, LogIn } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const isAdmin = session?.user?.role === 'ADMIN';

  // Prefetch courses data immediately when user is logged in
  usePrefetch('/api/prefetch/courses', !!session);

  useEffect(() => {
    console.info('Thông báo sẵn sàng: Nền tảng sử dụng Google OAuth, phát video bảo mật bằng DRM và hỗ trợ qua hệ thống ticket.');
  }, []);

  return (
    <div className="design-page">
      <main>
        <section className="design-tile-light min-h-[calc(100vh-2.75rem)] overflow-hidden">
          <div className="design-container flex min-h-[calc(100vh-10rem)] items-center justify-center">
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <div className="mb-7 flex flex-col items-center gap-5">
                <Image
                  src="https://i.ibb.co/twbq42gB/Logo-VPN.png"
                  alt="Viện Phương Nam"
                  width={144}
                  height={144}
                  className="h-28 w-28 object-contain sm:h-36 sm:w-36"
                  priority
                />
                <h1 className="design-display text-foreground">
                  VIỆN PHƯƠNG NAM
                </h1>
              </div>
              <div className="mt-8 flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center">
                {status === 'loading'
                  ? <div className="h-11 w-40 animate-pulse rounded-full bg-muted" />
                  : session
                    ? (
                      <>
                        <Link href="/courses" id="tour-my-courses">
                          <Button size="lg" className="w-full sm:w-auto">
                            <BookOpen className="h-4 w-4" />
                            {t('myCourses')}
                          </Button>
                        </Link>
                        <a href="/meeting">
                          <Button variant="outline" size="lg" className="w-full sm:w-auto">
                            <CalendarDays className="h-4 w-4" />
                            {t('joinZoom')}
                          </Button>
                        </a>
                        {isAdmin && (
                          <Link href="/admin">
                            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                              <LayoutDashboard className="h-4 w-4" />
                              {t('adminDashboard')}
                            </Button>
                          </Link>
                        )}
                      </>
                    )
                    : (
                      <Link href="/auth/signin" className="animate-in fade-in duration-500" id="tour-sign-in">
                        <Button size="lg">
                          <LogIn className="h-4 w-4" />
                          {t('signIn')}
                        </Button>
                      </Link>
                    )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
