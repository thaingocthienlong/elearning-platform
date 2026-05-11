'use client';

import { useState, useEffect } from 'react';
import { useAdminData } from '@/hooks/admin/useAdminData';
import { useAdminFilters } from '@/hooks/admin/useAdminFilters';
import { useTablePagination } from '@/hooks/admin/useTablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Upload } from 'lucide-react';

interface AllowedEmail {
    id: string;
    fullname: string | null;
    phone: string | null;
    email: string;
    notes: string | null;
    createdAt: string;
    createdBy: string | null;
}

export default function WhitelistPage() {
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    // Removed local emails, loading, search state as they are now managed by hooks

    const {
        data: emails,
        loading,
        refetch: refreshEmails
    } = useAdminData<AllowedEmail>({
        endpoint: '/api/admin/whitelist'
    });

    const {
        searchQuery,
        setSearchQuery,
        filteredData: filteredEmails
    } = useAdminFilters(emails, ['fullname', 'email', 'phone', 'notes']);

    const {
        paginatedData,
        currentPage,
        totalPages,
        nextPage,
        prevPage,
        setPageSize
    } = useTablePagination(filteredEmails, 10);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [newFullname, setNewFullname] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    // const [search, setSearch] = useState(''); // Replaced by searchQuery
    const [submitting, setSubmitting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        // fetchEmails handled by hook
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/admin/options?type=course');
            if (response.ok) {
                const data = await response.json();
                // API returns {id, label} format, transform to {id, title}
                setCourses(data.map((c: { id: string, label: string }) => ({
                    id: c.id,
                    title: c.label
                })));
            }
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        try {
            const response = await fetch('/api/admin/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullname: newFullname,
                    phone: newPhone,
                    email: newEmail,
                    notes,
                    courseId: selectedCourse || null
                }),
            });

            if (response.ok) {
                setDialogOpen(false);
                setNewFullname('');
                setNewPhone('');
                setNewEmail('');
                setNotes('');
                setSelectedCourse('');
                refreshEmails();
                toast.success('Email added to whitelist successfully');
            } else {
                const error = await response.text();
                toast.error(error);
            }
        } catch (error) {
            console.error('Failed to add email:', error);
            toast.error('Failed to add email');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBulkImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (importing) return;

        setImporting(true);
        try {
            // Parse CSV format: "fullname, phone, email" one per line
            const entries = bulkText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const parts = line.split(',').map(p => p.trim());
                    return {
                        fullname: parts[0] || '',
                        phone: parts[1] || '',
                        email: parts[2] || parts[0] // Fallback to single value if not CSV
                    };
                });

            const response = await fetch('/api/admin/whitelist/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entries,
                    courseId: selectedCourse || null,
                }),
            });

            if (response.ok) {
                const results = await response.json();
                const message = `Import Complete!

Whitelisted: ${results.whitelisted} (${results.duplicateWhitelist} duplicates skipped)
Users Created: ${results.usersCreated}
Enrollments Created: ${results.enrollmentsCreated} (${results.duplicateEnrollments} duplicates skipped)

${results.errors.length > 0 ? `\nErrors:\n${results.errors.join('\n')}` : ''}`;

                toast.success(message);
                setBulkDialogOpen(false);
                setBulkText('');
                setSelectedCourse('');
                refreshEmails();
            } else {
                const error = await response.text();
                toast.error(`Error: ${error}`);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to bulk import:', error);
            toast.error(`Failed to import: ${message}`);
        } finally {
            setImporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (deletingId) return;

        if (!confirm('Are you sure you want to remove this email from the whitelist?')) {
            return;
        }

        setDeletingId(id);
        try {
            const response = await fetch(`/api/admin/whitelist?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                refreshEmails();
            }
        } catch (error) {
            console.error('Failed to delete email:', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Email Whitelist</h1>
                <div className="flex items-center gap-2">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Email
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleAdd}>
                                <DialogHeader>
                                    <DialogTitle>Add Email to Whitelist</DialogTitle>
                                    <DialogDescription>
                                        Users with whitelisted emails can sign up and access the platform.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="fullname">Full Name</Label>
                                        <Input
                                            id="fullname"
                                            value={newFullname}
                                            onChange={(e) => setNewFullname(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            placeholder="+1234567890"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="user@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="notes">Notes (optional)</Label>
                                        <Input
                                            id="notes"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Reason for whitelisting..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="add-course">Course (optional)</Label>
                                        <select
                                            id="add-course"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <option value="">No course (whitelist only)</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>
                                                    {course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => {
                                        setDialogOpen(false);
                                        setSelectedCourse('');
                                    }} disabled={submitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Adding...' : 'Add'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" />
                                Bulk Import
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[525px]">
                            <form onSubmit={handleBulkImport}>
                                <DialogHeader>
                                    <DialogTitle>Bulk Import with Course Enrollment</DialogTitle>
                                    <DialogDescription>
                                        Enter entries in CSV format: "fullname, phone, email" (one per line). Optionally select a course to enroll them in.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="course">Course (optional)</Label>
                                        <select
                                            id="course"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <option value="">No course (whitelist only)</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>
                                                    {course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="bulk">Entries (CSV Format)</Label>
                                        <textarea
                                            id="bulk"
                                            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={bulkText}
                                            onChange={(e) => setBulkText(e.target.value)}
                                            placeholder="John Doe, +1234567890, john@example.com&#10;Jane Smith, +0987654321, jane@example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setBulkDialogOpen(false);
                                            setBulkText('');
                                            setSelectedCourse('');
                                        }}
                                        disabled={importing}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={importing}>
                                        {importing ? 'Importing...' : 'Import'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Input
                        placeholder="Search emails..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />
                </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead className="w-12">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Skeleton className="h-4 w-32" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-28" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-40" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-48" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-4 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-8 w-8" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    No whitelisted emails found
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.fullname || '-'}</TableCell>
                                    <TableCell>{item.phone || '-'}</TableCell>
                                    <TableCell>{item.email}</TableCell>
                                    <TableCell>{item.notes || '-'}</TableCell>
                                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                        >
                                            {deletingId === item.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
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
    );
}
