'use client';

import { useCallback, useEffect, useState } from 'react';
import { LocationCard } from './location-card';
import type { IncidentFeedItem } from '@/lib/types';

const POLL_MS = 18_000;

export function SignalFeed() {
  const [items, setItems] = useState<IncidentFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load signals');
      setItems(data.incidents ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) {
    return <p className="text-[14px] text-muted-steel">Loading signals…</p>;
  }
  if (error) {
    return (
      <div className="rounded-[16px] border border-gunmetal bg-carbon-surface p-6">
        <p className="text-[14px] text-frost">Could not load signals: {error}</p>
        <button
          onClick={load}
          className="btn-ghost-action mt-3 px-4 py-1.5 text-[13px]"
        >
          Retry
        </button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-[16px] border border-gunmetal bg-carbon-surface p-6">
        <p className="text-[14px] leading-[1.6] text-frost">
          No verified incident has been reported on monitored routes in the last 3 hours. Submit the
          first report below.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <LocationCard key={item.location.id} item={item} />
      ))}
    </div>
  );
}
