'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { usePrefetch } from '@/hooks/usePrefetch';
import { BookOpen, CalendarDays, LayoutDashboard, LogIn } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  // Prefetch courses data immediately when user is logged in
  usePrefetch('/api/prefetch/courses', !!session);

  useEffect(() => {
    console.info('Thông báo sẵn sàng: Nền tảng sử dụng Google OAuth, phát video bảo mật bằng DRM và hỗ trợ qua hệ thống ticket.');
  }, []);

  return (
    <div className="academic-page">
      <main className="academic-container py-8 sm:py-12">
        <section className="grid gap-6 lg:items-stretch">
          <div className="academic-panel flex min-h-[420px] flex-col justify-between overflow-hidden">
            <div className="space-y-6 px-5 py-8 sm:px-8">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Nền Tảng Học Trực Tuyến Viện Phương Nam
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Truy cập khóa học, xem video bảo mật và tham gia các buổi học trực tuyến trong một hệ thống dành cho học viên đã được cấp quyền.
                </p>
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
                        Khóa học của tôi
                      </Button>
                    </Link>
                    <a href="/meeting">
                      <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                        <CalendarDays className="h-4 w-4" />
                        Vào lớp Zoom
                      </Button>
                    </a>
                    {isAdmin && (
                      <Link href="/admin">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto">
                          <LayoutDashboard className="h-4 w-4" />
                          Bảng quản trị
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link href="/auth/signin" className="animate-in fade-in duration-500" id="tour-sign-in">
                    <Button size="lg">
                      <LogIn className="h-4 w-4" />
                      Đăng nhập
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
