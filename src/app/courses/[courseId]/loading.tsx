import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="flex flex-col sm:flex-row sm:items-center p-4 gap-3">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                            <Skeleton className="h-6 w-full max-w-md" />
                        </div>
                        <Skeleton className="h-10 w-full sm:w-32 flex-shrink-0" />
                    </Card>
                ))}
            </div>
        </div>
    )
}
