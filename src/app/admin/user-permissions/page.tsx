'use client';

import { useState, useEffect } from 'react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { useAdminFilters } from '@/hooks/admin/useAdminFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Save, Loader2, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface User {
    id: string;
    name: string | null;
    email: string;
}

interface Course {
    id: string;
    title: string;
    accessType: 'OPEN' | 'VERIFY';
    _count?: {
        Enrollment: number;
    };
}

interface Video {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
}

interface UserPermissions {
    enrolledCourses: string[];
    accessibleVideos: string[];
}

export default function UserPermissionsPage() {
    // Shared hooks for Users data
    const {
        data: users,
        loading: usersLoading,
        refetch: fetchUsers
    } = useAdminData<User>({
        endpoint: '/api/admin/users'
    });

    const {
        searchQuery: userSearch,
        setSearchQuery: setUserSearch,
        filteredData: filteredUsers
    } = useAdminFilters(users, ['name', 'email']);

    const [courses, setCourses] = useState<Course[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions>({
        enrolledCourses: [],
        accessibleVideos: [],
    });
    // Track pending changes for all users
    const [pendingChanges, setPendingChanges] = useState<Map<string, UserPermissions>>(new Map());
    // const [userSearch, setUserSearch] = useState(''); // Replaced by hook
    const [coursesLoading, setCoursesLoading] = useState(true); // Separate loading for aux data
    const [saving, setSaving] = useState(false);

    const loading = usersLoading || coursesLoading;

    // Bulk Enroll State
    const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
    const [bulkEnrollCourse, setBulkEnrollCourse] = useState('');
    const [bulkAction, setBulkAction] = useState<'ENROLL_ONLY' | 'SYNC_VIDEO_ACCESS'>('ENROLL_ONLY');
    const [enrolling, setEnrolling] = useState(false);



    useEffect(() => {
        if (selectedUser) {
            // Check if there are pending changes for this user
            const pending = pendingChanges.get(selectedUser.id);
            if (pending) {
                // Load pending changes
                setPermissions(pending);
            } else {
                // Fetch fresh permissions from database
                fetchUserPermissions(selectedUser.id);
            }
        }
    }, [selectedUser?.id]); // Only depend on ID to avoid infinite loops

    useEffect(() => {
        fetchAuxData();
    }, []);

    const fetchAuxData = async () => {
        try {
            const [coursesRes, videosRes] = await Promise.all([
                fetch('/api/admin/courses'),
                fetch('/api/admin/videos/all'),
            ]);

            if (coursesRes.ok && videosRes.ok) {
                const coursesData = await coursesRes.json();
                const videosData = await videosRes.json();

                setCourses(coursesData);
                setVideos(videosData);
            }
        } catch (error) {
            console.error('Failed to fetch auxiliary data:', error);
        } finally {
            setCoursesLoading(false);
        }
    };

    const fetchUserPermissions = async (userId: string) => {
        try {
            // Fetch enrollments
            const enrollmentsRes = await fetch(`/api/admin/user-permissions?userId=${userId}`);
            if (enrollmentsRes.ok) {
                const data = await enrollmentsRes.json();
                const newPermissions = {
                    enrolledCourses: data.enrollments,
                    accessibleVideos: data.videoAccess,
                };
                setPermissions(newPermissions);
            }
        } catch (error) {
            console.error('Failed to fetch user permissions:', error);
        }
    };

    const handleToggleAccess = async (courseId: string, currentStatus: 'OPEN' | 'VERIFY') => {
        const newStatus = currentStatus === 'OPEN' ? 'VERIFY' : 'OPEN';

        // Optimistic UI Update
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, accessType: newStatus } : c));

        try {
            const res = await fetch(`/api/admin/courses/${courseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessType: newStatus }),
            });

            if (!res.ok) throw new Error('Failed to update');
            toast.success(`Course set to ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update course status');
            // Revert on error
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, accessType: currentStatus } : c));
        }
    };

    const toggleCourse = (courseId: string) => {
        setPermissions((prev) => {
            const isEnrolling = !prev.enrolledCourses.includes(courseId);

            let newPermissions;
            if (isEnrolling) {
                // Adding enrollment
                newPermissions = {
                    ...prev,
                    enrolledCourses: [...prev.enrolledCourses, courseId],
                };
            } else {
                // Removing enrollment - also remove video access for videos in this course
                const videosInCourse = videos
                    .filter((v) => v.courseId === courseId)
                    .map((v) => v.id);

                newPermissions = {
                    ...prev,
                    enrolledCourses: prev.enrolledCourses.filter((id) => id !== courseId),
                    accessibleVideos: prev.accessibleVideos.filter(
                        (videoId) => !videosInCourse.includes(videoId)
                    ),
                };
            }

            // Mark as pending change
            if (selectedUser) {
                setPendingChanges((prevChanges) => {
                    const newChanges = new Map(prevChanges);
                    newChanges.set(selectedUser.id, newPermissions);
                    return newChanges;
                });
            }

            return newPermissions;
        });
    };

    const toggleVideo = (videoId: string) => {
        setPermissions((prev) => {
            const newPermissions = {
                ...prev,
                accessibleVideos: prev.accessibleVideos.includes(videoId)
                    ? prev.accessibleVideos.filter((id) => id !== videoId)
                    : [...prev.accessibleVideos, videoId],
            };

            // Mark as pending change
            if (selectedUser) {
                setPendingChanges((prevChanges) => {
                    const newChanges = new Map(prevChanges);
                    newChanges.set(selectedUser.id, newPermissions);
                    return newChanges;
                });
            }

            return newPermissions;
        });
    };

    const handleSavePermissions = async () => {
        if (pendingChanges.size === 0) {
            toast.info('No changes to save');
            return;
        }

        setSaving(true);
        try {
            let totalEnrollmentsCreated = 0;
            let totalEnrollmentsDeleted = 0;
            let totalVideoAccessCreated = 0;
            let totalVideoAccessDeleted = 0;
            let successCount = 0;

            // Save all pending changes
            for (const [userId, userPermissions] of pendingChanges.entries()) {
                const response = await fetch('/api/admin/user-permissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        enrollments: userPermissions.enrolledCourses,
                        videoAccess: userPermissions.accessibleVideos,
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    totalEnrollmentsCreated += result.enrollmentsCreated;
                    totalEnrollmentsDeleted += result.enrollmentsDeleted;
                    totalVideoAccessCreated += result.videoAccessCreated;
                    totalVideoAccessDeleted += result.videoAccessDeleted;
                    successCount++;
                } else {
                    const error = await response.text();
                    const user = users.find(u => u.id === userId);
                    toast.error(`Failed to update ${user?.name || user?.email}: ${error}`);
                }
            }

            if (successCount > 0) {
                toast.success(
                    `Successfully updated ${successCount} user${successCount > 1 ? 's' : ''}!\n` +
                    `Enrollments: ${totalEnrollmentsCreated} added, ${totalEnrollmentsDeleted} removed\n` +
                    `Video Access: ${totalVideoAccessCreated} added, ${totalVideoAccessDeleted} removed`
                );

                // Clear pending changes after successful save
                setPendingChanges(new Map());
            }
        } catch (error) {
            console.error('Failed to save permissions:', error);
            toast.error('Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkEnroll = async () => {
        if (!bulkEnrollCourse) return;

        setEnrolling(true);
        try {
            // Client-side chunking to prevent Serverless Function Timeouts
            const CHUNK_SIZE = 50; // Process 50 users per request
            const userChunks = [];

            // 1. Prepare chunks
            for (let i = 0; i < users.length; i += CHUNK_SIZE) {
                userChunks.push(users.slice(i, i + CHUNK_SIZE));
            }

            let totalEnrolled = 0;
            let totalAccessGranted = 0;
            let processedUsers = 0;

            // 2. Process each chunk sequentially
            for (let i = 0; i < userChunks.length; i++) {
                const chunk = userChunks[i];
                const chunkUserIds = chunk.map(u => u.id);

                // Update UI state if you want strictly granular progress, or just rely on 'enrolling' state text update
                // For now, we'll rely on the button text update below via state if we added one, but 'enrolling' is boolean.
                // Let's use toast for intermediate progress or just wait. 
                // Better: Add a progress state. For now, simple console log and single toast at end.

                const response = await fetch('/api/admin/user-permissions/bulk-enroll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        courseId: bulkEnrollCourse,
                        userIds: chunkUserIds,
                        action: bulkAction
                    }),
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Batch ${i + 1}/${userChunks.length} failed: ${error}`);
                }

                const result = await response.json();
                totalEnrolled += result.usersEnrolled;
                totalAccessGranted += result.videoAccessGranted;
                processedUsers += chunk.length;
            }

            let successMessage = `Bulk operation complete!\nProcessed: ${processedUsers} users\n`;
            if (bulkAction === 'ENROLL_ONLY') {
                successMessage += `New Enrollments: ${totalEnrolled}`;
            } else {
                successMessage += `Video Access Granted: ${totalAccessGranted}`;
            }
            toast.success(successMessage);

            setBulkEnrollOpen(false);
            setBulkEnrollCourse('');
            setBulkAction('ENROLL_ONLY');

            // Refresh data to update counts and permissions
            fetchAuxData();
            fetchUsers();
            // Also refresh selected user if any
            if (selectedUser) {
                fetchUserPermissions(selectedUser.id);
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Bulk enrollment error:', error);
            toast.error(`Bulk enrollment failed: ${message}`);
        } finally {
            setEnrolling(false);
        }
    };

    // Filtered users managed by hook: filteredUsers

    // Filter videos to only show those from enrolled courses
    const availableVideos = videos.filter((video) =>
        permissions.enrolledCourses.includes(video.courseId)
    );

    if (loading) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">User Permissions</h1>
                    <p className="text-muted-foreground">
                        Manage course enrollments and video access for users
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={bulkEnrollOpen} onOpenChange={setBulkEnrollOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary">
                                <Users className="mr-2 h-4 w-4" />
                                Bulk Enroll All Users
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Bulk Actions</DialogTitle>
                                <DialogDescription>
                                    Perform bulk operations for all users on a specific course.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div>
                                    <Label htmlFor="bulk-action" className="mb-2 block">Action Type</Label>
                                    <select
                                        id="bulk-action"
                                        value={bulkAction}
                                        onChange={(e) => setBulkAction(e.target.value as any)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="ENROLL_ONLY">Enroll Users Only (No Video Access)</option>
                                        <option value="SYNC_VIDEO_ACCESS">Grant Video Access (To Enrolled Users)</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {bulkAction === 'ENROLL_ONLY'
                                            ? "Adds users to the course list. They won't be able to watch videos unless you grant access later."
                                            : "Grants access to ALL videos in this course for users who are ALREADY enrolled."}
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="bulk-course" className="mb-2 block">Select Course</Label>
                                    <select
                                        id="bulk-course"
                                        value={bulkEnrollCourse}
                                        onChange={(e) => setBulkEnrollCourse(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">-- Select a Course --</option>
                                        {courses.map((course) => (
                                            <option key={course.id} value={course.id}>
                                                {course.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setBulkEnrollOpen(false)} disabled={enrolling}>
                                    Cancel
                                </Button>
                                <Button onClick={handleBulkEnroll} disabled={!bulkEnrollCourse || enrolling}>
                                    {enrolling ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        bulkAction === 'ENROLL_ONLY' ? 'Enroll Everyone' : 'Grant Access to All'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Dashboard Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                {courses.map(course => (
                    <Card key={course.id} className="relative overflow-visible">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground truncate max-w-[65%]" title={course.title}>
                                {course.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 scale-90 origin-right">
                                <Label htmlFor={`access-${course.id}`} className={`text-[10px] uppercase font-bold tracking-wider ${course.accessType === 'OPEN' ? 'text-green-600' : 'text-muted-foreground/60'}`}>
                                    {course.accessType === 'OPEN' ? 'Open' : 'Verify'}
                                </Label>
                                <Switch
                                    id={`access-${course.id}`}
                                    checked={course.accessType === 'OPEN'}
                                    onCheckedChange={() => handleToggleAccess(course.id, course.accessType)}
                                    className="data-[state=checked]:bg-green-600"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">
                                    {course._count?.Enrollment || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    / {users.length} users
                                </div>
                            </div>
                            <div className="mt-2 h-1 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${users.length ? ((course._count?.Enrollment || 0) / users.length) * 100 : 0}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Users List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Users ({filteredUsers.length})</CardTitle>
                        <CardDescription>Select a user to manage permissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <ScrollArea className="h-[600px]">
                                <div className="space-y-2">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No users found
                                        </div>
                                    ) : (
                                        filteredUsers.map((user) => {
                                            const hasPendingChanges = pendingChanges.has(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => setSelectedUser(user)}
                                                    className={`p-3 rounded-md cursor-pointer transition-colors relative ${selectedUser?.id === user.id
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-accent'
                                                        }`}
                                                >
                                                    {hasPendingChanges && (
                                                        <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" title="Has pending changes" />
                                                    )}
                                                    <p className="font-medium truncate pr-4">
                                                        {user.name || 'No name'}
                                                    </p>
                                                    <p className="text-sm opacity-80 truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions Panel */}
                <div className="lg:col-span-2">
                    {!selectedUser ? (
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <CardContent>
                                <p className="text-muted-foreground text-center">
                                    Select a user to manage their permissions
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {selectedUser.name || 'No name'}
                                    </CardTitle>
                                    <CardDescription>{selectedUser.email}</CardDescription>
                                </CardHeader>
                            </Card>

                            {/* Course Enrollments */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Enrollments ({permissions.enrolledCourses.length})</CardTitle>
                                    <CardDescription>
                                        Select courses this user can access
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[250px]">
                                        <div className="space-y-2">
                                            {courses.length === 0 ? (
                                                <div className="p-4 text-center text-muted-foreground">
                                                    No courses available
                                                </div>
                                            ) : (
                                                courses.map((course) => (
                                                    <div
                                                        key={course.id}
                                                        className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent cursor-pointer"
                                                        onClick={() => toggleCourse(course.id)}
                                                    >
                                                        <Checkbox
                                                            checked={permissions.enrolledCourses.includes(
                                                                course.id
                                                            )}
                                                            onCheckedChange={() => toggleCourse(course.id)}
                                                        />
                                                        <span className="flex-1">{course.title}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Video Access */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Video Access ({permissions.accessibleVideos.length}/{availableVideos.length})</CardTitle>
                                    <CardDescription>
                                        Select videos this user can watch (only from enrolled courses)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[250px]">
                                        <div className="space-y-2">
                                            {availableVideos.length === 0 ? (
                                                <div className="p-4 text-center text-muted-foreground">
                                                    {permissions.enrolledCourses.length === 0
                                                        ? 'Enroll user in courses first to grant video access'
                                                        : 'No videos available in enrolled courses'}
                                                </div>
                                            ) : (
                                                availableVideos.map((video) => (
                                                    <div
                                                        key={video.id}
                                                        className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent cursor-pointer"
                                                        onClick={() => toggleVideo(video.id)}
                                                    >
                                                        <Checkbox
                                                            checked={permissions.accessibleVideos.includes(
                                                                video.id
                                                            )}
                                                            onCheckedChange={() => toggleVideo(video.id)}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate">{video.title}</p>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {video.courseTitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Save Button */}
                            <Card>
                                <CardContent className="pt-6">
                                    {pendingChanges.size > 0 && (
                                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                <strong>{pendingChanges.size}</strong> user{pendingChanges.size > 1 ? 's' : ''} with pending changes
                                            </p>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleSavePermissions}
                                        disabled={saving || pendingChanges.size === 0}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save {pendingChanges.size > 0 ? `${pendingChanges.size} User${pendingChanges.size > 1 ? 's' : ''}` : 'Permissions'}
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
