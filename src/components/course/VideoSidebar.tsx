import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CheckCircle, PlayCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VideoSidebarProps {
    courseTitle: string;
    videos: {
        id: string;
        title: string;
        position: number;
        completed: boolean;
    }[];
    currentVideoId: string;
    onVideoClick?: () => void;
}

export default function VideoSidebar({ courseTitle, videos, currentVideoId, onVideoClick }: VideoSidebarProps) {
    return (
        <div className="flex h-full w-full flex-col bg-card">
            <div className="hidden border-b p-4 md:block">
                <p className="academic-kicker">Course Contents</p>
                <h3 className="mt-2 line-clamp-2 text-lg font-semibold">{courseTitle}</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 p-2">
                    {videos.map((video) => {
                        const isActive = video.id === currentVideoId;
                        return (
                            <Link
                                key={video.id}
                                href={`/watch/${video.id}`}
                                onClick={onVideoClick}
                                className={cn(
                                    "flex items-center gap-3 rounded-md p-3 text-sm transition-colors hover:bg-secondary",
                                    isActive && "bg-primary text-primary-foreground font-medium hover:bg-primary"
                                )}
                            >
                                <div className="flex-shrink-0">
                                    {isActive ? (
                                        <PlayCircle className="h-4 w-4" />
                                    ) : video.completed ? (
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                    )}
                                </div>
                                <span className="line-clamp-2">{video.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
