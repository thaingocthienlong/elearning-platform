'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface TopErrorsChartProps {
    data: { message: string; count: number }[];
}

export default function TopErrorsChart({ data }: TopErrorsChartProps) {
    if (data.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                No errors recorded yet
            </p>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="message"
                    angle={-45}
                    textAnchor="end"
                    height={150}
                    interval={0}
                    tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-background border rounded-md p-3 shadow-lg">
                                    <p className="text-sm font-medium mb-1">
                                        Count: {payload[0].value}
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                        {payload[0].payload.message}
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Legend />
                <Bar dataKey="count" fill="#ff4444" name="Occurrences" />
            </BarChart>
        </ResponsiveContainer>
    );
}
