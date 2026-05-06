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
        <div className="academic-page">
            <section className="academic-band">
                <div className="academic-container py-8" data-tour="my-courses">
                    <p className="academic-kicker">Course Registry</p>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">{t('myCourses')}</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('coursesEnrolled')}</p>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                            <LibraryBig className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{courses.length}</span>
                            <span className="text-muted-foreground">available</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="academic-container py-6">
                <div className="mb-6 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm">
                    <BrowserBanner />
                </div>

                {courses.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="pt-6">
                            <EmptyState
                                title={t('noCoursesEnrolled')}
                                description={t('contactAdminForCourses')}
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course, index) => (
                            <CourseCard key={course.id} course={course} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
