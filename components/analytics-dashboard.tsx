'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { BarChart3, Eye, Play, CheckCircle, Clock, Monitor, Smartphone, Tablet, RefreshCw, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  views: { total: number; unique: number };
  starts: number;
  completions: number;
  completionRate: number;
  submissions: number;
  avgTimeToComplete: number | null;
  dropOff: Array<{
    step_id: string;
    step_type: string;
    step_index: number;
    count: number;
  }>;
  devices: { desktop: number; mobile: number; tablet: number };
  empty: boolean;
  tableNotReady?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function MetricCard({ icon: Icon, label, value, sublabel }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

export function AnalyticsDashboard({ formId }: { formId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/forms/${formId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load analytics');
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [formId, user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-3">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="text-xs text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (data?.tableNotReady) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">Analytics table not set up</p>
          <p className="text-xs text-slate-400">Run the setup SQL in your database dashboard to enable analytics tracking.</p>
        </div>
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No data yet</p>
          <p className="text-xs text-slate-400 mt-1">Publish and share your form to start collecting analytics</p>
        </div>
      </div>
    );
  }

  const totalDevices = data.devices.desktop + data.devices.mobile + data.devices.tablet;
  const maxStepCount = data.dropOff.length > 0 ? Math.max(...data.dropOff.map(s => s.count)) : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Overview</h3>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Eye}
            label="Views"
            value={data.views.unique}
            sublabel={`${data.views.total} total`}
          />
          <MetricCard
            icon={Play}
            label="Starts"
            value={data.starts}
          />
          <MetricCard
            icon={CheckCircle}
            label="Completion"
            value={`${data.completionRate}%`}
            sublabel={`${data.completions} completed`}
          />
          <MetricCard
            icon={Clock}
            label="Avg time"
            value={data.avgTimeToComplete ? formatDuration(data.avgTimeToComplete) : '—'}
          />
        </div>

        {data.dropOff.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Drop-off by step</h3>
            <div className="space-y-2">
              {data.dropOff.map((step, i) => {
                const pct = maxStepCount > 0 ? (step.count / maxStepCount) * 100 : 0;
                return (
                  <div key={step.step_id || i} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        {i + 1}. {step.step_type || 'Step'}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{step.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalDevices > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Devices</h3>
            <div className="flex gap-4">
              {[
                { icon: Monitor, label: 'Desktop', count: data.devices.desktop },
                { icon: Smartphone, label: 'Mobile', count: data.devices.mobile },
                { icon: Tablet, label: 'Tablet', count: data.devices.tablet },
              ]
                .filter(d => d.count > 0)
                .map(d => (
                  <div key={d.label} className="flex items-center gap-2 text-xs text-slate-500">
                    <d.icon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{d.label}</span>
                    <span className="font-medium text-slate-700">
                      {Math.round((d.count / totalDevices) * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
