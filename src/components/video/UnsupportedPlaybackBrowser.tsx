import Link from 'next/link';

export function UnsupportedPlaybackBrowser({ browserName }: { browserName: string }) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
            <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">Trình duyệt tạm thời bị chặn</p>
                <h1 className="mt-2 text-2xl font-semibold">Vui lòng sử dụng Google Chrome hoặc Safari</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Tính năng phát video hiện tạm thời chỉ hỗ trợ Google Chrome và Safari.
                    {browserName !== 'this browser' ? ` ${browserName} hiện tạm thời bị chặn.` : ''}
                </p>
                <Link
                    href="/courses"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                    Quay lại khóa học
                </Link>
            </div>
        </div>
    );
}
