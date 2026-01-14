'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantSettings {
  tenant_id: string;
  name: string;
  retention_days: number;
  body_size_limit_bytes: number;
  rate_limit_per_minute: number;
  pii_scrubbing_enabled: boolean;
  cost_budget_usd: number | null;
  created_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Editable fields
  const [retentionDays, setRetentionDays] = useState('');
  const [bodySizeKb, setBodySizeKb] = useState('');
  const [piiScrubbingEnabled, setPiiScrubbingEnabled] = useState(false);
  const [costBudget, setCostBudget] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings');
      
      if (response.ok) {
        const data = await response.json();
        const s = data.settings;
        setSettings(s);
        setRetentionDays(s.retention_days.toString());
        setBodySizeKb((s.body_size_limit_bytes / 1024).toString());
        setPiiScrubbingEnabled(s.pii_scrubbing_enabled);
        setCostBudget(s.cost_budget_usd?.toString() || '');
      } else if (response.status === 401) {
        setError('Please sign in to view settings');
      } else {
        setError('Failed to load settings');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {};
      
      const newRetention = parseInt(retentionDays);
      if (!isNaN(newRetention) && newRetention !== settings?.retention_days) {
        updates.retention_days = newRetention;
      }

      const newBodySize = parseInt(bodySizeKb) * 1024;
      if (!isNaN(newBodySize) && newBodySize !== settings?.body_size_limit_bytes) {
        updates.body_size_limit_bytes = newBodySize;
      }

      if (piiScrubbingEnabled !== settings?.pii_scrubbing_enabled) {
        updates.pii_scrubbing_enabled = piiScrubbingEnabled;
      }

      const newBudget = costBudget ? parseFloat(costBudget) : null;
      if (newBudget !== settings?.cost_budget_usd) {
        updates.cost_budget_usd = newBudget;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: 'No changes',
          description: 'No settings were modified',
        });
        return;
      }

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        toast({
          title: 'Settings saved',
          description: 'Your settings have been updated successfully',
        });
      } else {
        const errData = await response.json();
        toast({
          title: 'Error',
          description: errData.error?.message || 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} bytes`;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your Path Tracker account</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
      ) : settings ? (
        <div className="space-y-6 max-w-2xl">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenant ID</span>
                  <span className="font-mono text-sm">{settings.tenant_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(settings.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>How long to keep your tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="retention">Retention Period (days)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="retention"
                      type="number"
                      min="1"
                      max="365"
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">days (1-365)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Data older than this will be automatically deleted.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Body Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Body Storage</CardTitle>
              <CardDescription>Request and response body settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bodySize">Body Size Limit (KB)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="bodySize"
                      type="number"
                      min="1"
                      max="1024"
                      value={bodySizeKb}
                      onChange={(e) => setBodySizeKb(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      KB (1-1024, currently {formatBytes(settings.body_size_limit_bytes)})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Request/response bodies larger than this will be truncated.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>PII Scrubbing</Label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPiiScrubbingEnabled(true)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                        piiScrubbingEnabled
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Enabled
                    </button>
                    <button
                      onClick={() => setPiiScrubbingEnabled(false)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                        !piiScrubbingEnabled
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      Disabled
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When enabled, sensitive data like emails and API keys will be redacted.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Budget</CardTitle>
              <CardDescription>Set alerts for LLM costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget (USD)</Label>
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="No limit"
                    value={costBudget}
                    onChange={(e) => setCostBudget(e.target.value)}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for no budget limit. You&apos;ll be alerted when approaching this amount.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
