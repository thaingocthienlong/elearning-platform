'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';

interface LogEntry {
    timestamp: number;
    level: 'log' | 'error' | 'warn' | 'info';
    message: string;
    args?: any[];
    stack?: string;
    url?: string;
}

interface ConsoleLogsViewerProps {
    logs: LogEntry[];
}

export function ConsoleLogsViewer({ logs }: ConsoleLogsViewerProps) {
    const [expanded, setExpanded] = useState(false);
    const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'log'>('all');

    if (!logs || logs.length === 0) {
        return (
            <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">No console logs captured</p>
            </div>
        );
    }

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(log => log.level === filter);

    const logCounts = {
        total: logs.length,
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warn').length,
        info: logs.filter(l => l.level === 'info').length,
        logs: logs.filter(l => l.level === 'log').length,
    };

    const handleDownload = () => {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `console-logs-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getLogColor = (level: string): string => {
        switch (level) {
            case 'error': return 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-l-4 border-red-500';
            case 'warn': return 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300 border-l-4 border-yellow-500';
            case 'info': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-l-4 border-blue-500';
            default: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-l-4 border-gray-400';
        }
    };

    return (
        <div className="mt-4 border rounded-md">
            {/* Header */}
            <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold">Console Logs</h3>
                    <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-background rounded">Total: {logCounts.total}</span>
                        {logCounts.errors > 0 && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded">
                                Errors: {logCounts.errors}
                            </span>
                        )}
                        {logCounts.warnings > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 rounded">
                                Warnings: {logCounts.warnings}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Filter buttons */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="text-sm border rounded px-2 py-1 bg-background"
                    >
                        <option value="all">All ({logCounts.total})</option>
                        <option value="error">Errors ({logCounts.errors})</option>
                        <option value="warn">Warnings ({logCounts.warnings})</option>
                        <option value="info">Info ({logCounts.info})</option>
                        <option value="log">Logs ({logCounts.logs})</option>
                    </select>

                    <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON
                    </Button>
                    <Button
                        onClick={() => setExpanded(!expanded)}
                        variant="outline"
                        size="sm"
                    >
                        {expanded ? (
                            <><ChevronUp className="h-4 w-4 mr-2" /> Collapse</>
                        ) : (
                            <><ChevronDown className="h-4 w-4 mr-2" /> Expand</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Logs */}
            {expanded && (
                <div className="max-h-96 overflow-y-auto p-2">
                    {filteredLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No {filter} logs found
                        </p>
                    ) : (
                        filteredLogs.map((log, index) => (
                            <div
                                key={index}
                                className={`mb-2 p-3 rounded ${getLogColor(log.level)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span className="text-xs font-bold uppercase px-2 py-0.5 bg-background/50 rounded">
                                                {log.level}
                                            </span>
                                        </div>
                                        <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                                            {log.message}
                                        </pre>
                                        {log.stack && (
                                            <details className="mt-2">
                                                <summary className="text-xs cursor-pointer hover:underline">
                                                    Stack Trace
                                                </summary>
                                                <pre className="mt-1 text-xs overflow-x-auto bg-background/50 p-2 rounded">
                                                    {log.stack}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Collapsed preview */}
            {!expanded && (
                <div className="p-4">
                    <p className="text-sm text-muted-foreground">
                        {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} captured. Click "Expand" to view details.
                    </p>
                </div>
            )}
        </div>
    );
}
