'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Bug } from 'lucide-react';

// Dynamic Imports for Charts
const TopErrorsChart = dynamic(() => import('@/components/admin/analytics/TopErrorsChart'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-muted/10 animate-pulse rounded-md flex items-center justify-center">Loading Chart...</div>
});

const ErrorTrendsChart = dynamic(() => import('@/components/admin/analytics/ErrorTrendsChart'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted/10 animate-pulse rounded-md flex items-center justify-center">Loading Chart...</div>
});

const DemographicsCharts = dynamic(() => import('@/components/admin/analytics/DemographicsCharts'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted/10 animate-pulse rounded-md flex items-center justify-center">Loading Charts...</div>
});

interface AnalyticsData {
    topErrors: { message: string; count: number }[];
    browserBreakdown: { browser: string; count: number }[];
    osBreakdown: { os: string; count: number }[];
    errorTrends: { date: string; count: number }[];
    totalTickets: number;
    totalErrors: number;
}

export default function ErrorAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/error-analytics');
            if (response.ok) {
                const analyticsData = await response.json();
                setData(analyticsData);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-lg">Loading analytics...</div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6">
                <div className="text-center text-muted-foreground">
                    No analytics data available
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Error Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Console log insights from user-submitted tickets
                </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets with Logs</CardTitle>
                        <Bug className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalTickets}</div>
                        <p className="text-xs text-muted-foreground">
                            Tickets containing console logs
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Errors Logged</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.totalErrors}</div>
                        <p className="text-xs text-muted-foreground">
                            Error-level console messages
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Error Types</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.topErrors.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Distinct error messages
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Errors */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Common Errors</CardTitle>
                    <CardDescription>
                        Top 10 error messages by occurrence frequency
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TopErrorsChart data={data?.topErrors || []} />
                </CardContent>
            </Card>

            {/* Error Trends Over Time */}
            <Card>
                <CardHeader>
                    <CardTitle>Error Trends Over Time</CardTitle>
                    <CardDescription>
                        Daily error count from submitted tickets
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ErrorTrendsChart data={data?.errorTrends || []} />
                </CardContent>
            </Card>

            {/* Browser and OS Breakdown */}
            <DemographicsCharts browserData={data?.browserBreakdown || []} osData={data?.osBreakdown || []} />
        </div>
    );
}
