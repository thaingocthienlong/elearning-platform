'use client';

import { useState, useEffect } from 'react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { useAdminFilters } from '@/hooks/admin/useAdminFilters';
import { useTablePagination } from '@/hooks/admin/useTablePagination';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle, PlayCircle, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TencentUploadResult = {
    fileId: string;
    video?: {
        url?: string;
    };
};

type TencentUploader = {
    on(event: 'media_progress', callback: (info: { percent?: number }) => void): void;
    done(): Promise<TencentUploadResult>;
};

type TencentVodConstructor = new (options: {
    getSignature: () => Promise<string>;
    appId?: number;
}) => {
    upload(options: { mediaFile: File; mediaName?: string }): TencentUploader;
};

type Video = {
    id: string;
    title: string;
    createdAt: string;
    published: boolean;
    description: string | null;
    dashUrl: string | null;
    hlsUrl: string | null;
    hlsUrlClear: string | null;
    tencentFileId: string | null;
    tencentTaskId: string | null;
    tencentStatus: string | null;
    tencentAppleFallbackDrmType: string | null;
    tencentSyncedAt: string | null;
    tencentDeletedAt: string | null;
};

export default function AdminVideosPage() {


    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Upload dialog state
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    // Shared hooks implementation
    const {
        data: videos,
        loading,
        refetch: fetchVideos
    } = useAdminData<Video>({
        endpoint: '/api/admin/videos'
    });

    const {
        searchQuery,
        setSearchQuery,
        filteredData: filteredVideos
    } = useAdminFilters(videos, ['title', 'id', 'tencentFileId', 'description']);

    const {
        paginatedData,
        currentPage,
        totalPages,
        nextPage,
        prevPage
    } = useTablePagination(filteredVideos, 10);

    // Chat Upload dialog state
    const [chatUploadDialogOpen, setChatUploadDialogOpen] = useState(false);
    const [chatFile, setChatFile] = useState<File | null>(null);
    const [videoForChat, setVideoForChat] = useState<Video | null>(null);

    // fetchVideos handled by hook

    // Fetch courses when upload dialog opens
    useEffect(() => {
        if (uploadDialogOpen) {
            fetch('/api/admin/courses')
                .then((res) => {
                    if (!res.ok) throw new Error('Failed to load courses');
                    return res.json();
                })
                .then((data) => {
                    if (!Array.isArray(data)) throw new Error('Invalid courses response');
                    setCourses(data);
                    setSelectedCourseId(data[0]?.id ?? '');
                })
                .catch((err) => console.error('Failed to load courses', err));
        }
    }, [uploadDialogOpen]);

    const handleSync = async (videoId: string) => {
        setSyncingId(videoId);
        try {
            const res = await fetch('/api/video/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId }),
            });
            const result = await res.json();

            if (res.ok && result.success) {
                // Refresh list to show updates
                await fetchVideos();
                toast.success(
                    result.updated
                        ? 'Video status updated and playback URLs synced'
                        : `Video status updated: ${result.status}`
                );
            } else {
                toast.error(`Sync failed: ${result.error || result.status}`);
            }
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync video');
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (video: Video) => {
        const confirmed = window.confirm(
            `Permanently delete "${video.title}" from Tencent VOD and remove it from the platform? This cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingId(video.id);
        try {
            const response = await fetch(`/api/admin/videos/${video.id}`, {
                method: 'DELETE',
            });
            const result = await response.json().catch(() => ({ error: 'Unknown deletion error' }));

            if (!response.ok) {
                throw new Error(result.error || `Delete failed: ${response.status}`);
            }

            toast.success(result.alreadyDeleted ? 'Video was already deleted' : 'Video deleted');
            fetchVideos();
        } catch (error) {
            console.error('Delete video error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete video');
        } finally {
            setDeletingId(null);
        }
    };

    const isReadyStatus = (statusValue: string | null) =>
        statusValue === 'READY' || statusValue === 'COMPLETED' || statusValue === 'Finished';

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedCourseId) return;

        setUploading(true);
        setStatus('Requesting Tencent upload instructions...');

        try {
            // 1. Get presigned URL
            const res = await fetch('/api/upload/presigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                    title: title,
                    courseId: selectedCourseId,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Failed to get upload URL: ${err}`);
            }
            const {
                videoId,
                uploadSignature,
                tencentSubAppId,
            } = await res.json() as {
                videoId: string;
                uploadSignature: string;
                tencentSubAppId: number | null;
            };

            setStatus('Uploading video to Tencent VOD...');
            const tcVodModule = await import('vod-js-sdk-v6') as {
                default?: TencentVodConstructor;
            } & TencentVodConstructor;
            const TencentVod = tcVodModule.default ?? tcVodModule;
            const tcVod = new TencentVod({
                getSignature: async () => uploadSignature,
                appId: tencentSubAppId ?? undefined,
            });
            const uploader = tcVod.upload({
                mediaFile: file,
                mediaName: title || file.name,
            });

            uploader.on('media_progress', (info) => {
                if (typeof info.percent === 'number') {
                    setStatus(`Uploading video to Tencent VOD... ${Math.round(info.percent * 100)}%`);
                }
            });

            const uploadResult = await uploader.done();
            if (!uploadResult.fileId) {
                throw new Error('Tencent upload completed without a file ID');
            }

            setStatus('Saving Tencent upload result...');
            const completeRes = await fetch('/api/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    fileId: uploadResult.fileId,
                    mediaUrl: uploadResult.video?.url,
                }),
            });

            if (!completeRes.ok) {
                const errData = await completeRes.json().catch(() => ({ error: 'Unknown completion error' }));
                throw new Error(errData.error || `Upload completion failed: ${completeRes.status}`);
            }

            setStatus('Upload complete. Tencent is processing WV-SAES-V1 (720p).');

            // Reset form and close dialog
            setTimeout(() => {
                setUploadDialogOpen(false);
                setFile(null);
                setTitle('');
                setStatus('');
                fetchVideos(); // Refresh video list
            }, 1500);
        } catch (error) {
            console.error(error);
            setStatus('Error: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    const handleChatUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatFile || !videoForChat) return;

        setUploading(true);
        setStatus('Uploading chat log...');

        try {
            const formData = new FormData();
            formData.append('file', chatFile);
            formData.append('videoId', videoForChat.id);

            const res = await fetch('/api/admin/videos/chat', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Upload failed');
            }

            const result = await res.json();
            toast.success(`Chat log uploaded: ${result.count} messages`);
            setChatUploadDialogOpen(false);
            setChatFile(null);
            setVideoForChat(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload chat log');
        } finally {
            setUploading(false);
            setStatus('');
        }
    };

    return (
        <div className="container mx-auto py-10">
            {/* ... existing header ... */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Manage Videos</h1>
                <div className="flex gap-2">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-[200px] lg:w-[300px] pl-8"
                        />
                    </div>
                    <Button onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Upload New Video
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Videos</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="rounded-md border p-8 text-center space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-4 font-medium">Title</th>
                                        <th className="p-4 font-medium">Date</th>
                                        <th className="p-4 font-medium">Tencent File ID</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((video) => {
                                        const drmReady = Boolean(video.dashUrl && video.hlsUrl) || isReadyStatus(video.tencentStatus);
                                        const canUpdateStatus = Boolean(video.tencentFileId);
                                        return (
                                            <tr key={video.id} className="border-t hover:bg-muted/50">
                                                <td className="p-4 font-medium">{video.title}</td>
                                                <td className="p-4 text-muted-foreground">
                                                    {new Date(video.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 font-mono text-xs text-muted-foreground">
                                                    <div className="space-y-1">
                                                        <div>{video.tencentFileId || 'N/A'}</div>
                                                        {video.tencentTaskId && (
                                                            <div>task: {video.tencentTaskId}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        {/* DRM Status */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground w-12">DRM:</span>
                                                            {drmReady ? (
                                                                <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                                                                    <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {video.tencentStatus && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground w-12">State:</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {video.tencentStatus}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        {/* Apple fallback Status */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground w-12">Apple:</span>
                                                            {video.tencentFileId ? (
                                                                video.hlsUrlClear ? (
                                                                    <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">
                                                                        <CheckCircle className="w-3 h-3 mr-1" /> {video.tencentAppleFallbackDrmType ?? 'Ready'}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing
                                                                    </Badge>
                                                                )
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">
                                                                    <XCircle className="w-3 h-3 mr-1" /> Not Started
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    {video.published && (
                                                        <Button size="sm" variant="outline" asChild>
                                                            <Link href={`/watch/${video.id}`}>
                                                                <PlayCircle className="w-4 h-4 mr-1" /> Watch
                                                            </Link>
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setVideoForChat(video);
                                                            setChatUploadDialogOpen(true);
                                                        }}
                                                    >
                                                        <Upload className="w-4 h-4 mr-1" /> Chat
                                                    </Button>

                                                    {canUpdateStatus && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSync(video.id)}
                                                            disabled={syncingId === video.id}
                                                            title="Update Tencent status and sync manifest URLs"
                                                        >
                                                            {syncingId === video.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <RefreshCw className="w-4 h-4 mr-1" /> Update Status
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(video)}
                                                        disabled={deletingId !== null}
                                                        title="Delete video from Tencent VOD and the platform"
                                                    >
                                                        {deletingId === video.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                No videos found. Upload one to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="text-sm font-medium">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Video Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                {/* ... existing upload dialog ... */}
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Video</DialogTitle>
                        <DialogDescription>
                            Upload a new video to the platform
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        {/* ... form fields ... */}
                        <div>
                            <Label htmlFor="course">Course</Label>
                            <select
                                id="course"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Video Title"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="file">Video File</Label>
                            <Input
                                id="file"
                                type="file"
                                accept="video/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={uploading || !selectedCourseId} className="w-full">
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                        {status && <p className="text-sm text-center mt-2">{status}</p>}
                    </form>
                </DialogContent>
            </Dialog>

            {/* Chat Upload Dialog */}
            <Dialog open={chatUploadDialogOpen} onOpenChange={setChatUploadDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Chat Log</DialogTitle>
                        <DialogDescription>
                            Upload a chat.txt file for "{videoForChat?.title}"
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChatUpload} className="space-y-4">
                        <div>
                            <Label htmlFor="chatFile">Chat File (.txt)</Label>
                            <Input
                                id="chatFile"
                                type="file"
                                accept=".txt"
                                onChange={(e) => setChatFile(e.target.files?.[0] || null)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={uploading || !chatFile} className="w-full">
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
