'use client';

import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { FolderOpen } from 'lucide-react';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface EmptyStateProps {
    className?: string;
    animationData?: any; // Lottie JSON data
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export default function EmptyState({
    className,
    animationData,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
            <div className="mb-6 flex items-center justify-center">
                {animationData ? (
                    <div className="w-64 h-64">
                        <Lottie animationData={animationData} loop={true} />
                    </div>
                ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted/50">
                        <FolderOpen className="h-16 w-16 text-muted-foreground" />
                    </div>
                )}
            </div>
            <h3 className="text-2xl font-semibold tracking-tight mb-2">{title}</h3>
            {description && (
                <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}
