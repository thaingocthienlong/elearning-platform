export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface AdminTableProps<T> {
    data: T[];
    loading: boolean;
    onRefresh: () => void;
    filters?: Record<string, any>;
    onFilterChange?: (filters: Record<string, any>) => void;
}

export interface PlayerConfiguration {
    drm?: {
        servers?: {
            [key: string]: string;
        };
        advanced?: {
            [key: string]: {
                videoRobustness?: string;
                audioRobustness?: string;
            };
        };
        clearKeys?: {
            [key: string]: string;
        };
    };
    streaming?: {
        bufferingGoal?: number;
        rebufferingGoal?: number;
        bufferBehind?: number;
        retryParameters?: {
            maxAttempts?: number;
            baseDelay?: number;
            backoffFactor?: number;
        };
    };
}
