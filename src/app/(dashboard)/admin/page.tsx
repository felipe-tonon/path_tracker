'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Users,
  Key,
  Activity,
  Cpu,
  DollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TenantWithStats {
  tenant_id: string;
  name: string;
  created_at: string;
  retention_days: number;
  total_api_keys: number;
  active_api_keys: number;
  account_users_count: number;
  rest_requests_24h: number;
  llm_requests_24h: number;
  total_cost_24h: number;
  rest_requests_total: number;
  llm_requests_total: number;
  total_cost_all_time: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        if (!data.isAdmin) {
          router.push('/');
        }
      } catch {
        setIsAdmin(false);
        router.push('/');
      }
    };
    checkAdmin();
  }, [router]);

  const fetchTenants = async (search = '', offset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/admin/tenants?${params}`);

      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
        setPagination(data.pagination);
      } else if (response.status === 401 || response.status === 403) {
        setError('You do not have permission to access this page');
        router.push('/');
      } else {
        setError('Failed to load tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTenants();
    }
  }, [isAdmin]);

  const handleSearch = () => {
    fetchTenants(searchTerm, 0);
  };

  const handlePrevPage = () => {
    if (pagination && pagination.offset > 0) {
      fetchTenants(searchTerm, Math.max(0, pagination.offset - pagination.limit));
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.offset + pagination.limit < pagination.total) {
      fetchTenants(searchTerm, pagination.offset + pagination.limit);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCost = (cost: number) => {
    return `$${Number(cost).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Aggregate stats
  const totalTenants = pagination?.total || 0;
  const totalRequests24h = tenants.reduce(
    (sum, t) => sum + t.rest_requests_24h + t.llm_requests_24h,
    0
  );
  const totalCost24h = tenants.reduce((sum, t) => sum + t.total_cost_24h, 0);
  const totalActiveKeys = tenants.reduce((sum, t) => sum + t.active_api_keys, 0);

  // Loading state for admin check
  if (isAdmin === null) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage all tenants and view platform-wide statistics
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTenants(searchTerm)} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-8 border-red-500/50 bg-red-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : formatNumber(totalTenants)}</div>
            <p className="text-xs text-muted-foreground">Registered organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatNumber(totalRequests24h)}
            </div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LLM Cost (24h)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : formatCost(totalCost24h)}</div>
            <p className="text-xs text-muted-foreground">Platform-wide spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : formatNumber(totalActiveKeys)}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenants by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          Search
        </Button>
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {searchTerm ? 'No tenants found matching your search' : 'No tenants registered yet'}
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.tenant_id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <p className="font-mono text-xs text-muted-foreground">
                        ID: {tenant.tenant_id}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created: {formatDate(tenant.created_at)}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{tenant.account_users_count}</div>
                        <div className="text-xs text-muted-foreground">Users</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {tenant.active_api_keys}/{tenant.total_api_keys}
                        </div>
                        <div className="text-xs text-muted-foreground">API Keys</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatNumber(tenant.rest_requests_24h)}
                        </div>
                        <div className="text-xs text-muted-foreground">REST (24h)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatNumber(tenant.llm_requests_24h)}
                        </div>
                        <div className="text-xs text-muted-foreground">LLM (24h)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">{formatCost(tenant.total_cost_24h)}</div>
                        <div className="text-xs text-muted-foreground">Cost (24h)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {formatCost(tenant.total_cost_all_time)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Cost</div>
                      </div>
                    </div>
                  </div>

                  {/* Total requests summary */}
                  <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
                    <span>
                      Total REST: <strong>{formatNumber(tenant.rest_requests_total)}</strong>
                    </span>
                    <span>
                      Total LLM: <strong>{formatNumber(tenant.llm_requests_total)}</strong>
                    </span>
                    <span>
                      Retention: <strong>{tenant.retention_days} days</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1}-
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0 || loading}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={pagination.offset + pagination.limit >= pagination.total || loading}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
