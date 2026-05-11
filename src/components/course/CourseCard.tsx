'use client';

import { useState } from 'react';

import { usePrefetchOnHover } from '@/hooks/usePrefetch';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowRight, BookMarked } from 'lucide-react';

interface CourseCardProps {
    course: {
        id: string;
        title: string;
        thumbnail: string | null;
    };
    index: number;
}

export default function CourseCard({ course, index }: CourseCardProps) {
    const { t } = useLanguage();
    // Prefetch course details on hover
    const prefetchProps = usePrefetchOnHover(`/api/prefetch/course/${course.id}`);

    const [isLoading, setIsLoading] = useState(false);

    return (
        <div
            {...prefetchProps}
            className="group flex min-h-[360px] flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-none transition-colors duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards hover:border-primary/50"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className="relative overflow-hidden bg-[#f5f5f7] dark:bg-[#15171a] aspect-video">
                {course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <BookMarked className="h-10 w-10 text-primary/45" />
                        <span className="sr-only">{t('noThumbnail')}</span>
                    </div>
                )}
            </div>

            <div className="flex h-full flex-1 flex-col gap-5 p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-[#f5f5f7] text-sm font-semibold text-foreground dark:bg-[#15171a]">
                        {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-normal text-muted-foreground">{t('instituteCourse')}</p>
                        <h3 className="mt-2 line-clamp-2 text-[21px] font-semibold leading-[1.19] transition-colors group-hover:text-primary">
                            {course.title}
                        </h3>
                    </div>
                </div>

                <div className="mt-auto">
                    <Link href={`/courses/${course.id}`} className="block" onClick={() => setIsLoading(true)}>
                        <Button
                            data-tour={index === 0 ? "view-course-btn" : undefined}
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    {t('loading')}
                                </>
                            ) : (
                                <>
                                    {t('viewCourse')}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
