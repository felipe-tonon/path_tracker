'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  List,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Cpu,
  AlertCircle,
  CheckCircle,
  X,
  ExternalLink,
  Copy,
  Hash,
  User,
  Server,
  DollarSign,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  event_id: string;
  request_id: string;
  user_id: string | null;
  environment: string | null;
  request_timestamp: string;
  response_timestamp: string;
  type: 'rest' | 'llm';
  service: string;
  method?: string;
  url: string;
  status_code: number;
  latency_ms: number;
  provider?: string;
  model?: string;
  total_tokens?: number;
  cost_usd?: number;
  finish_reason?: string;
  request_body?: Record<string, unknown> | null;
  response_body?: Record<string, unknown> | null;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export default function LogsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Detail panel
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestBodyExpanded, setRequestBodyExpanded] = useState(true);
  const [responseBodyExpanded, setResponseBodyExpanded] = useState(true);

  // Filters - initialize from URL params
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('request_id') || '');
  const [userFilter, setUserFilter] = useState(() => searchParams.get('user_id') || '');
  const [typeFilter, setTypeFilter] = useState<'all' | 'rest' | 'llm'>('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | 'custom'>('24h');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const limit = 50;

  // Mark as initialized after first render
  useEffect(() => {
    setInitialized(true);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startTime: Date;
      let endTime: Date = now;

      if (timeRange === 'custom' && dateFrom) {
        startTime = new Date(dateFrom);
        endTime = dateTo ? new Date(dateTo + 'T23:59:59') : now;
      } else {
        switch (timeRange) {
          case '1h':
            startTime = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case '6h':
            startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            break;
          case '7d':
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          default: // 24h
            startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
      }

      const params = new URLSearchParams({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        limit: limit.toString(),
        offset: (page * limit).toString(),
        include_bodies: 'true',
      });

      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      if (serviceFilter) {
        params.set('service', serviceFilter);
      }
      if (searchQuery) {
        params.set('request_id', searchQuery);
      }
      if (userFilter) {
        params.set('user_id', userFilter);
      }
      if (statusFilter !== null) {
        params.set('status_code', statusFilter.toString());
      }

      const response = await fetch(`/api/v1/logs?${params}`);

      if (response.ok) {
        const data: LogsResponse = await response.json();
        setLogs(data.logs);
        setTotal(data.total);
      } else if (response.status === 401) {
        setError('Please sign in to view logs');
      } else {
        setError('Failed to load logs');
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, page, timeRange, typeFilter, userFilter, searchQuery, serviceFilter, statusFilter, dateFrom, dateTo]);

  const handleSearch = () => {
    setPage(0);
  };

  const handleUserClick = (userId: string) => {
    setUserFilter(userId);
    setPage(0);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('user_id', userId);
    router.push(`/logs?${params.toString()}`);
  };

  const handleRequestClick = (requestId: string) => {
    setSearchQuery(requestId);
    setPage(0);
  };

  const clearUserFilter = () => {
    setUserFilter('');
    setPage(0);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('user_id');
    router.push(params.toString() ? `/logs?${params.toString()}` : '/logs');
  };

  const clearRequestFilter = () => {
    setSearchQuery('');
    setPage(0);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.delete('request_id');
    router.push(params.toString() ? `/logs?${params.toString()}` : '/logs');
  };

  const handleStatusClick = (statusCode: number) => {
    setStatusFilter(statusCode);
    setPage(0);
  };

  const clearStatusFilter = () => {
    setStatusFilter(null);
    setPage(0);
  };

  const clearServiceFilter = () => {
    setServiceFilter('');
    setPage(0);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setTimeRange('24h');
    setPage(0);
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    if (status >= 500) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getStatusBgColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-500/10 text-green-500';
    if (status >= 400 && status < 500) return 'bg-yellow-500/10 text-yellow-500';
    if (status >= 500) return 'bg-red-500/10 text-red-500';
    return 'bg-muted text-muted-foreground';
  };

  const handleRowClick = (log: LogEntry) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const formatFullTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs</h1>
          <p className="text-muted-foreground">Browse and filter request logs</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex min-w-[200px] flex-1 gap-2">
              <Input
                placeholder="Search by request_id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-1">
              {(['1h', '6h', '24h', '7d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTimeRange(range);
                    setDateFrom('');
                    setDateTo('');
                    setPage(0);
                  }}
                >
                  {range}
                </Button>
              ))}
              <div className="ml-2 flex items-center gap-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (e.target.value) setTimeRange('custom');
                    setPage(0);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="From"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    if (dateFrom) setTimeRange('custom');
                    setPage(0);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-1">
              {(['all', 'rest', 'llm'] as const).map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(type);
                    setPage(0);
                  }}
                >
                  {type === 'all' ? 'All' : type.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Service Filter */}
            <Input
              placeholder="Filter by service..."
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-[180px]"
            />
          </div>

          {/* Active Filters */}
          {(userFilter || searchQuery || statusFilter !== null || serviceFilter || timeRange === 'custom') && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {userFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  User: {userFilter}
                  <button onClick={clearUserFilter} className="ml-1 hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Request: {searchQuery}
                  <button onClick={clearRequestFilter} className="ml-1 hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Status: {statusFilter}
                  <button onClick={clearStatusFilter} className="ml-1 hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {serviceFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Service: {serviceFilter}
                  <button onClick={clearServiceFilter} className="ml-1 hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {timeRange === 'custom' && dateFrom && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Date: {dateFrom}{dateTo ? ` – ${dateTo}` : ' onwards'}
                  <button onClick={clearDateFilter} className="ml-1 hover:text-primary/80">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-600 dark:text-yellow-500">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Request Logs
          </CardTitle>
          <span className="text-sm text-muted-foreground">{total} total logs</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <List className="mx-auto mb-4 h-12 w-12" />
              <p>No logs found for the selected filters.</p>
              <p className="text-sm">Try adjusting the time range or filters.</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Timestamp</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Service</th>
                      <th className="pb-3 font-medium">User</th>
                      <th className="pb-3 font-medium">Request</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 text-right font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.event_id}
                        className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
                        onClick={() => handleRowClick(log)}
                      >
                        <td className="py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTimestamp(log.request_timestamp)}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                            {log.type === 'llm' ? (
                              <Cpu className="h-3 w-3" />
                            ) : (
                              <Globe className="h-3 w-3" />
                            )}
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-sm font-medium">{log.service}</td>
                        <td className="py-3 text-sm">
                          {log.user_id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserClick(log.user_id!);
                              }}
                              className="font-mono text-xs text-primary transition-colors hover:text-primary/80 hover:underline"
                            >
                              {log.user_id}
                            </button>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 text-sm">
                          <div className="max-w-[300px] truncate">
                            {log.method && (
                              <span className="mr-2 font-medium text-muted-foreground">
                                {log.method}
                              </span>
                            )}
                            <span className="text-muted-foreground">{log.url}</span>
                          </div>
                          <div className="truncate text-xs">
                            <span className="text-muted-foreground">ID: </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestClick(log.request_id);
                              }}
                              className="font-mono text-primary transition-colors hover:text-primary/80 hover:underline"
                            >
                              {log.request_id}
                            </button>
                            {log.model && (
                              <span className="text-muted-foreground"> • {log.model}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusClick(log.status_code);
                            }}
                            className="flex items-center gap-1 rounded px-1 transition-colors hover:bg-muted"
                            title={`Filter by status ${log.status_code}`}
                          >
                            {log.status_code >= 200 && log.status_code < 300 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span
                              className={`font-mono text-sm ${getStatusColor(log.status_code)} hover:underline`}
                            >
                              {log.status_code}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {log.latency_ms}ms
                          {log.cost_usd != null && (
                            <div className="text-xs text-muted-foreground">
                              ${Number(log.cost_usd).toFixed(4)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Panel */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${getStatusBgColor(selectedLog.status_code)}`}
                  >
                    {selectedLog.status_code}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
                    {selectedLog.type === 'llm' ? (
                      <Cpu className="h-3 w-3" />
                    ) : (
                      <Globe className="h-3 w-3" />
                    )}
                    {selectedLog.type.toUpperCase()}
                  </span>
                </div>
                <SheetTitle className="mt-2 text-left">
                  {selectedLog.method && <span className="mr-2">{selectedLog.method}</span>}
                  <span className="break-all font-normal text-muted-foreground">
                    {selectedLog.url}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-left">
                  {selectedLog.service} • {selectedLog.latency_ms}ms
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6">
                {/* Request Info */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Hash className="h-4 w-4" />
                    Request Info
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Request ID</span>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {selectedLog.request_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(selectedLog.request_id, 'Request ID')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Event ID</span>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {selectedLog.event_id}
                      </code>
                    </div>
                    {selectedLog.environment && (
                      <div className="flex items-center justify-between border-b py-2">
                        <span className="text-muted-foreground">Environment</span>
                        <span>{selectedLog.environment}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                {selectedLog.user_id && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <User className="h-4 w-4" />
                      User
                    </h3>
                    <div className="flex items-center justify-between border-b py-2 text-sm">
                      <span className="text-muted-foreground">User ID</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleUserClick(selectedLog.user_id!);
                            setDetailOpen(false);
                          }}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {selectedLog.user_id}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(selectedLog.user_id!, 'User ID')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4" />
                    Timing
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Request Time</span>
                      <span className="font-mono text-xs">
                        {formatFullTimestamp(selectedLog.request_timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Response Time</span>
                      <span className="font-mono text-xs">
                        {formatFullTimestamp(selectedLog.response_timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Latency</span>
                      <span className="font-mono font-medium">{selectedLog.latency_ms}ms</span>
                    </div>
                  </div>
                </div>

                {/* Service Info */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Server className="h-4 w-4" />
                    Service
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Service Name</span>
                      <span className="font-medium">{selectedLog.service}</span>
                    </div>
                    {selectedLog.method && (
                      <div className="flex items-center justify-between border-b py-2">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-mono">{selectedLog.method}</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between border-b py-2">
                      <span className="mr-4 shrink-0 text-muted-foreground">URL</span>
                      <span className="break-all text-right font-mono text-xs">
                        {selectedLog.url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b py-2">
                      <span className="text-muted-foreground">Status Code</span>
                      <span
                        className={`font-mono font-medium ${getStatusColor(selectedLog.status_code)}`}
                      >
                        {selectedLog.status_code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LLM Info (if applicable) */}
                {selectedLog.type === 'llm' && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Cpu className="h-4 w-4" />
                      LLM Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      {selectedLog.provider && (
                        <div className="flex items-center justify-between border-b py-2">
                          <span className="text-muted-foreground">Provider</span>
                          <span className="font-medium">{selectedLog.provider}</span>
                        </div>
                      )}
                      {selectedLog.model && (
                        <div className="flex items-center justify-between border-b py-2">
                          <span className="text-muted-foreground">Model</span>
                          <span className="font-mono">{selectedLog.model}</span>
                        </div>
                      )}
                      {selectedLog.total_tokens != null && (
                        <div className="flex items-center justify-between border-b py-2">
                          <span className="text-muted-foreground">Total Tokens</span>
                          <span className="font-mono">
                            {selectedLog.total_tokens.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedLog.cost_usd != null && (
                        <div className="flex items-center justify-between border-b py-2">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            Cost
                          </span>
                          <span className="font-mono font-medium">
                            ${Number(selectedLog.cost_usd).toFixed(6)}
                          </span>
                        </div>
                      )}
                      {selectedLog.finish_reason && (
                        <div className="flex items-center justify-between border-b py-2">
                          <span className="text-muted-foreground">Finish Reason</span>
                          <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                            {selectedLog.finish_reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {selectedLog.request_body && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setRequestBodyExpanded(!requestBodyExpanded)}
                      className="flex w-full items-center justify-between text-sm font-semibold transition-colors hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Request Body
                      </span>
                      {requestBodyExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {requestBodyExpanded && (
                      <div className="relative">
                        <pre className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-md bg-muted p-3 text-xs">
                          <code>{JSON.stringify(selectedLog.request_body, null, 2)}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(selectedLog.request_body, null, 2),
                              'Request body'
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Response Body */}
                {selectedLog.response_body && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setResponseBodyExpanded(!responseBodyExpanded)}
                      className="flex w-full items-center justify-between text-sm font-semibold transition-colors hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Response Body
                      </span>
                      {responseBodyExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {responseBodyExpanded && (
                      <div className="relative">
                        <pre className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-md bg-muted p-3 text-xs">
                          <code>{JSON.stringify(selectedLog.response_body, null, 2)}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(selectedLog.response_body, null, 2),
                              'Response body'
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      handleRequestClick(selectedLog.request_id);
                      setDetailOpen(false);
                    }}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Filter by Request
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/paths?request_id=${selectedLog.request_id}`, '_blank')
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
