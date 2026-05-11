'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Video,
  Eye,
  TrendingUp,
  Activity,
  PlayCircle,
  BookOpen,
  UserCheck
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    publishedCourses: number;
    totalVideos: number;
    publishedVideos: number;
    totalViews: number;
    totalEnrollments: number;
  };
  popularVideos: Array<{
    id: string;
    title: string;
    courseTitle: string;
    viewCount: number;
    uniqueViewers: number;
  }>;
  popularCourses: Array<{
    id: string;
    title: string;
    enrollmentCount: number;
    videoCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    userName: string;
    userEmail: string;
    videoTitle: string;
    lastViewedAt: string;
    viewCount: number;
  }>;
  topViewers: Array<{
    id: string;
    name: string | null;
    email: string;
    totalViews: number;
    uniqueVideos: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
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
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Platform performance metrics and user activity insights
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrollments
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.publishedCourses} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Videos
            </CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalVideos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.publishedVideos} published
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Video Views
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{data.overview.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative view count across all videos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Videos & Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Popular Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Watched Videos
            </CardTitle>
            <CardDescription>Top 10 videos by view count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Viewers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.popularVideos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No video views yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.popularVideos.map((video, index) => (
                      <TableRow key={video.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{video.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {video.courseTitle}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {video.viewCount}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {video.uniqueViewers}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Popular Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Most Popular Courses
            </CardTitle>
            <CardDescription>Top 10 courses by enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.popularCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No courses yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.popularCourses.map((course, index) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <p className="font-medium">{course.title}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {course.enrollmentCount}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {course.videoCount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Viewers & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Viewers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Viewers
            </CardTitle>
            <CardDescription>Most active users by total views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Total Views</TableHead>
                    <TableHead className="text-right">Videos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topViewers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No viewer data yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.topViewers.map((viewer, index) => (
                      <TableRow key={viewer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{viewer.name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{viewer.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {viewer.totalViews}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {viewer.uniqueVideos}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest video views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{activity.userName}</p>
                            <p className="text-xs text-muted-foreground">{activity.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-[200px] truncate">{activity.videoTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.viewCount} {activity.viewCount === 1 ? 'view' : 'views'}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(activity.lastViewedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
