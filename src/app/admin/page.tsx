'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import ViewsChart from '@/components/admin/ViewsChart';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
    const { t } = useLanguage();
    const [stats, setStats] = useState({ videoCount: 0, courseCount: 0, userCount: 0 });
    const [systemMode, setSystemMode] = useState<'courses' | 'meeting'>('courses');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, configRes] = await Promise.all([
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/config/mode')
                ]);

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
                if (configRes.ok) {
                    const data = await configRes.json();
                    setSystemMode(data.mode);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const toggleSystemMode = async () => {
        const newMode = systemMode === 'courses' ? 'meeting' : 'courses';
        try {
            const res = await fetch('/api/admin/config/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: newMode })
            });
            if (res.ok) {
                setSystemMode(newMode);
            }
        } catch (error) {
            console.error('Failed to update system mode:', error);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-10">
                <p>{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8">{t('adminDashboard')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* System Mode Control */}
                <Card className="col-span-1 md:col-span-3 bg-slate-50 dark:bg-slate-900 border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">System Operation Mode</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${systemMode === 'courses' ? 'text-blue-600' : 'text-gray-500'}`}>Courses</span>
                            <Switch
                                checked={systemMode === 'meeting'}
                                onCheckedChange={toggleSystemMode}
                            />
                            <span className={`text-sm font-bold ${systemMode === 'meeting' ? 'text-green-600' : 'text-gray-500'}`}>Meeting</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-gray-500">
                            {systemMode === 'courses'
                                ? 'Standard operation: Courses are active. Meeting access is restricted.'
                                : 'Meeting operation: Directing all users to Zoom. Course access is restricted.'}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalVideos')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.videoCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalCourses')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.courseCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.userCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Views Analytics Chart */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>{t('videoViewsLast30Days')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ViewsChart />
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Link href="/admin/upload">
                    <Button>{t('uploadNewVideo')}</Button>
                </Link>
                <Link href="/admin/courses">
                    <Button variant="outline">{t('manageCourses')}</Button>
                </Link>
            </div>
        </div>
    );
}
