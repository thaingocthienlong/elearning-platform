'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { usePrefetch } from '@/hooks/usePrefetch';
import { BookOpen, CalendarDays, LayoutDashboard, LogIn, ShieldCheck } from 'lucide-react';
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
          <div className="design-container grid min-h-[calc(100vh-10rem)] items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-7 flex flex-col items-center gap-5 lg:items-start">
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
              <p className="design-lead max-w-xl">{t('portalLead')}</p>
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
            <div className="relative min-h-[360px] overflow-hidden rounded-none bg-[#f5f5f7] sm:min-h-[520px]">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80')" }}
              />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/85 p-6 backdrop-blur-md sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[21px] font-semibold leading-tight">{t('portalMediaTitle')}</h2>
                    <p className="mt-2 max-w-lg text-[17px] leading-[1.47] text-muted-foreground">{t('portalMediaBody')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
