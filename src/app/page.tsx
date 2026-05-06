'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefetch } from '@/hooks/usePrefetch';
import BrowserBanner from '@/components/BrowserBanner';
import { BookOpen, CalendarDays, LayoutDashboard, LogIn, ShieldCheck } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();
  const isAdmin = session?.user?.role === 'ADMIN';

  // Prefetch courses data immediately when user is logged in
  usePrefetch('/api/prefetch/courses', !!session);

  return (
    <div className="academic-page">
      <main className="academic-container py-8 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <div className="academic-panel flex min-h-[420px] flex-col justify-between overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4 sm:px-8">
              <p className="academic-kicker">Institute Learning Portal</p>
            </div>
            <div className="space-y-6 px-5 py-8 sm:px-8">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {t('appTitle')}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {t('appDescription')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-secondary/50 p-4">
                  <BookOpen className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Course access</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Review enrolled and open institute content.</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-secondary/50 p-4">
                  <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Secure playback</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">DRM, watermarking, and session controls stay active.</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-secondary/50 p-4">
                  <CalendarDays className="mb-3 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Live sessions</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Join scheduled Zoom learning rooms.</p>
                </div>
              </div>
            </div>
            <div className="border-t border-border/70 bg-muted/40 px-5 py-4 sm:px-8">
              <div className="flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center">
                {status === 'loading' ? (
                  <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
                ) : session ? (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-500 sm:flex-row">
                    <Link href="/courses" id="tour-my-courses">
                      <Button size="lg" className="w-full sm:w-auto">
                        <BookOpen className="h-4 w-4" />
                        {t('myCourses')}
                      </Button>
                    </Link>
                    <a href="/meeting">
                      <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                        <CalendarDays className="h-4 w-4" />
                        {t('joinZoom')}
                      </Button>
                    </a>
                    {isAdmin && (
                      <Link href="/admin">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto">
                          <LayoutDashboard className="h-4 w-4" />
                          {t('adminDashboard')}
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
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

          <aside className="academic-panel overflow-hidden">
            <div className="border-b border-border/70 px-5 py-4">
              <p className="academic-kicker">Readiness Notice</p>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
                <BrowserBanner />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Maintainer baseline</p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between border-b border-border/60 py-2">
                    <span>Authentication</span>
                    <span className="font-medium text-primary">Google OAuth</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 py-2">
                    <span>Playback</span>
                    <span className="font-medium text-primary">DRM protected</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Support</span>
                    <span className="font-medium text-primary">Ticketed</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
