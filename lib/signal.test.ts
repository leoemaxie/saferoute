import { describe, expect, it } from 'vitest';
import { computeSignal } from './signal';
import type { Report, ReportRelation } from './types';

const NOW = new Date('2026-09-23T12:00:00Z');

function report(partial: Partial<Report> & { id: string }): Report {
  return {
    raw_text: 'test report',
    location_id: 'loc-1',
    location_raw: 'Oke-Odo Junction',
    incident_type: 'road_disruption',
    extracted_confidence: 'high',
    reported_at: NOW.toISOString(),
    event_time_reference: 'just now',
    source_label: 'community',
    status: 'processed',
    created_at: NOW.toISOString(),
    ...partial,
  };
}

function relation(a: string, b: string, kind: ReportRelation['relation']): ReportRelation {
  return {
    id: `${a}-${b}`,
    report_a_id: a,
    report_b_id: b,
    relation: kind,
    rationale: 'test',
    created_at: NOW.toISOString(),
  };
}

const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

describe('computeSignal', () => {
  it('returns CLEAR when there are no reports', () => {
    const result = computeSignal([], [], NOW);
    expect(result.signal).toBe('CLEAR');
    expect(result.reportCount).toBe(0);
  });

  it('returns CLEAR when all recent reports confirm normal conditions', () => {
    const reports = [
      report({ id: 'a', incident_type: 'all_clear', reported_at: minutesAgo(10) }),
      report({ id: 'b', incident_type: 'all_clear', reported_at: minutesAgo(5) }),
    ];
    const result = computeSignal(reports, [relation('a', 'b', 'corroborates')], NOW);
    expect(result.signal).toBe('CLEAR');
  });

  it('returns UNVERIFIED for a single isolated report', () => {
    const reports = [report({ id: 'a', reported_at: minutesAgo(10) })];
    const result = computeSignal(reports, [], NOW);
    expect(result.signal).toBe('UNVERIFIED');
    expect(result.reportCount).toBe(1);
  });

  it('returns CONFIRMED for corroborating reports without contradiction', () => {
    const reports = [
      report({ id: 'a', reported_at: minutesAgo(25) }),
      report({ id: 'b', reported_at: minutesAgo(12) }),
    ];
    const result = computeSignal(reports, [relation('a', 'b', 'corroborates')], NOW);
    expect(result.signal).toBe('CONFIRMED');
    expect(result.corroborationCount).toBe(1);
    expect(result.contradictionCount).toBe(0);
  });

  it('returns CAUTION when reports contradict', () => {
    const reports = [
      report({ id: 'a', reported_at: minutesAgo(40) }),
      report({
        id: 'b',
        incident_type: 'all_clear',
        reported_at: minutesAgo(8),
      }),
    ];
    const result = computeSignal(reports, [relation('a', 'b', 'contradicts')], NOW);
    expect(result.signal).toBe('CAUTION');
    expect(result.contradictionCount).toBe(1);
  });

  it('returns CAUTION for multiple reports without corroboration', () => {
    const reports = [
      report({ id: 'a', reported_at: minutesAgo(30) }),
      report({ id: 'b', reported_at: minutesAgo(10) }),
    ];
    const result = computeSignal(reports, [relation('a', 'b', 'unrelated')], NOW);
    expect(result.signal).toBe('CAUTION');
  });

  it('returns STALE when the newest report exceeds 90 minutes', () => {
    const reports = [report({ id: 'a', reported_at: minutesAgo(150) })];
    const result = computeSignal(reports, [], NOW);
    expect(result.signal).toBe('STALE');
  });

  it('applies STALE precedence over corroboration', () => {
    const reports = [
      report({ id: 'a', reported_at: minutesAgo(160) }),
      report({ id: 'b', reported_at: minutesAgo(150) }),
    ];
    const result = computeSignal(reports, [relation('a', 'b', 'corroborates')], NOW);
    expect(result.signal).toBe('STALE');
  });

  it('ignores reports outside the 3-hour window', () => {
    const reports = [report({ id: 'a', reported_at: minutesAgo(200) })];
    const result = computeSignal(reports, [], NOW);
    expect(result.signal).toBe('CLEAR');
  });

  it('ignores relations referencing reports outside the window', () => {
    const reports = [report({ id: 'a', reported_at: minutesAgo(10) })];
    const result = computeSignal(reports, [relation('a', 'old', 'contradicts')], NOW);
    expect(result.signal).toBe('UNVERIFIED');
    expect(result.contradictionCount).toBe(0);
  });
});
