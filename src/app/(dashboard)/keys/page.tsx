'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, Copy, Check, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  key_id: string;
  name: string;
  key_preview: string;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
  last_used_at: string | null;
  usage_count: number;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<{ key: string; key_id: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/keys', {
        credentials: 'include', // Ensure cookies are sent
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys || []);
      } else {
        console.error('Failed to fetch API keys:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
        credentials: 'include', // Ensure cookies are sent
      });

      if (response.ok) {
        const data = await response.json();
        // API returns api_key, but we store it as key for consistency
        setNewKeyData({ key: data.api_key, key_id: data.key_id });
        setNewKeyName('');
        await fetchKeys();
        toast({
          title: 'Success',
          description: 'API key created successfully',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error?.message || 'Failed to create API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(''), 2000);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchKeys();
        toast({
          title: 'Success',
          description: 'API key revoked successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to revoke API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const toggleReveal = (keyId: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(keyId)) {
      newRevealed.delete(keyId);
    } else {
      newRevealed.add(keyId);
    }
    setRevealedKeys(newRevealed);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API keys for tracking</p>
        </div>
        {/* Create Dialog - using DialogTrigger for better reliability */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button type="button">
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key to authenticate tracking requests.
            </DialogDescription>
          </DialogHeader>

          {!newKeyData ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a descriptive name to identify this key
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewKeyName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateKey} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-2">
                    ⚠️ Save this key now!
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    You won't be able to see it again. Store it securely.
                  </p>
                  <div className="rounded bg-muted p-3 font-mono text-sm break-all">
                    {newKeyData.key}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleCopy(newKeyData.key, newKeyData.key_id)}
                >
                  {copiedKey === newKeyData.key_id ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Key
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setNewKeyData(null);
                    setShowCreateDialog(false);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                No API keys yet. Create one to start tracking requests.
              </p>
              <div className="rounded-lg bg-muted p-4">
                <div className="mb-2 font-medium">Example Usage:</div>
                <pre className="overflow-x-auto text-sm">
                  <code>Authorization: Bearer pwtrk_your_api_key_here</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key) => (
                <div
                  key={key.key_id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{key.name}</h3>
                      {key.revoked && (
                        <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-500">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      <span>
                        {revealedKeys.has(key.key_id) ? key.key_preview : key.key_preview + '...'}
                      </span>
                      <button
                        onClick={() => toggleReveal(key.key_id)}
                        className="hover:text-foreground"
                      >
                        {revealedKeys.has(key.key_id) ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatDate(key.created_at)}</span>
                      <span>Last used: {formatDate(key.last_used_at)}</span>
                      <span>Uses: {key.usage_count}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(key.key_preview, key.key_id)}
                      disabled={key.revoked}
                    >
                      {copiedKey === key.key_id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(key.key_id, key.name)}
                      disabled={key.revoked}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
