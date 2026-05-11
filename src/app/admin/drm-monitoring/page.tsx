import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function DRMMonitoringPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/api/auth/signin');
    }

    // Fetch DRM statistics
    const [
        totalSessions,
        hardwareDRMCount,
        softwareDRMCount,
        drmTypeBreakdown,
        recentSessions,
    ] = await Promise.all([
        prisma.dRMSession.count(),
        prisma.dRMSession.count({ where: { isHardwareDRM: true } }),
        prisma.dRMSession.count({ where: { isHardwareDRM: false } }),
        prisma.dRMSession.groupBy({
            by: ['drmType'],
            _count: { drmType: true },
        }),
        prisma.dRMSession.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
                User: { select: { email: true, name: true } },
                Video: { select: { title: true } },
            },
        }),
    ]);

    const hardwarePercentage = totalSessions > 0
        ? ((hardwareDRMCount / totalSessions) * 100).toFixed(1)
        : '0';

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">DRM Security Monitoring</h1>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Total DRM Sessions</CardTitle>
                        <CardDescription>All recorded playback sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{totalSessions}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Hardware DRM (L1)</CardTitle>
                        <CardDescription>Secure hardware-backed DRM</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-green-600">
                            {hardwareDRMCount}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {hardwarePercentage}% of total sessions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Software DRM (L3)</CardTitle>
                        <CardDescription>Software-based DRM</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-orange-600">
                            {softwareDRMCount}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {(100 - parseFloat(hardwarePercentage)).toFixed(1)}% of total sessions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* DRM Type Breakdown */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>DRM System Distribution</CardTitle>
                    <CardDescription>Breakdown by DRM technology</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {drmTypeBreakdown.map((item) => (
                            <div key={item.drmType} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                        item.drmType === 'widevine' ? 'bg-blue-500' :
                                        item.drmType === 'playready' ? 'bg-purple-500' :
                                        'bg-green-500'
                                    }`}></div>
                                    <span className="font-medium capitalize">{item.drmType}</span>
                                </div>
                                <span className="text-2xl font-bold">{item._count.drmType}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent DRM Sessions</CardTitle>
                    <CardDescription>Latest 20 playback sessions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">User</th>
                                    <th className="text-left p-2">Video</th>
                                    <th className="text-left p-2">DRM Type</th>
                                    <th className="text-left p-2">Security Level</th>
                                    <th className="text-left p-2">Browser/OS</th>
                                    <th className="text-left p-2">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSessions.map((session) => (
                                    <tr key={session.id} className="border-b hover:bg-gray-50">
                                        <td className="p-2 text-sm">
                                            {session.User.name || session.User.email}
                                        </td>
                                        <td className="p-2 text-sm">{session.Video.title}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                session.drmType === 'widevine' ? 'bg-blue-100 text-blue-800' :
                                                session.drmType === 'playready' ? 'bg-purple-100 text-purple-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {session.drmType}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                session.isHardwareDRM
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-orange-100 text-orange-800'
                                            }`}>
                                                {session.isHardwareDRM ? 'Hardware (L1)' : 'Software (L3)'}
                                            </span>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {session.browser} on {session.os}
                                            {session.isMobile && <span className="ml-1">(Mobile)</span>}
                                        </td>
                                        <td className="p-2 text-sm text-gray-500">
                                            {new Date(session.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
