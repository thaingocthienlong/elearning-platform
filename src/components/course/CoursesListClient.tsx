'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import BrowserBanner from '@/components/BrowserBanner';
import CourseCard from '@/components/course/CourseCard';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { LibraryBig } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    thumbnail: string | null;
}

interface CoursesListClientProps {
    courses: Course[];
}

export default function CoursesListClient({ courses }: CoursesListClientProps) {
    const { t } = useLanguage();

    return (
        <div className="design-page">
            <section className="design-tile-parchment">
                <div className="design-container" data-tour="my-courses">
                    <p className="text-[17px] text-muted-foreground">{t('courseRegistry')}</p>
                    <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="design-heading">{t('myCourses')}</h1>
                            <p className="mt-3 max-w-2xl text-[17px] leading-[1.47] text-muted-foreground">{t('coursesEnrolled')}</p>
                        </div>
                        <div className="flex min-h-11 items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-[17px]">
                            <LibraryBig className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{courses.length}</span>
                            <span className="text-muted-foreground">{t('available')}</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="design-container py-8">
                <div className="mb-8 rounded-[18px] border border-border bg-card p-4 text-[15px]">
                    <BrowserBanner />
                </div>

                {courses.length === 0 ? (
                    <Card className="rounded-[18px] border-dashed shadow-none">
                        <CardContent className="pt-6">
                            <EmptyState
                                title={t('noCoursesEnrolled')}
                                description={t('contactAdminForCourses')}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course, index) => (
                            <CourseCard key={course.id} course={course} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
