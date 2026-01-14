'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  RefreshCw, 
  Search, 
  Activity,
  Cpu,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';

interface UserStats {
  user_id: string;
  total_requests: number;
  rest_requests: number;
  llm_requests: number;
  total_tokens: number;
  total_cost: number;
  first_seen: string;
  last_seen: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const handleUserClick = (userId: string) => {
    router.push(`/logs?user_id=${encodeURIComponent(userId)}`);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // 30d
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const params = new URLSearchParams({
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        limit: '100',
      });

      const response = await fetch(`/api/users?${params}`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setFilteredUsers(data.users);
      } else if (response.status === 401) {
        setError('Please sign in to view user analytics');
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [timeRange]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredUsers(users.filter(u => 
        u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalStats = {
    users: users.length,
    requests: users.reduce((sum, u) => sum + Number(u.total_requests), 0),
    tokens: users.reduce((sum, u) => sum + Number(u.total_tokens), 0),
    cost: users.reduce((sum, u) => sum + Number(u.total_cost), 0),
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Analyze behavior and costs per end user</p>
        </div>
        <div className="flex gap-4 items-center">
          {/* Time Range */}
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
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
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.users)}</div>
            <p className="text-xs text-muted-foreground">Unique user_ids</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.requests)}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.tokens)}</div>
            <p className="text-xs text-muted-foreground">LLM tokens consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalStats.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">LLM API costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                User Analytics
              </CardTitle>
              <CardDescription>
                {filteredUsers.length} users in the last {timeRange}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search by user_id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading user analytics...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4" />
              {users.length === 0 ? (
                <>
                  <p>No users tracked yet.</p>
                  <p className="text-sm">Include user_id in your tracking requests to see user analytics.</p>
                </>
              ) : (
                <p>No users match your search.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">User ID</th>
                    <th className="pb-3 font-medium text-right">Requests</th>
                    <th className="pb-3 font-medium text-right">REST</th>
                    <th className="pb-3 font-medium text-right">LLM</th>
                    <th className="pb-3 font-medium text-right">Tokens</th>
                    <th className="pb-3 font-medium text-right">Cost</th>
                    <th className="pb-3 font-medium text-right">First Seen</th>
                    <th className="pb-3 font-medium text-right">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <button
                          onClick={() => handleUserClick(user.user_id)}
                          className="font-mono text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
                        >
                          {user.user_id}
                        </button>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatNumber(user.total_requests)}
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        {formatNumber(user.rest_requests)}
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        {formatNumber(user.llm_requests)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatNumber(user.total_tokens)}
                      </td>
                      <td className="py-3 text-right font-mono">
                        ${Number(user.total_cost).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(user.first_seen)}
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        {formatDate(user.last_seen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
