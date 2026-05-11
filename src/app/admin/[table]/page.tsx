import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { GenericTable } from '@/components/admin/GenericTable';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const TABLE_CONFIG: Record<string, any> = {
    users: {
        model: 'user',
        title: 'Users',
        columns: [
            { header: 'ID', accessorKey: 'id' },
            { header: 'Name', accessorKey: 'name' },
            { header: 'Email', accessorKey: 'email' },
            { header: 'Role', accessorKey: 'role' },
            { header: 'Created At', accessorKey: 'createdAtFormatted' },
        ],
    },
    courses: {
        model: 'course',
        title: 'Courses',
        columns: [
            { header: 'Title', accessorKey: 'title' },
            { header: 'Published', accessorKey: 'publishedFormatted' },
            { header: 'Created At', accessorKey: 'createdAtFormatted' },
        ],
    },
    videos: {
        model: 'video',
        title: 'Videos',
        include: { Course: true },
        columns: [
            { header: 'Title', accessorKey: 'title' },
            { header: 'Course', accessorKey: 'courseTitle' },
            { header: 'Published', accessorKey: 'publishedFormatted' },
            { header: 'Position', accessorKey: 'position' },
            { header: 'View Limit', accessorKey: 'viewLimitFormatted' },
        ],
    },
    enrollments: {
        model: 'enrollment',
        title: 'Enrollments',
        include: { User: true, Course: true },
        columns: [
            { header: 'User Email', accessorKey: 'userEmail' },
            { header: 'Course', accessorKey: 'courseTitle' },
            { header: 'Enrolled At', accessorKey: 'enrolledAtFormatted' },
        ],
    },
    tickets: {
        model: 'ticket',
        title: 'Support Tickets',
        columns: [
            { header: 'Email', accessorKey: 'email' },
            { header: 'Status', accessorKey: 'status' },
            { header: 'Created At', accessorKey: 'createdAtFormatted' },
        ],
    },
};

export default async function AdminTablePage({
    params,
}: {
    params: Promise<{ table: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        redirect('/api/auth/signin');
    }

    const { table } = await params;
    const config = TABLE_CONFIG[table];

    if (!config) {
        notFound();
    }

    // @ts-ignore - Dynamic Prisma access
    const rawData = await prisma[config.model].findMany({
        // Show ALL records (including soft-deleted) in admin tables
        // so admins can manage and restore them
        orderBy: config.model === 'enrollment'
            ? { enrolledAt: 'desc' }
            : { createdAt: 'desc' },
        include: config.include || undefined,
    });

    // Transform data on the server to avoid hydration issues
    // Use ISO format (YYYY-MM-DD) for consistent date rendering
    const data = rawData.map((item: any) => ({
        ...item,
        createdAtFormatted: item.createdAt
            ? new Date(item.createdAt).toISOString().split('T')[0]
            : '',
        enrolledAtFormatted: item.enrolledAt
            ? new Date(item.enrolledAt).toISOString().split('T')[0]
            : '',
        publishedFormatted: item.published !== undefined
            ? (item.published ? 'Yes' : 'No')
            : '',
        viewLimitFormatted: item.viewLimit !== undefined
            ? (item.viewLimit === null ? 'Unlimited' : item.viewLimit.toString())
            : '',
        // Flatten relations for easier display
        courseTitle: item.Course?.title || item.courseId,
        userEmail: item.User?.email || item.userId,
    }));

    return (
        <div className="p-6">
            <GenericTable
                title={config.title}
                data={data}
                columns={config.columns}
                tableName={config.model}
            />
        </div>
    );
}
