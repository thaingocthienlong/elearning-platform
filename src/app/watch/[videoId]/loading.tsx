import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Browser Banner Skeleton */}
            <div className="border-b border-blue-100 dark:border-blue-900 px-4 py-2">
                <Skeleton className="h-5 w-3/4 mx-auto" />
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Player Area Skeleton */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
                    <div className="max-w-4xl mx-auto h-full flex flex-col gap-4">
                        {/* Video Player Skeleton */}
                        <div className="aspect-video w-full rounded-lg overflow-hidden relative bg-muted">
                            <Skeleton className="absolute inset-0 w-full h-full" />
                            {/* Play button hint */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Skeleton className="h-16 w-16 rounded-full opacity-50" />
                            </div>
                        </div>

                        {/* Title and Info Skeleton */}
                        <div className="space-y-2 mt-4">
                            <Skeleton className="h-8 w-2/3" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton */}
                <div className="w-full md:w-80 border-l bg-muted/10 flex flex-col h-full">
                    <div className="p-4 border-b">
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-16 w-28 rounded-md flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
