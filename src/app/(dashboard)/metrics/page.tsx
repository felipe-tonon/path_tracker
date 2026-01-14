'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Clock, Globe, Cpu, DollarSign, Activity, Zap } from 'lucide-react';

interface MetricsResponse {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    rest_requests: {
      total: number;
      by_service: Record<string, number>;
      by_status: Record<string, number>;
      latency: {
        p50: number;
        p95: number;
        p99: number;
      };
    };
    llm_requests: {
      total: number;
      by_provider: Record<string, number>;
      by_model: Record<string, number>;
      total_tokens: number;
      total_cost_usd: number;
      latency: {
        p50: number;
        p95: number;
        p99: number;
      };
    };
  };
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startTime: Date;

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

      const params = new URLSearchParams({
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
      });

      const response = await fetch(`/api/v1/metrics?${params}`);

      if (response.ok) {
        const data: MetricsResponse = await response.json();
        setMetrics(data);
      } else if (response.status === 401) {
        setError('Please sign in to view metrics');
      } else {
        setError('Failed to load metrics');
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    const code = parseInt(status);
    if (code >= 200 && code < 300) return 'bg-green-500';
    if (code >= 400 && code < 500) return 'bg-yellow-500';
    if (code >= 500) return 'bg-red-500';
    return 'bg-muted';
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground">Aggregated analytics and trends</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Time Range */}
          <div className="flex gap-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading metrics...</div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(
                    metrics.metrics.rest_requests.total + metrics.metrics.llm_requests.total
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(metrics.metrics.rest_requests.total)} REST +{' '}
                  {formatNumber(metrics.metrics.llm_requests.total)} LLM
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(metrics.metrics.llm_requests.total_tokens)}
                </div>
                <p className="text-xs text-muted-foreground">LLM tokens consumed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LLM Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(metrics.metrics.llm_requests.total_cost_usd).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Total API costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">P95 Latency</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.metrics.rest_requests.latency.p95}ms
                </div>
                <p className="text-xs text-muted-foreground">REST response time</p>
              </CardContent>
            </Card>
          </div>

          {/* REST Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                REST API Metrics
              </CardTitle>
              <CardDescription>
                {formatNumber(metrics.metrics.rest_requests.total)} requests in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Latency */}
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Latency Percentiles
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p50</span>
                      <span className="font-mono">
                        {metrics.metrics.rest_requests.latency.p50}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p95</span>
                      <span className="font-mono">
                        {metrics.metrics.rest_requests.latency.p95}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p99</span>
                      <span className="font-mono">
                        {metrics.metrics.rest_requests.latency.p99}ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* By Service */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">By Service</h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.metrics.rest_requests.by_service).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data</p>
                    ) : (
                      Object.entries(metrics.metrics.rest_requests.by_service)
                        .slice(0, 5)
                        .map(([service, count]) => (
                          <div key={service} className="flex justify-between text-sm">
                            <span className="truncate text-muted-foreground">{service}</span>
                            <span className="font-mono">{formatNumber(count)}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* By Status */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">By Status Code</h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.metrics.rest_requests.by_status).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data</p>
                    ) : (
                      Object.entries(metrics.metrics.rest_requests.by_status).map(
                        ([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                              <span className="font-mono">{status}</span>
                            </div>
                            <span className="font-mono">{formatNumber(count)}</span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LLM Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                LLM API Metrics
              </CardTitle>
              <CardDescription>
                {formatNumber(metrics.metrics.llm_requests.total)} requests in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Latency */}
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Latency Percentiles
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p50</span>
                      <span className="font-mono">
                        {metrics.metrics.llm_requests.latency.p50}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p95</span>
                      <span className="font-mono">
                        {metrics.metrics.llm_requests.latency.p95}ms
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">p99</span>
                      <span className="font-mono">
                        {metrics.metrics.llm_requests.latency.p99}ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* By Provider */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">By Provider</h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.metrics.llm_requests.by_provider).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data</p>
                    ) : (
                      Object.entries(metrics.metrics.llm_requests.by_provider).map(
                        ([provider, count]) => (
                          <div key={provider} className="flex justify-between text-sm">
                            <span className="truncate text-muted-foreground">{provider}</span>
                            <span className="font-mono">{formatNumber(count)}</span>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                {/* By Model */}
                <div>
                  <h4 className="mb-3 text-sm font-medium">By Model</h4>
                  <div className="space-y-2">
                    {Object.entries(metrics.metrics.llm_requests.by_model).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data</p>
                    ) : (
                      Object.entries(metrics.metrics.llm_requests.by_model)
                        .slice(0, 5)
                        .map(([model, count]) => (
                          <div key={model} className="flex justify-between text-sm">
                            <span className="truncate text-muted-foreground">{model}</span>
                            <span className="font-mono">{formatNumber(count)}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No Metrics Available</h3>
            <p className="text-muted-foreground">Start tracking requests to see analytics here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
