import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { GenericTable } from '@/components/admin/GenericTable';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type AdminTableModel = 'user' | 'course' | 'enrollment';

type AdminTableRow = {
    id: string;
    createdAt?: Date;
    enrolledAt?: Date;
    published?: boolean;
    viewLimit?: number | null;
    courseId?: string;
    userId?: string | null;
    isDeleted?: boolean;
    [key: string]: unknown;
};

type AdminDisplayRow = AdminTableRow & {
    createdAtFormatted: string;
    enrolledAtFormatted: string;
    publishedFormatted: string;
    viewLimitFormatted: string;
    courseTitle: string;
    userEmail: string;
};

interface AdminTableConfig {
    model: AdminTableModel;
    title: string;
    columns: Array<{ header: string; accessorKey: keyof AdminDisplayRow }>;
}

const TABLE_CONFIG: Record<string, AdminTableConfig> = {
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
    enrollments: {
        model: 'enrollment',
        title: 'Enrollments',
        columns: [
            { header: 'User Email', accessorKey: 'userEmail' },
            { header: 'Course', accessorKey: 'courseTitle' },
            { header: 'Enrolled At', accessorKey: 'enrolledAtFormatted' },
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

    let rawData: AdminTableRow[];

    switch (config.model) {
        case 'user':
            rawData = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
            break;
        case 'course':
            rawData = await prisma.course.findMany({ orderBy: { createdAt: 'desc' } });
            break;
        case 'enrollment':
            rawData = await prisma.enrollment.findMany({ orderBy: { enrolledAt: 'desc' } });
            break;
    }

    const courseIds = [
        ...new Set(rawData.flatMap((item) => (item.courseId ? [item.courseId] : []))),
    ];
    const userIds = [
        ...new Set(rawData.flatMap((item) => (item.userId ? [item.userId] : []))),
    ];
    const [courses, users] = await Promise.all([
        courseIds.length > 0
            ? prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, title: true },
            })
            : Promise.resolve([]),
        userIds.length > 0
            ? prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, email: true },
            })
            : Promise.resolve([]),
    ]);
    const coursesById = new Map(courses.map((course) => [course.id, course]));
    const usersById = new Map(users.map((user) => [user.id, user]));

    // Transform data on the server to avoid hydration issues
    // Use ISO format (YYYY-MM-DD) for consistent date rendering
    const data: AdminDisplayRow[] = rawData.map((item) => ({
        ...item,
        createdAtFormatted: item.createdAt
            ? item.createdAt.toISOString().split('T')[0]
            : '',
        enrolledAtFormatted: item.enrolledAt
            ? item.enrolledAt.toISOString().split('T')[0]
            : '',
        publishedFormatted: item.published !== undefined
            ? (item.published ? 'Yes' : 'No')
            : '',
        viewLimitFormatted: item.viewLimit !== undefined
            ? (item.viewLimit === null ? 'Unlimited' : item.viewLimit.toString())
            : '',
        // Flatten relations for easier display
        courseTitle: item.courseId
            ? (coursesById.get(item.courseId)?.title ?? 'Khoa hoc khong ton tai')
            : '',
        userEmail: item.userId
            ? (usersById.get(item.userId)?.email ?? 'Nguoi dung khong ton tai')
            : '',
    }));

    return (
        <div className="p-6">
            <GenericTable<AdminDisplayRow>
                title={config.title}
                data={data}
                columns={config.columns}
                tableName={config.model}
            />
        </div>
    );
}
