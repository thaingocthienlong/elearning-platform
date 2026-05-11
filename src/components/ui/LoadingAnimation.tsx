'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LoadingAnimationProps {
    className?: string;
    animationData?: any; // Lottie JSON data
    text?: string;
}

export default function LoadingAnimation({
    className,
    animationData,
    text,
}: LoadingAnimationProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center p-8', className)}>
            {animationData ? (
                <div className="w-48 h-48">
                    <Lottie animationData={animationData} loop={true} />
                </div>
            ) : (
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            )}
            {text && <p className="text-muted-foreground animate-pulse">{text}</p>}
        </div>
    );
}
