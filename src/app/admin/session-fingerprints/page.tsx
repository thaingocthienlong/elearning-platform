'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Smartphone, Monitor, Shield, AlertTriangle, Trash2, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminData } from '@/hooks/admin/useAdminData';

interface SessionFingerprint {
  id: string;
  userId: string;
  fingerprint: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastActive: string;
  expires: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  uniqueUsers: number;
  suspiciousCount: number;
}

export default function SessionFingerprintsPage() {
  const { t } = useLanguage();
  // Local state for metadata not handled by the lists hook directly
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Use shared hook for data fetching
  const {
    data: sessions,
    loading,
    filters,
    updateFilter,
    refetch: fetchSessions
  } = useAdminData<SessionFingerprint>({
    endpoint: '/api/admin/session-fingerprints',
    initialFilters: {
      page: '1',
      limit: '20',
      search: '',
      suspicious: 'false'
    },
    transform: (data) => {
      // Side effects to update metadata
      setStats(data.stats);
      setTotalPages(data.totalPages);
      return data.sessions;
    }
  });

  // Sync page state with filters
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateFilter('page', newPage.toString());
  };

  const handleSearchChange = (value: string) => {
    updateFilter('search', value);
    setPage(1);
    updateFilter('page', '1');
  };

  const toggleSuspicious = () => {
    const current = filters.suspicious === 'true';
    const newValue = (!current).toString();
    updateFilter('suspicious', newValue);
    setPage(1);
    updateFilter('page', '1');
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session fingerprint?')) return;

    try {
      const response = await fetch(`/api/admin/session-fingerprints/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke session');

      await fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      alert('Failed to revoke session');
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const isSessionActive = (lastActive: string) => {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / 1000 / 60;
    return diffMinutes < 30; // Active if seen in last 30 minutes
  };

  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown Device';

    // Extract browser
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // Extract OS
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Session Fingerprints</h1>
        <p className="text-muted-foreground">
          Monitor and manage user session fingerprints for security tracking
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('multipleIpsDetected')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.suspiciousCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Session Fingerprints</CardTitle>
          <CardDescription>View all user sessions and their fingerprints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

              <Input
                placeholder={t('searchUserOrVideo')}
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="mt-4 flex items-center">
              <Button
                variant={filters.suspicious === 'true' ? "destructive" : "outline"}
                onClick={toggleSuspicious}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                {t('showSuspiciousOnly')}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No session fingerprints found
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(session.userAgent)}
                        <div>
                          <div className="font-medium">{session.user.email}</div>
                          {session.user.name && (
                            <div className="text-sm text-muted-foreground">
                              {session.user.name}
                            </div>
                          )}
                        </div>
                        {isSessionActive(session.lastActive) && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <div className="h-2 w-2 rounded-full bg-green-600 mr-2 animate-pulse" />
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Device: </span>
                          <span className="font-mono">{formatUserAgent(session.userAgent)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">IP: </span>
                          <span className="font-mono">{session.ipAddress || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fingerprint: </span>
                          <span className="font-mono text-xs">
                            {session.fingerprint ? session.fingerprint.substring(0, 16) + '...' : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expires: </span>
                          {new Date(session.expires).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Active: </span>
                          {new Date(session.lastActive).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
