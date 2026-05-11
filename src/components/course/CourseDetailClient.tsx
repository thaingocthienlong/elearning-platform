'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle2, Lock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import BrowserBanner from '@/components/BrowserBanner';

interface Video {
    id: string;
    title: string;
}

interface CourseDetailClientProps {
    course: {
        id: string;
        title: string;
        accessType?: string; // Add accessType
        Video: Video[];
    };
    isEnrolled: boolean;
}

export default function CourseDetailClient({ course, isEnrolled }: CourseDetailClientProps) {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const isCourseOpen = course.accessType === 'OPEN';
    const canWatch = isEnrolled || isCourseOpen;

    return (
        <div className="design-page">
            <section className="design-tile-parchment">
                <div className="design-container max-w-6xl">
                    <p className="text-[17px] text-muted-foreground">{t('courseOutline')}</p>
                    <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-3xl">
                            <h1 className="design-heading">{course.title}</h1>
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground">
                                <span>{t('videosCount', { count: course.Video.length })}</span>
                                {isCourseOpen && <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">{t('openAccess')}</Badge>}
                                {isEnrolled && <Badge variant="secondary" className="rounded-full">{t('enrolled')}</Badge>}
                            </div>
                        </div>
                        {!canWatch && (
                            <div className="rounded-[18px] border border-border bg-white p-5 text-[15px] text-muted-foreground">
                                {t('contactAdminForCourses')}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <div className="design-container max-w-6xl py-8">
                <div className="mb-8 rounded-[18px] border border-border bg-white p-4 text-[15px]">
                    <BrowserBanner />
                </div>

                <div className="grid gap-4">
                    {course.Video.map((video, index) => (
                        <Card
                            key={video.id}
                            className="group flex flex-col gap-4 rounded-[18px] border-border bg-white p-5 shadow-none transition-colors animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards hover:border-primary/50 sm:flex-row sm:items-center"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-[#f5f5f7] text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                    {canWatch ? <BookOpen className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] text-muted-foreground">{t('lesson')} {index + 1}</p>
                                    <h3 className="truncate text-[17px] font-semibold leading-[1.24]">{video.title}</h3>
                                </div>
                            </div>
                            <div className="flex-shrink-0 sm:ml-4">
                                {canWatch ? (
                                    <Link href={`/watch/${video.id}`}>
                                        <Button
                                            id={index === 0 ? "tour-watch-btn" : undefined}
                                            variant="secondary"
                                            className="w-full sm:w-auto"
                                            onClick={() => setIsLoading(video.id)}
                                            disabled={isLoading === video.id}
                                        >
                                            {isLoading === video.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            ) : (
                                                <PlayCircle className="h-4 w-4" />
                                            )}
                                            {isLoading === video.id ? t('loading') : t('watch')}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button variant="ghost" disabled className="w-full sm:w-auto">
                                        <Lock className="h-4 w-4" />
                                        {t('locked')}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                    {course.Video.length === 0 && (
                        <div className="flex items-center gap-3 rounded-[18px] border border-border bg-white p-5 text-[15px] text-muted-foreground">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            {t('courseMaterialsUnavailable')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
