import Link from 'next/link';

export function UnsupportedPlaybackBrowser({ browserName }: { browserName: string }) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
            <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Browser temporarily blocked</p>
                <h1 className="mt-2 text-2xl font-semibold">Use Google Chrome or Safari</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Video playback is temporarily available only on Google Chrome and Safari.
                    {browserName !== 'this browser' ? ` ${browserName} is blocked for now.` : ''}
                </p>
                <Link
                    href="/courses"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                    Back to courses
                </Link>
            </div>
        </div>
    );
}
