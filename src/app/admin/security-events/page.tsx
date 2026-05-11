'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, AlertTriangle, Eye, Monitor, Activity, Trash2 } from 'lucide-react';
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

interface SecurityEvent {
  id: string;
  userId: string;
  videoId: string | null;
  eventType: string;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  User: {
    name: string | null;
    email: string;
  };
  Video?: {
    title: string;
  } | null;
}

const eventTypeColors: Record<string, string> = {
  SCREEN_CAPTURE_DETECTED: 'bg-red-500',
  TAB_SWITCH_WHILE_WATCHING: 'bg-yellow-500',
  DEVTOOLS_LIKELY_OPEN: 'bg-orange-500',
  DEFAULT: 'bg-blue-500',
};

const eventTypeIcons: Record<string, any> = {
  SCREEN_CAPTURE_DETECTED: AlertTriangle,
  TAB_SWITCH_WHILE_WATCHING: Eye,
  DEVTOOLS_LIKELY_OPEN: Monitor,
  DEFAULT: Activity,
};

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(eventTypeFilter !== 'all' && { eventType: eventTypeFilter }),
      });

      const response = await fetch(`/api/admin/security-events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventTypeFilter]);

  const handleFlush = async () => {
    setIsFlushing(true);
    try {
      const response = await fetch('/api/admin/security-events', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to flush events');
      }

      const data = await response.json();
      toast.success(`Success`, {
        description: `Flushed ${data.count} security events`,
      });
      fetchEvents();
    } catch (error) {
      console.error('Flush error:', error);
      toast.error('Error', {
        description: 'Failed to flush security events',
      });
    } finally {
      setIsFlushing(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const getEventColor = (eventType: string) => {
    return eventTypeColors[eventType] || eventTypeColors.DEFAULT;
  };

  const getEventIcon = (eventType: string) => {
    const Icon = eventTypeIcons[eventType] || eventTypeIcons.DEFAULT;
    return <Icon className="h-4 w-4" />;
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Security Events</h1>
        <p className="text-muted-foreground">
          Monitor and track security-related events across the platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Screen Captures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {events.filter((e) => e.eventType === 'SCREEN_CAPTURE_DETECTED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tab Switches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {events.filter((e) => e.eventType === 'TAB_SWITCH_WHILE_WATCHING').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DevTools Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {events.filter((e) => e.eventType === 'DEVTOOLS_LIKELY_OPEN').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user email or video title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="SCREEN_CAPTURE_DETECTED">Screen Capture</SelectItem>
                <SelectItem value="TAB_SWITCH_WHILE_WATCHING">Tab Switch</SelectItem>
                <SelectItem value="DEVTOOLS_LIKELY_OPEN">DevTools</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button type="button" variant="outline" onClick={fetchEvents}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <div className="ml-2 border-l pl-4 flex items-center">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={loading || events.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Flush All
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action will permanently delete ALL security event logs from the database.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleFlush}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white"
                    >
                      {isFlushing ? 'Flushing...' : 'Yes, Delete All'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No security events found
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge className={getEventColor(event.eventType)}>
                          <span className="mr-1">{getEventIcon(event.eventType)}</span>
                          {formatEventType(event.eventType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.User.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{event.User.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.Video ? (
                          <p className="max-w-[200px] truncate">{event.Video.title}</p>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {event.ipAddress || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {event.metadata && (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-blue-600 hover:underline">
                              View
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-muted rounded max-w-[300px] overflow-auto">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div >
  );
}
