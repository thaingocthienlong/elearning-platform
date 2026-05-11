'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DemographicsChartsProps {
    browserData: { browser: string; count: number }[];
    osData: { os: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DemographicsCharts({ browserData, osData }: DemographicsChartsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Browser Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Browser Breakdown</CardTitle>
                    <CardDescription>
                        Tickets by browser type
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {browserData.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No browser data available
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={browserData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="browser"
                                >
                                    {browserData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* OS Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Operating System Breakdown</CardTitle>
                    <CardDescription>
                        Tickets by operating system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {osData.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No OS data available
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={osData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) =>
                                        `${name} ${(percent * 100).toFixed(0)}%`
                                    }
                                    outerRadius={80}
                                    fill="#82ca9d"
                                    dataKey="count"
                                    nameKey="os"
                                >
                                    {osData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
