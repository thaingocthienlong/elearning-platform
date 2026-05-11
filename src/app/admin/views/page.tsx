'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { useAdminFilters } from '@/hooks/admin/useAdminFilters';
import { useTablePagination } from '@/hooks/admin/useTablePagination';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Loader2 } from 'lucide-react';

interface WatchRecord {
    id: string;
    userId: string;
    videoId: string;
    lastPosition: number;
    viewCount: number;
    viewLimit: number | null;
    lastViewedAt: string;
    userName: string;
    userEmail: string;
    videoTitle: string;
    videoViewLimit: number | null;
}

export default function ViewsManagementPage() {
    const { t } = useLanguage();

    // Shared hooks implementation
    const {
        data: records,
        loading,
        refetch: fetchRecords
    } = useAdminData<WatchRecord>({
        endpoint: '/api/admin/views'
    });

    const {
        searchQuery,
        setSearchQuery,
        filteredData: filteredRecords
    } = useAdminFilters(records, ['userName', 'userEmail', 'videoTitle']);

    const {
        paginatedData,
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        setPageSize
    } = useTablePagination(filteredRecords, 10);

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<WatchRecord | null>(null);
    const [editData, setEditData] = useState({
        lastPosition: 0,
        viewCount: 0,
        viewLimit: null as number | null,
    });

    // fetchRecords handled by hook

    const handleEdit = (record: WatchRecord) => {
        setSelectedRecord(record);
        setEditData({
            lastPosition: record.lastPosition,
            viewCount: record.viewCount,
            viewLimit: record.viewLimit,
        });
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedRecord) return;

        try {
            const response = await fetch('/api/admin/views', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedRecord.id,
                    lastPosition: editData.lastPosition,
                    viewCount: editData.viewCount,
                    viewLimit: editData.viewLimit,
                }),
            });

            if (response.ok) {
                setEditDialogOpen(false);
                setSelectedRecord(null);
                fetchRecords();
                toast.success('View record updated successfully');
            } else {
                const error = await response.text();
                toast.error(`Error: ${error}`);
            }
        } catch (error) {
            console.error('Failed to update record:', error);
            toast.error(t('failedToUpdate'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDeleteRecord'))) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/views?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchRecords();
                toast.success('View record deleted successfully');
            } else {
                const error = await response.text();
                toast.error(`Error: ${error}`);
            }
        } catch (error) {
            console.error('Failed to delete record:', error);
            toast.error(t('failedToDelete'));
        }
    };



    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('viewsManagement')}</h1>
                    <p className="text-muted-foreground">{t('manageViewHistory')}</p>
                </div>
                <Input
                    placeholder={t('searchUserOrVideo')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64"
                />
            </div>

            {loading ? (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('user')}</TableHead>
                                <TableHead>{t('video')}</TableHead>
                                <TableHead>{t('lastPosition')}</TableHead>
                                <TableHead>{t('viewCount')}</TableHead>
                                <TableHead>{t('viewLimit')}</TableHead>
                                <TableHead>{t('lastViewed')}</TableHead>
                                <TableHead className="w-24">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-10 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-40" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-16" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-12" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('user')}</TableHead>
                                <TableHead>{t('video')}</TableHead>
                                <TableHead>{t('lastPosition')}</TableHead>
                                <TableHead>{t('viewCount')}</TableHead>
                                <TableHead>{t('viewLimit')}</TableHead>
                                <TableHead>{t('lastViewed')}</TableHead>
                                <TableHead className="w-24">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        {t('noViewRecords')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{record.userName || 'No name'}</p>
                                                <p className="text-sm text-muted-foreground">{record.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="truncate">{record.videoTitle}</p>
                                        </TableCell>
                                        <TableCell>{formatDuration(record.lastPosition)}</TableCell>
                                        <TableCell>
                                            <span className={record.viewLimit !== null && record.viewCount >= record.viewLimit ? 'text-destructive font-semibold' : ''}>
                                                {record.viewCount}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {record.viewLimit !== null ? (
                                                <span className={record.viewCount >= record.viewLimit ? 'text-destructive font-semibold' : ''}>
                                                    {record.viewLimit}
                                                </span>
                                            ) : record.videoViewLimit !== null ? (
                                                <span className="text-muted-foreground">{t('defaultLimit', { limit: record.videoViewLimit })}</span>
                                            ) : (
                                                <span className="text-muted-foreground">{t('unlimited')}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(record.lastViewedAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(record)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(record.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 p-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={prevPage}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <div className="text-sm font-medium">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={nextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('editViewRecord')}</DialogTitle>
                        <DialogDescription>
                            {t('editViewRecordDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>{t('user')}</Label>
                                <p className="text-sm">{selectedRecord.userName} ({selectedRecord.userEmail})</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('video')}</Label>
                                <p className="text-sm">{selectedRecord.videoTitle}</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastPosition">{t('lastPositionSeconds')}</Label>
                                <Input
                                    id="lastPosition"
                                    type="number"
                                    value={editData.lastPosition}
                                    onChange={(e) =>
                                        setEditData({ ...editData, lastPosition: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="viewCount">{t('viewCount')}</Label>
                                <Input
                                    id="viewCount"
                                    type="number"
                                    value={editData.viewCount}
                                    onChange={(e) =>
                                        setEditData({ ...editData, viewCount: parseInt(e.target.value) || 0 })
                                    }
                                    min="0"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="viewLimit">{t('perUserViewLimit')}</Label>
                                <Input
                                    id="viewLimit"
                                    type="number"
                                    value={editData.viewLimit ?? ''}
                                    onChange={(e) =>
                                        setEditData({
                                            ...editData,
                                            viewLimit: e.target.value === '' ? null : parseInt(e.target.value) || 0
                                        })
                                    }
                                    min="0"
                                    placeholder={selectedRecord?.videoViewLimit !== null
                                        ? t('viewLimitPlaceholderDefault', { limit: selectedRecord?.videoViewLimit })
                                        : t('viewLimitPlaceholderUnlimited')}
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('viewLimitHint')}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button onClick={handleSaveEdit}>{t('saveChanges')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
