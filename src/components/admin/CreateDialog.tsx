'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
import { Plus } from 'lucide-react';

interface CreateDialogProps {
    tableName: string;
    tableTitle: string;
}

interface Option {
    id: string;
    label: string;
}

export function CreateDialog({ tableName, tableTitle }: CreateDialogProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [userOptions, setUserOptions] = useState<Option[]>([]);
    const [courseOptions, setCourseOptions] = useState<Option[]>([]);

    useEffect(() => {
        if (open) {
            // Fetch options when dialog opens
            if (tableName === 'enrollment' || tableName === 'video') {
                fetch('/api/admin/options?type=course')
                    .then((res) => res.json())
                    .then(setCourseOptions)
                    .catch(console.error);
            }
            if (tableName === 'enrollment') {
                fetch('/api/admin/options?type=user')
                    .then((res) => res.json())
                    .then(setUserOptions)
                    .catch(console.error);
            }
        }
    }, [open, tableName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/admin/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, data: formData }),
            });

            if (response.ok) {
                setOpen(false);
                setFormData({});
                toast.success('Record created successfully');
                window.location.reload();
            } else {
                const error = await response.text();
                toast.error(`Error: ${error}`);
            }
        } catch (error) {
            console.error('Create failed:', error);
            toast.error('Failed to create record');
        } finally {
            setLoading(false);
        }
    };

    const renderForm = () => {
        switch (tableName) {
            case 'user':
                return (
                    <>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.role || 'USER'}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">USER</SelectItem>
                                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </>
                );

            case 'course':
                return (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title || ''}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="thumbnail">Thumbnail URL (optional)</Label>
                            <Input
                                id="thumbnail"
                                value={formData.thumbnail || ''}
                                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="published"
                                checked={formData.published || false}
                                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                            />
                            <Label htmlFor="published">Published</Label>
                        </div>
                    </div>
                );

            case 'video':
                return (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title || ''}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="courseId">Course</Label>
                            <Select
                                value={formData.courseId || ''}
                                onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="position">Position</Label>
                            <Input
                                id="position"
                                type="number"
                                value={formData.position || 0}
                                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="published"
                                checked={formData.published || false}
                                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                            />
                            <Label htmlFor="published">Published</Label>
                        </div>
                    </div>
                );

            case 'enrollment':
                return (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="userId">User</Label>
                            <Select
                                value={formData.userId || ''}
                                onValueChange={(value) => setFormData({ ...formData, userId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="courseId">Course</Label>
                            <Select
                                value={formData.courseId || ''}
                                onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'ticket':
                return (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status || 'WAITING'}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WAITING">WAITING</SelectItem>
                                    <SelectItem value="RESOLVING">RESOLVING</SelectItem>
                                    <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            default:
                return <div>Form not configured for this table</div>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New {tableTitle.slice(0, -1)}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New {tableTitle.slice(0, -1)}</DialogTitle>
                        <DialogDescription>
                            Add a new {tableTitle.toLowerCase().slice(0, -1)} to the database.
                        </DialogDescription>
                    </DialogHeader>
                    {renderForm()}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
