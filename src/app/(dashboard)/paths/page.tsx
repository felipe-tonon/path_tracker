'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, GitBranch, Clock, AlertCircle, CheckCircle, Cpu, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PathEvent {
  event_id: string;
  type: 'rest' | 'llm';
  service: string;
  method?: string;
  url: string;
  status_code: number;
  latency_ms: number;
  request_timestamp: string;
  response_timestamp: string;
  provider?: string;
  model?: string;
  total_tokens?: number;
  cost_usd?: number;
  finish_reason?: string;
}

interface PathResponse {
  request_id: string;
  user_id: string | null;
  total_duration_ms: number;
  event_count: number;
  path: PathEvent[];
}

export default function PathsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [pathData, setPathData] = useState<PathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a request ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setPathData(null);

    try {
      const response = await fetch(`/api/v1/paths/${encodeURIComponent(searchQuery.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        setPathData(data);
      } else if (response.status === 404) {
        setError(`No events found for request_id: ${searchQuery}`);
      } else if (response.status === 401) {
        setError('Please sign in to search paths');
      } else {
        const errData = await response.json();
        setError(errData.error?.message || 'Failed to fetch path');
      }
    } catch (err) {
      console.error('Error fetching path:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 400 && status < 500) return 'text-yellow-500';
    if (status >= 500) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Request Paths</h1>
        <p className="text-muted-foreground">Trace requests across your services</p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Request Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter request_id (e.g., req_abc123)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a request_id to visualize the complete path across all services.
          </p>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-yellow-600 dark:text-yellow-500">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Path Results */}
      {pathData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Request Path: {pathData.request_id}
            </CardTitle>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {pathData.total_duration_ms}ms total
              </span>
              <span>{pathData.event_count} events</span>
              {pathData.user_id && <span>User: {pathData.user_id}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Events */}
              <div className="space-y-6">
                {pathData.path.map((event, index) => (
                  <div key={event.event_id} className="relative pl-14">
                    {/* Timeline dot */}
                    <div className="absolute left-4 top-2 h-5 w-5 rounded-full border-2 border-background bg-primary flex items-center justify-center">
                      {event.type === 'llm' ? (
                        <Cpu className="h-3 w-3 text-primary-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    
                    {/* Event card */}
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{event.service}</span>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              {event.type.toUpperCase()}
                            </span>
                            <span className={`font-mono text-sm ${getStatusColor(event.status_code)}`}>
                              {event.status_code}
                            </span>
                            {getStatusIcon(event.status_code)}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {event.method && <span className="font-medium mr-2">{event.method}</span>}
                            <span className="break-all">{event.url}</span>
                          </div>
                          
                          {event.type === 'llm' && (
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              {event.provider && <span>Provider: {event.provider}</span>}
                              {event.model && <span>Model: {event.model}</span>}
                              {event.total_tokens && <span>Tokens: {event.total_tokens}</span>}
                              {event.cost_usd != null && <span>Cost: ${Number(event.cost_usd).toFixed(4)}</span>}
                              {event.finish_reason && <span>Finish: {event.finish_reason}</span>}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right text-sm">
                          <div className="font-medium">{event.latency_ms}ms</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(event.request_timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && !pathData && (
        <Card>
          <CardContent className="py-8 text-center">
            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Search for a Request Path</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a request_id above to see how a request flowed through your services.
              You&apos;ll see a timeline of all REST and LLM calls made during that request.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
