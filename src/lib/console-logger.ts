/**
 * Console Logger Utility
 * Automatically captures all console logs for error reporting
 */

export interface LogEntry {
    timestamp: number;
    level: 'log' | 'error' | 'warn' | 'info';
    message: string;
    args: any[];
    stack?: string;
    url: string;
}

class ConsoleLogger {
    private logs: LogEntry[] = [];
    private readonly maxLogs = 500;
    private originalConsole: {
        log: typeof console.log;
        error: typeof console.error;
        warn: typeof console.warn;
        info: typeof console.info;
    };

    constructor() {
        // Store original console methods
        this.originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console),
        };

        this.interceptConsole();
    }

    private interceptConsole(): void {
        const self = this;

        // Intercept console.log
        console.log = function (...args: any[]) {
            self.originalConsole.log(...args);
            self.addLog('log', args);
        };

        // Intercept console.error
        console.error = function (...args: any[]) {
            self.originalConsole.error(...args);
            self.addLog('error', args, new Error().stack);
        };

        // Intercept console.warn
        console.warn = function (...args: any[]) {
            self.originalConsole.warn(...args);
            self.addLog('warn', args);
        };

        // Intercept console.info
        console.info = function (...args: any[]) {
            self.originalConsole.info(...args);
            self.addLog('info', args);
        };
    }

    private addLog(
        level: LogEntry['level'],
        args: any[],
        stack?: string
    ): void {
        const message = args
            .map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            })
            .join(' ');

        // Sanitize sensitive data
        const sanitizedMessage = this.sanitize(message);

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message: sanitizedMessage,
            args: args.map(arg => this.sanitizeArg(arg)),
            url: typeof window !== 'undefined' ? window.location.href : '',
            ...(stack && { stack: this.sanitize(stack) }),
        };

        // Add to buffer (circular buffer - remove oldest if full)
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift(); // Remove oldest
        }
    }

    private sanitize(text: string): string {
        return text
            .replace(/password[=:\s]+\S+/gi, 'password=***')
            .replace(/token[=:\s]+\S+/gi, 'token=***')
            .replace(/api[_-]?key[=:\s]+\S+/gi, 'apikey=***')
            .replace(/bearer\s+\S+/gi, 'bearer ***')
            .replace(/authorization:\s*\S+/gi, 'authorization: ***')
            .replace(/\b\d{13,19}\b/g, '****'); // Credit card numbers
    }

    private sanitizeArg(arg: any): any {
        if (typeof arg === 'string') {
            return this.sanitize(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                const sanitized = JSON.parse(JSON.stringify(arg));
                // Sanitize common sensitive fields
                if (sanitized.password) sanitized.password = '***';
                if (sanitized.token) sanitized.token = '***';
                if (sanitized.apiKey) sanitized.apiKey = '***';
                if (sanitized.authorization) sanitized.authorization = '***';
                return sanitized;
            } catch (e) {
                return '[Circular or Non-Serializable Object]';
            }
        }
        return arg;
    }

    /**
     * Get all captured logs
     */
    public getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level
     */
    public getLogsByLevel(level: LogEntry['level']): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get error logs only
     */
    public getErrors(): LogEntry[] {
        return this.getLogsByLevel('error');
    }

    /**
     * Get recent logs (last N entries)
     */
    public getRecentLogs(count: number): LogEntry[] {
        return this.logs.slice(-count);
    }

    /**
     * Clear all logs
     */
    public clearLogs(): void {
        this.logs = [];
    }

    /**
     * Export logs as JSON
     */
    public exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Get log statistics
     */
    public getStats(): {
        total: number;
        errors: number;
        warnings: number;
        info: number;
        logs: number;
    } {
        return {
            total: this.logs.length,
            errors: this.logs.filter(l => l.level === 'error').length,
            warnings: this.logs.filter(l => l.level === 'warn').length,
            info: this.logs.filter(l => l.level === 'info').length,
            logs: this.logs.filter(l => l.level === 'log').length,
        };
    }
}

// Singleton instance
let loggerInstance: ConsoleLogger | null = null;

/**
 * Initialize console logger (call once in app initialization)
 */
export function initializeConsoleLogger(): ConsoleLogger {
    if (!loggerInstance) {
        loggerInstance = new ConsoleLogger();
        console.log('📝 Console logger initialized');
    }
    return loggerInstance;
}

/**
 * Get console logger instance
 */
export function getConsoleLogger(): ConsoleLogger | null {
    return loggerInstance;
}

/**
 * Get all console logs
 */
export function getConsoleLogs(): LogEntry[] {
    return loggerInstance?.getLogs() || [];
}

/**
 * Clear console logs
 */
export function clearConsoleLogs(): void {
    loggerInstance?.clearLogs();
}

/**
 * Get browser information for error reporting
 */
export function getBrowserInfo() {
    if (typeof window === 'undefined') {
        return null;
    }

    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        screenWidth: screen.width,
        screenHeight: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        memory: (performance as any).memory
            ? {
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            }
            : undefined,
    };
}
