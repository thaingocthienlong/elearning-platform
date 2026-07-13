'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type DialogMode = 'create' | 'edit';
type SupportedTable = 'user' | 'course' | 'enrollment';

interface CreateDialogProps {
    tableName: string;
    tableTitle: string;
    mode?: DialogMode;
    record?: Record<string, unknown> | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

interface Option {
    id: string;
    label: string;
}

const supportedTables: SupportedTable[] = ['user', 'course', 'enrollment'];

function initialData(tableName: string) {
    if (tableName === 'user') return { role: 'USER' };
    if (tableName === 'course') {
        return { published: false, accessType: 'VERIFY', thumbnail: '' };
    }
    return {};
}

function editableData(tableName: string, record: Record<string, unknown>) {
    if (tableName === 'user') {
        return {
            name: stringValue(record.name),
            email: stringValue(record.email),
            role: stringValue(record.role) || 'USER',
        };
    }
    if (tableName === 'course') {
        return {
            title: stringValue(record.title),
            thumbnail: stringValue(record.thumbnail),
            published: booleanValue(record.published),
            accessType: stringValue(record.accessType) || 'VERIFY',
        };
    }
    return {
        userId: stringValue(record.userId),
        courseId: stringValue(record.courseId),
    };
}

function stringValue(value: unknown) {
    return typeof value === 'string' ? value : '';
}

function booleanValue(value: unknown) {
    return value === true;
}

function responseError(text: string) {
    try {
        const parsed = JSON.parse(text) as { error?: unknown };
        if (typeof parsed.error === 'string') return parsed.error;
    } catch {
        // The API may return a plain-text authorization error.
    }
    return text || 'Admin record mutation failed';
}

export function CreateDialog({
    tableName,
    tableTitle,
    mode = 'create',
    record = null,
    open: controlledOpen,
    onOpenChange,
    onSuccess,
}: CreateDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, unknown>>(() =>
        mode === 'edit' && record ? editableData(tableName, record) : initialData(tableName)
    );
    const [loading, setLoading] = useState(false);
    const [userOptions, setUserOptions] = useState<Option[]>([]);
    const [courseOptions, setCourseOptions] = useState<Option[]>([]);
    const open = controlledOpen ?? internalOpen;
    const singularTitle = tableTitle.endsWith('s') ? tableTitle.slice(0, -1) : tableTitle;

    const setOpen = (nextOpen: boolean) => {
        if (nextOpen && mode === 'create') setFormData(initialData(tableName));
        if (controlledOpen === undefined) setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
    };

    useEffect(() => {
        if (!open || tableName !== 'enrollment') return;

        let cancelled = false;
        const loadOptions = async (type: 'user' | 'course') => {
            const response = await fetch(`/api/admin/options?type=${type}`);
            if (!response.ok) throw new Error(`Unable to load ${type} options`);
            const options = (await response.json()) as Option[];
            if (!cancelled) {
                if (type === 'user') setUserOptions(options);
                else setCourseOptions(options);
            }
        };

        Promise.all([loadOptions('user'), loadOptions('course')]).catch((error: unknown) => {
            if (!cancelled) {
                toast.error(error instanceof Error ? error.message : 'Unable to load form options');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [open, tableName]);

    if (!supportedTables.includes(tableName as SupportedTable)) return null;

    const updateField = (field: string, value: unknown) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (loading) return;

        const id = stringValue(record?.id);
        if (mode === 'edit' && !id) {
            toast.error('Cannot edit a record without an ID');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/create', {
                method: mode === 'edit' ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: tableName,
                    ...(mode === 'edit' ? { id } : {}),
                    data: formData,
                }),
            });

            if (!response.ok) {
                throw new Error(responseError(await response.text()));
            }

            setOpen(false);
            setFormData(initialData(tableName));
            toast.success(`Record ${mode === 'edit' ? 'updated' : 'created'} successfully`);
            if (onSuccess) onSuccess();
            else window.location.reload();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Admin record mutation failed');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => {
        if (tableName === 'user') {
            return (
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-name`}>Name</Label>
                        <Input
                            id={`${mode}-name`}
                            value={stringValue(formData.name)}
                            onChange={(event) => updateField('name', event.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-email`}>Email</Label>
                        <Input
                            id={`${mode}-email`}
                            type="email"
                            value={stringValue(formData.email)}
                            onChange={(event) => updateField('email', event.target.value)}
                            required={mode === 'create'}
                            disabled={mode === 'edit'}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-role`}>Role</Label>
                        <Select
                            value={stringValue(formData.role) || 'USER'}
                            onValueChange={(value) => updateField('role', value)}
                        >
                            <SelectTrigger id={`${mode}-role`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">USER</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }

        if (tableName === 'course') {
            return (
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-title`}>Title</Label>
                        <Input
                            id={`${mode}-title`}
                            value={stringValue(formData.title)}
                            onChange={(event) => updateField('title', event.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-thumbnail`}>Thumbnail URL (optional)</Label>
                        <Input
                            id={`${mode}-thumbnail`}
                            value={stringValue(formData.thumbnail)}
                            onChange={(event) => updateField('thumbnail', event.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${mode}-access-type`}>Access Type</Label>
                        <Select
                            value={stringValue(formData.accessType) || 'VERIFY'}
                            onValueChange={(value) => updateField('accessType', value)}
                        >
                            <SelectTrigger id={`${mode}-access-type`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VERIFY">VERIFY</SelectItem>
                                <SelectItem value="OPEN">OPEN</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id={`${mode}-published`}
                            type="checkbox"
                            checked={booleanValue(formData.published)}
                            onChange={(event) => updateField('published', event.target.checked)}
                        />
                        <Label htmlFor={`${mode}-published`}>Published</Label>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-user`}>User</Label>
                    <Select
                        value={stringValue(formData.userId)}
                        onValueChange={(value) => updateField('userId', value)}
                        required
                    >
                        <SelectTrigger id={`${mode}-user`}>
                            <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                            {userOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${mode}-course`}>Course</Label>
                    <Select
                        value={stringValue(formData.courseId)}
                        onValueChange={(value) => updateField('courseId', value)}
                        required
                    >
                        <SelectTrigger id={`${mode}-course`}>
                            <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                            {courseOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {mode === 'create' && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New {singularTitle}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{mode === 'edit' ? 'Edit' : 'Create New'} {singularTitle}</DialogTitle>
                        <DialogDescription>
                            {mode === 'edit' ? 'Update this record.' : `Add a new ${singularTitle.toLowerCase()} to the database.`}
                        </DialogDescription>
                    </DialogHeader>
                    {renderForm()}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save Changes' : 'Create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
