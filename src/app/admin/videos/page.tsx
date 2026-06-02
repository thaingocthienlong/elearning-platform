'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload as TusUpload } from 'tus-js-client';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { useAdminFilters } from '@/hooks/admin/useAdminFilters';
import { useTablePagination } from '@/hooks/admin/useTablePagination';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  PlayCircle,
  Upload as UploadIcon,
} from 'lucide-react';
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

type VideoProvider = 'AXINOM' | 'VDOCIPHER' | 'BUNNY_STREAM';

type Video = {
  id: string;
  title: string;
  createdAt: string;
  published: boolean;
  description: string | null;
  provider: VideoProvider;
  dashUrl: string | null;
  hlsUrl: string | null;
  hlsUrlClear: string | null;
  axinomVideoId: string | null;
  axinomIdClear: string | null;
  axinomEncodingStatus: string | null;
  axinomOutputLocation: string | null;
  axinomSyncedAt: string | null;
  bunnyLibraryId: string | null;
  bunnyVideoId: string | null;
  bunnyCollectionId: string | null;
  bunnyStatus: string | null;
  bunnyEncodeProgress: number | null;
  bunnyAvailableRes: string | null;
  bunnyThumbnailUrl: string | null;
  bunnySyncedAt: string | null;
  bunnyError: string | null;
};

type BunnyUploadCredentials = {
  uploadEndpoint: string;
  libraryId: string;
  videoId: string;
  authorizationExpire: number;
  authorizationSignature: string;
  localVideoId: string;
};

type BunnyUploadIntent = {
  filename: string;
  contentType: string;
  courseId: string;
  title: string;
  fileSize: number;
  fileLastModified: number;
  collectionId?: string;
};

const BUNNY_UPLOAD_REQUEST_NAMESPACE = 'bunny-stream-upload-request';
const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

function getCanonicalUploadIntent(
  file: File,
  courseId: string,
  title: string,
  collectionId?: string
) {
  const effectiveTitle = title.trim() || file.name;
  const contentType = file.type.startsWith('video/') ? file.type : 'video/mp4';

  return {
    filename: file.name,
    contentType,
    courseId,
    title: effectiveTitle,
    fileSize: file.size,
    fileLastModified: file.lastModified,
    ...(collectionId ? { collectionId } : {}),
  };
}

function hashCanonicalUploadIntent(intent: BunnyUploadIntent) {
  const canonicalJson = JSON.stringify({
    namespace: BUNNY_UPLOAD_REQUEST_NAMESPACE,
    ...intent,
  });
  const bytes = new TextEncoder().encode(canonicalJson);

  let hash = FNV_OFFSET_BASIS_32;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }

  return hash.toString(36);
}

function createUploadRequestId(intent: BunnyUploadIntent) {
  return `${BUNNY_UPLOAD_REQUEST_NAMESPACE}:${hashCanonicalUploadIntent(intent)}`;
}

function getBunnyStatusBadge(status: string | null) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-xs">
        Unknown
      </Badge>
    );
  }

  if (status === 'FAILED') {
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
    );
  }

  if (status === 'READY' || status === 'PLAYABLE') {
    return (
      <Badge className="bg-emerald-500 text-xs hover:bg-emerald-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      {status}
    </Badge>
  );
}

function formatTimestamp(value: string | null) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleString();
}

export default function AdminVideosPage() {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const uploadRef = useRef<TusUpload | null>(null);

  const { data: videos, loading, refetch: fetchVideos } = useAdminData<Video>({
    endpoint: '/api/admin/videos',
  });

  const { searchQuery, setSearchQuery, filteredData: filteredVideos } =
    useAdminFilters(videos, [
      'title',
      'id',
      'provider',
      'axinomVideoId',
      'axinomIdClear',
      'description',
      'bunnyVideoId',
      'bunnyStatus',
    ]);

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } =
    useTablePagination(filteredVideos, 10);

  const [chatUploadDialogOpen, setChatUploadDialogOpen] = useState(false);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [videoForChat, setVideoForChat] = useState<Video | null>(null);

  useEffect(() => {
    if (!uploadDialogOpen) return;

    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(data[0].id);
      })
      .catch((err) => console.error('Failed to load courses', err));
  }, [uploadDialogOpen]);

  const stopActiveUpload = useCallback(() => {
    if (!uploadRef.current) return;

    void uploadRef.current.abort(true).catch(() => undefined);
    uploadRef.current = null;
  }, []);

  const resetUploadForm = useCallback(() => {
    stopActiveUpload();
    setFile(null);
    setTitle('');
    setSelectedCourseId('');
    setUploadProgress(0);
    setStatus('');
    setUploading(false);
  }, [stopActiveUpload]);

  const handleUploadDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetUploadForm();
      }

      setUploadDialogOpen(nextOpen);
    },
    [resetUploadForm]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0] ?? null;
      setFile(nextFile);
      setUploadProgress(0);
      setStatus('');
    },
    []
  );

  const handleAxinomSync = async (videoId: string) => {
    setSyncingId(videoId);

    try {
      const res = await fetch('/api/video/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        await fetchVideos();
        toast.success(
          result.updated
            ? 'Axinom status updated and playback URLs synced'
            : `Axinom status updated: ${result.status}`
        );
      } else {
        toast.error(`Axinom sync failed: ${result.error || result.status}`);
      }
    } catch (error) {
      console.error('Axinom sync error:', error);
      toast.error('Failed to sync Axinom video');
    } finally {
      setSyncingId(null);
    }
  };

  const handleBunnySync = async (videoId: string) => {
    setSyncingId(videoId);

    try {
      const res = await fetch('/api/video/bunny-stream/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        await fetchVideos();
        toast.success(`Bunny status updated: ${result.status}`);
      } else {
        toast.error(`Bunny sync failed: ${result.error || result.status}`);
      }
    } catch (error) {
      console.error('Bunny sync error:', error);
      toast.error('Failed to sync Bunny video');
    } finally {
      setSyncingId(null);
    }
  };

  const getLegacyAxinomId = (desc: string | null) => {
    const match = desc?.match(/axinom-id:([a-f0-9-]+)/i);
    return match ? match[1] : null;
  };

  const getPrimaryAxinomId = (video: Video) =>
    video.axinomVideoId || getLegacyAxinomId(video.description);

  const isReadyStatus = (statusValue: string | null) =>
    statusValue === 'READY' ||
    statusValue === 'COMPLETED' ||
    statusValue === 'Finished';

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !selectedCourseId || uploading) return;

    const canonicalUploadIntent = getCanonicalUploadIntent(
      file,
      selectedCourseId,
      title
    );
    const uploadRequestId = createUploadRequestId(canonicalUploadIntent);
    const { contentType, title: effectiveTitle } = canonicalUploadIntent;

    setUploading(true);
    setUploadProgress(0);
    setStatus('Requesting Bunny upload credentials...');

    try {
      const res = await fetch('/api/bunny-stream/upload-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          title: effectiveTitle,
          courseId: selectedCourseId,
          fileSize: file.size,
          fileLastModified: file.lastModified,
          uploadRequestId,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (payload && typeof payload.error === 'string' && payload.error) ||
            `Failed to initialize Bunny upload (${res.status})`
        );
      }

      const credentials = payload as BunnyUploadCredentials;

      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint: credentials.uploadEndpoint,
          metadata: {
            filetype: contentType,
            title: effectiveTitle,
          },
          headers: {
            AuthorizationSignature: credentials.authorizationSignature,
            AuthorizationExpire: String(credentials.authorizationExpire),
            LibraryId: credentials.libraryId,
            VideoId: credentials.videoId,
          },
          chunkSize: 5 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000],
          onError: (error) => {
            reject(error instanceof Error ? error : new Error('Upload failed'));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const nextProgress =
              bytesTotal > 0
                ? Math.round((bytesUploaded / bytesTotal) * 100)
                : 0;
            setUploadProgress(nextProgress);
            setStatus(`Uploading to Bunny... ${nextProgress}%`);
          },
          onSuccess: () => resolve(),
        });

        uploadRef.current = upload;
        upload.start();
      });

      uploadRef.current = null;
      setUploadProgress(100);
      setStatus('Upload complete. Bunny is processing the video.');
      toast.success('Upload complete. Bunny is processing the video.');
      await fetchVideos();

      window.setTimeout(() => {
        resetUploadForm();
        setUploadDialogOpen(false);
      }, 1200);
    } catch (error) {
      uploadRef.current = null;
      console.error('Bunny upload failed:', error);
      setStatus('Upload failed. Please retry.');
      toast.error('Bunny upload failed. Please retry.');
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Videos</h1>
        <div className="flex gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-8 lg:w-[300px]"
            />
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload Bunny Video
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
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Provider</th>
                    <th className="p-4 font-medium">Details</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((video) => {
                    const isBunny = video.provider === 'BUNNY_STREAM';
                    const axinomId = getPrimaryAxinomId(video);
                    const drmReady =
                      Boolean(video.dashUrl && video.hlsUrl) ||
                      isReadyStatus(video.axinomEncodingStatus);
                    const canSyncAxinom = Boolean(axinomId);
                    const canSyncBunny = Boolean(video.bunnyVideoId);

                    return (
                      <tr key={video.id} className="border-t hover:bg-muted/50">
                        <td className="p-4 font-medium">{video.title}</td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={isBunny ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {isBunny ? 'Bunny' : 'Axinom'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {isBunny ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Status:
                                </span>
                                {getBunnyStatusBadge(video.bunnyStatus)}
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Video ID:
                                </span>
                                <span className="break-all font-mono text-xs text-muted-foreground">
                                  {video.bunnyVideoId || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Progress:
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {video.bunnyEncodeProgress ?? 'N/A'}
                                  {video.bunnyEncodeProgress != null ? '%' : ''}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Resolutions:
                                </span>
                                <span className="break-words text-xs text-muted-foreground">
                                  {video.bunnyAvailableRes || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Thumbnail:
                                </span>
                                <span className="break-all text-xs text-muted-foreground">
                                  {video.bunnyThumbnailUrl || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Synced:
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(video.bunnySyncedAt)}
                                </span>
                              </div>
                              {video.bunnyCollectionId && (
                                <div className="flex items-start gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Collection:
                                  </span>
                                  <span className="break-all font-mono text-xs text-muted-foreground">
                                    {video.bunnyCollectionId}
                                  </span>
                                </div>
                              )}
                              {video.bunnyLibraryId && (
                                <div className="flex items-start gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Library:
                                  </span>
                                  <span className="break-all font-mono text-xs text-muted-foreground">
                                    {video.bunnyLibraryId}
                                  </span>
                                </div>
                              )}
                              {video.bunnyError && (
                                <div className="flex items-start gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Error:
                                  </span>
                                  <span className="break-words text-xs text-destructive">
                                    {video.bunnyError}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  DRM:
                                </span>
                                {drmReady ? (
                                  <Badge className="bg-green-500 text-xs hover:bg-green-600">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Ready
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Processing
                                  </Badge>
                                )}
                              </div>
                              {video.axinomEncodingStatus && (
                                <div className="flex items-center gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    State:
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {video.axinomEncodingStatus}
                                  </Badge>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-xs text-muted-foreground">
                                  Axinom ID:
                                </span>
                                <span className="break-all font-mono text-xs text-muted-foreground">
                                  {axinomId || 'N/A'}
                                </span>
                              </div>
                              {video.axinomIdClear && (
                                <div className="flex items-start gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Clear ID:
                                  </span>
                                  <span className="break-all font-mono text-xs text-muted-foreground">
                                    {video.axinomIdClear}
                                  </span>
                                </div>
                              )}
                              {video.axinomOutputLocation && (
                                <div className="flex items-start gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Output:
                                  </span>
                                  <span className="break-all text-xs text-muted-foreground">
                                    {video.axinomOutputLocation}
                                  </span>
                                </div>
                              )}
                              {video.axinomSyncedAt && (
                                <div className="flex items-center gap-2">
                                  <span className="w-24 text-xs text-muted-foreground">
                                    Synced:
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(video.axinomSyncedAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="space-x-2 p-4 text-right">
                          {video.published && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/watch/${video.id}`}>
                                <PlayCircle className="mr-1 h-4 w-4" />
                                Watch
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
                            <UploadIcon className="mr-1 h-4 w-4" />
                            Chat
                          </Button>

                          {isBunny ? (
                            canSyncBunny && (
                              <Button
                                size="sm"
                                onClick={() => handleBunnySync(video.id)}
                                disabled={syncingId === video.id}
                                title="Sync Bunny status and upload metadata"
                              >
                                {syncingId === video.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="mr-1 h-4 w-4" />
                                    Sync Bunny
                                  </>
                                )}
                              </Button>
                            )
                          ) : (
                            canSyncAxinom && (
                              <Button
                                size="sm"
                                onClick={() => handleAxinomSync(video.id)}
                                disabled={syncingId === video.id}
                                title="Update Axinom status and sync manifest URLs"
                              >
                                {syncingId === video.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="mr-1 h-4 w-4" />
                                    Sync Axinom
                                  </>
                                )}
                              </Button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No videos found. Upload one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

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

      <Dialog open={uploadDialogOpen} onOpenChange={handleUploadDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Bunny Video</DialogTitle>
            <DialogDescription>
              Upload a new Bunny TUS video to the platform
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="course">Course</Label>
              <select
                id="course"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a course
                </option>
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
                onChange={handleFileChange}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={uploading || !selectedCourseId || !file}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            {uploading && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {status || `Uploading... ${uploadProgress}%`}
                </p>
              </div>
            )}
            {!uploading && status && (
              <p className="text-center text-sm text-muted-foreground">
                {status}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chatUploadDialogOpen}
        onOpenChange={setChatUploadDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Chat Log</DialogTitle>
            <DialogDescription>
              Upload a chat.txt file for &quot;{videoForChat?.title}&quot;
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
            {!uploading && status && (
              <p className="text-center text-sm text-muted-foreground">
                {status}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
