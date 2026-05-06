'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import VideoSidebar from './VideoSidebar';

interface Video {
    id: string;
    title: string;
    position: number;
    completed: boolean;
}

interface VideoSidebarWrapperProps {
    courseTitle: string;
    videos: Video[];
    currentVideoId: string;
}

export default function VideoSidebarWrapper({
    courseTitle,
    videos,
    currentVideoId,
}: VideoSidebarWrapperProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden w-80 border-l border-border/80 bg-card md:block">
                <VideoSidebar
                    courseTitle={courseTitle}
                    videos={videos}
                    currentVideoId={currentVideoId}
                />
            </div>

            {/* Mobile Menu Button */}
            <div className="fixed bottom-4 right-4 z-30 md:hidden">
                <Button
                    size="lg"
                    className="shadow-lg"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                    Course Videos
                </Button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar (Slide-over Drawer) */}
            <aside
                className={`fixed inset-y-0 right-0 z-50 flex w-80 transform flex-col border-l bg-card shadow-2xl transition-transform duration-300 md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="truncate pr-4 text-lg font-semibold">{courseTitle}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <VideoSidebar
                        courseTitle={courseTitle}
                        videos={videos}
                        currentVideoId={currentVideoId}
                        onVideoClick={() => setMobileMenuOpen(false)}
                    />
                </div>
            </aside>
        </>
    );
}
