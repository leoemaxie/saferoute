'use client';

import { useState } from 'react';

export function ReportForm() {
  const [rawText, setRawText] = useState('');
  const [locationRaw, setLocationRaw] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || !locationRaw.trim()) return;
    setState('sending');
    setMessage('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawText.trim(),
          location_raw: locationRaw.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      setState('done');
      setMessage(
        data.report?.status === 'error'
          ? 'Report saved for review. Automated analysis could not complete.'
          : 'Report submitted. The dashboard will reflect it shortly.'
      );
      setRawText('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Submission failed');
    }
  }

  return (
    <form
      id="report"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gunmetal bg-carbon-surface p-5"
    >
      <h2 className="text-[20px] font-medium text-pure-white">Submit a report</h2>
      <p className="mt-1 text-[14px] text-muted-steel">
        Plain words are fine — English, Pidgin, or mixed. Say what you saw and where.
      </p>
      <label className="mt-4 block text-[12px] font-medium text-frost">
        What did you observe?
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. Dem block road for Oke-Odo junction"
          className="mt-1 w-full rounded-[10px] border border-gunmetal bg-void-black px-4 py-3 text-[16px] text-pure-white placeholder:text-muted-steel"
        />
      </label>
      <label className="mt-3 block text-[12px] font-medium text-frost">
        Location
        <input
          value={locationRaw}
          onChange={(e) => setLocationRaw(e.target.value)}
          maxLength={200}
          placeholder="e.g. Oke-Odo Junction"
          className="mt-1 w-full rounded-[10px] border border-gunmetal bg-void-black px-4 py-3 text-[16px] text-pure-white placeholder:text-muted-steel"
        />
      </label>
      <button
        type="submit"
        disabled={state === 'sending'}
        className="btn-primary-action mt-4 px-5 py-2 text-[14px] font-medium disabled:opacity-60"
      >
        {state === 'sending' ? 'Submitting…' : 'Submit report'}
      </button>
      {message && (
        <p className={`mt-2 text-[14px] ${state === 'error' ? 'text-red-300' : 'text-frost'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
