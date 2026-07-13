'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { CreateDialog } from './CreateDialog';

interface Column<T> {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => React.ReactNode;
}

interface GenericTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title: string;
    tableName: string;
}

export function GenericTable<T extends { id: string; isDeleted?: boolean }>({
    data,
    columns,
    title,
    tableName,
}: GenericTableProps<T>) {
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    const filteredData = data.filter((item) =>
        Object.values(item).some(
            (val) =>
                typeof val === 'string' &&
                val.toLowerCase().includes(search.toLowerCase())
        )
    );

    const toggleSelect = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === filteredData.length) {
            setSelected([]);
        } else {
            setSelected(filteredData.map((item) => item.id));
        }
    };

    const runAction = async (ids: string[], action: 'delete' | 'restore') => {
        if (isProcessing) return;
        if (ids.length === 0) return;
        if (action === 'delete') {
            const confirmed = window.confirm(
                `Delete ${ids.length} ${ids.length === 1 ? 'record' : 'records'}? You can restore them later.`
            );
            if (!confirmed) return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/admin/table-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, ids, action }),
            });

            if (!response.ok) {
                const body = await response.text();
                let message = body;
                try {
                    const parsed = JSON.parse(body) as { error?: unknown };
                    if (typeof parsed.error === 'string') message = parsed.error;
                } catch {
                    // Keep the plain-text response.
                }
                throw new Error(message || `Unable to ${action} records`);
            }

            toast.success(`${ids.length} ${ids.length === 1 ? 'record' : 'records'} ${action === 'delete' ? 'deleted' : 'restored'}`);
            window.location.reload();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Unable to ${action} records`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEdit = (item: T) => {
        setEditingItem(item);
        setEditOpen(true);
    };

    const itemLabel = (item: T) => {
        const values = item as T & { name?: unknown; title?: unknown; email?: unknown };
        const label = values.name ?? values.title ?? values.email ?? item.id;
        return String(label);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{title}</h2>
                <div className="flex items-center gap-2">
                    <CreateDialog tableName={tableName} tableTitle={title} />
                    {selected.length > 0 && (
                        <>
                            <Button variant="destructive" size="sm" onClick={() => runAction(selected, 'delete')} disabled={isProcessing}>
                                {isProcessing ? (
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <Trash className="mr-2 h-4 w-4" />
                                )}
                                Delete ({selected.length})
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => runAction(selected, 'restore')} disabled={isProcessing}>
                                {isProcessing ? (
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                )}
                                Restore ({selected.length})
                            </Button>
                        </>
                    )}
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-64"
                    />
                </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={
                                        filteredData.length > 0 &&
                                        selected.length === filteredData.length
                                    }
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            {columns.map((col) => (
                                <TableHead key={String(col.accessorKey)}>{col.header}</TableHead>
                            ))}
                            <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((item) => (
                            <TableRow
                                key={item.id}
                                className={item.isDeleted ? 'opacity-50 bg-muted/50' : ''}
                            >
                                <TableCell>
                                    <Checkbox
                                        checked={selected.includes(item.id)}
                                        onCheckedChange={() => toggleSelect(item.id)}
                                    />
                                </TableCell>
                                {columns.map((col) => (
                                    <TableCell key={String(col.accessorKey)}>
                                        {col.cell
                                            ? col.cell(item)
                                            : (item[col.accessorKey] as React.ReactNode)}
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild disabled={isProcessing}>
                                            <Button variant="ghost" size="icon" aria-label={`Actions for ${itemLabel(item)}`}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {!item.isDeleted && (
                                                <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                            )}
                                            {item.isDeleted ? (
                                                <DropdownMenuItem onClick={() => runAction([item.id], 'restore')}>
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Restore
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => runAction([item.id], 'delete')}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <CreateDialog
                key={editingItem?.id ?? 'edit-dialog'}
                tableName={tableName}
                tableTitle={title}
                mode="edit"
                record={editingItem as unknown as Record<string, unknown> | null}
                open={editOpen}
                onOpenChange={(nextOpen) => {
                    setEditOpen(nextOpen);
                    if (!nextOpen) setEditingItem(null);
                }}
            />
        </div>
    );
}
