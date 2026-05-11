'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

interface ErrorTrendsChartProps {
    data: { date: string; count: number }[];
}

export default function ErrorTrendsChart({ data }: ErrorTrendsChartProps) {
    if (data.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">
                No trend data available
            </p>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ff4444"
                    strokeWidth={2}
                    name="Errors"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
