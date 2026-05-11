'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function SystemNotices() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { language } = useLanguage();

    useEffect(() => {
        if (!searchParams) return;
        const notice = searchParams.get('notice');

        if (notice) {
            // Delay to ensure hydration and Toaster readiness
            const timer = setTimeout(() => {
                if (notice === 'courses_closed') {
                    toast.error(
                        language === 'vi'
                            ? "Tính năng khóa học tạm thời bị đóng. Vui lòng đợi thông báo trên nhóm Zalo."
                            : "Access to courses feature is temporarily closed. Please wait for announcement on Zalo group."
                    );
                } else if (notice === 'meeting_closed') {
                    toast.error(
                        language === 'vi'
                            ? "Tính năng phòng họp tạm thời bị đóng. Vui lòng đợi buổi họp tiếp theo theo lịch trình."
                            : "Access to meeting feature is temporarily closed. Please wait for the next meeting as scheduled."
                    );
                }

                // Clean up URL parameters using Next.js router
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete('notice');
                const queryString = newParams.toString();
                const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

                router.replace(newUrl);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [searchParams, router, pathname, language]);

    return null;
}
