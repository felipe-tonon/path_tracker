'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Cpu, DollarSign, Clock, AlertTriangle, Users, RefreshCw, ArrowRight } from 'lucide-react';

interface OverviewMetrics {
  rest_requests: number;
  llm_requests: number;
  total_cost: number;
  avg_latency: number;
  error_rate: number;
  unique_users: number;
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get metrics for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const params = new URLSearchParams({
        start_time: yesterday.toISOString(),
        end_time: now.toISOString(),
      });
      
      const response = await fetch(`/api/v1/metrics?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Calculate derived metrics
        const restTotal = data.metrics?.rest_requests?.total || 0;
        const llmTotal = data.metrics?.llm_requests?.total || 0;
        const totalRequests = restTotal + llmTotal;
        
        // Calculate error rate from status codes
        const restByStatus = data.metrics?.rest_requests?.by_status || {};
        const errorCodes = Object.entries(restByStatus)
          .filter(([code]) => parseInt(code) >= 400)
          .reduce((sum, [, count]) => sum + (count as number), 0);
        const errorRate = totalRequests > 0 ? (errorCodes / totalRequests) * 100 : 0;
        
        // Average latency (simple average of p50s)
        const restLatency = data.metrics?.rest_requests?.latency?.p50 || 0;
        const llmLatency = data.metrics?.llm_requests?.latency?.p50 || 0;
        const avgLatency = restTotal > 0 || llmTotal > 0
          ? Math.round((restLatency * restTotal + llmLatency * llmTotal) / (restTotal + llmTotal))
          : 0;
        
        setMetrics({
          rest_requests: restTotal,
          llm_requests: llmTotal,
          total_cost: data.metrics?.llm_requests?.total_cost_usd || 0,
          avg_latency: avgLatency,
          error_rate: errorRate,
          unique_users: 0, // TODO: Add unique users endpoint
        });
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
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCost = (cost: number | string) => {
    return `$${Number(cost).toFixed(2)}`;
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms}ms`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground">Monitor your distributed system in real-time</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Last 24 hours</span>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics ? formatNumber(metrics.rest_requests + metrics.llm_requests) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics && metrics.rest_requests > 0 ? `${formatNumber(metrics.rest_requests)} REST` : 'REST + LLM requests'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LLM Requests</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics ? formatNumber(metrics.llm_requests) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">AI/ML API calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics ? formatCost(metrics.total_cost) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">LLM API costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics && metrics.avg_latency > 0 ? formatLatency(metrics.avg_latency) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">p50 response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics ? `${metrics.error_rate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">4xx + 5xx responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metrics ? formatNumber(metrics.unique_users) : '--'}
            </div>
            <p className="text-xs text-muted-foreground">Unique user_ids</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Start tracking your requests by using the Path Tracker API. Here&apos;s a quick
              example:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
              <code>{`curl -X POST http://localhost:3001/api/v1/tracker/rest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "request_id": "req_123",
    "service": "my-service",
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "status_code": 200,
    "request_timestamp": "${new Date().toISOString()}",
    "response_timestamp": "${new Date(Date.now() + 250).toISOString()}"
  }'`}</code>
            </pre>
            <div className="flex items-center gap-4">
              <Link href="/keys">
                <Button>
                  Create API Key
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Go to <strong>API Keys</strong> to create your first API key.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
