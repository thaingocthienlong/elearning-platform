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

    const handleBatchDelete = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/admin/table-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, ids: selected, action: 'delete' }),
            });

            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            setIsProcessing(false);
        }
    };

    const handleBatchRestore = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/admin/table-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, ids: selected, action: 'restore' }),
            });

            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Restore failed:', error);
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/admin/table-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, ids: [id], action: 'delete' }),
            });

            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Delete failed:', error);
            setIsProcessing(false);
        }
    };

    const handleRestore = async (id: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const response = await fetch('/api/admin/table-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, ids: [id], action: 'restore' }),
            });

            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Restore failed:', error);
            setIsProcessing(false);
        }
    };

    const handleEdit = (item: T) => {
        // Edit functionality placeholder
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{title}</h2>
                <div className="flex items-center gap-2">
                    <CreateDialog tableName={tableName} tableTitle={title} />
                    {selected.length > 0 && (
                        <>
                            <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={isProcessing}>
                                {isProcessing ? (
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <Trash className="mr-2 h-4 w-4" />
                                )}
                                Delete ({selected.length})
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleBatchRestore} disabled={isProcessing}>
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
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            {item.isDeleted ? (
                                                <DropdownMenuItem onClick={() => handleRestore(item.id)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Restore
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(item.id)}
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
        </div>
    );
}
