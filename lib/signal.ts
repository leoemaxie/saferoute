import type { Report, ReportRelation, SignalState } from './types';

export const CORROBORATION_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
export const STALENESS_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes

export interface SignalResult {
  signal: SignalState;
  summary: string;
  reportCount: number;
  contradictionCount: number;
  corroborationCount: number;
}

interface ActiveSet {
  active: Report[];
  latestAt: number | null;
}

function toTime(value: string): number {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function getActiveReports(reports: Report[], nowMs: number): ActiveSet {
  const active = reports.filter((r) => nowMs - toTime(r.reported_at) <= CORROBORATION_WINDOW_MS);
  let latestAt: number | null = null;
  for (const r of active) {
    const t = toTime(r.reported_at);
    if (latestAt === null || t > latestAt) latestAt = t;
  }
  return { active, latestAt };
}

function countRelations(
  relations: ReportRelation[],
  activeIds: Set<string>
): { corroborations: number; contradictions: number } {
  let corroborations = 0;
  let contradictions = 0;
  for (const rel of relations) {
    if (!activeIds.has(rel.report_a_id) || !activeIds.has(rel.report_b_id)) continue;
    if (rel.report_a_id === rel.report_b_id) continue;
    if (rel.relation === 'corroborates') corroborations += 1;
    else if (rel.relation === 'contradicts') contradictions += 1;
  }
  return { corroborations, contradictions };
}

function describeRecency(nowMs: number, latestAt: number): string {
  const mins = Math.max(0, Math.round((nowMs - latestAt) / 60000));
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (rest === 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${hours}h ${rest}m ago`;
}

export function computeSignal(
  reports: Report[],
  relations: ReportRelation[],
  now: Date
): SignalResult {
  const nowMs = now.getTime();
  const { active, latestAt } = getActiveReports(reports, nowMs);

  // CLEAR: no active reports in the rolling window.
  if (active.length === 0 || latestAt === null) {
    return {
      signal: 'CLEAR',
      summary: 'No verified incident has been reported on this route in the last 3 hours.',
      reportCount: 0,
      contradictionCount: 0,
      corroborationCount: 0,
    };
  }

  const activeIds = new Set(active.map((r) => r.id));
  const { corroborations, contradictions } = countRelations(relations, activeIds);

  // STALE first: most recent report exceeds threshold.
  if (nowMs - latestAt > STALENESS_THRESHOLD_MS) {
    return {
      signal: 'STALE',
      summary: `The most recent report for this location is older than 90 minutes (${describeRecency(nowMs, latestAt)}). Treat earlier reports as outdated.`,
      reportCount: active.length,
      contradictionCount: contradictions,
      corroborationCount: corroborations,
    };
  }

  // CLEAR when every recent report confirms normal conditions.
  const allClear = active.every((r) => (r.incident_type ?? '').toLowerCase() === 'all_clear');
  if (allClear) {
    return {
      signal: 'CLEAR',
      summary: `Recent reports confirm normal conditions (last reported ${describeRecency(nowMs, latestAt)}). No verified incident on record.`,
      reportCount: active.length,
      contradictionCount: contradictions,
      corroborationCount: corroborations,
    };
  }

  // CONFIRMED: 2+ corroborating reports, no unresolved contradictions.
  if (active.length >= 2 && corroborations >= 1 && contradictions === 0) {
    return {
      signal: 'CONFIRMED',
      summary: `${active.length} recent reports describe a consistent incident around this location, with ${corroborations} corroborating link${corroborations > 1 ? 's' : ''} and no contradictions. The claim has not been officially confirmed.`,
      reportCount: active.length,
      contradictionCount: contradictions,
      corroborationCount: corroborations,
    };
  }

  // CAUTION: contradictions, or multiple reports without clean corroboration.
  if (contradictions > 0 || active.length >= 2) {
    const reason =
      contradictions > 0
        ? `${contradictions} contradicting report pair${contradictions > 1 ? 's' : ''} need${contradictions > 1 ? '' : 's'} resolution`
        : 'reports are only partially corroborated';
    return {
      signal: 'CAUTION',
      summary: `${active.length} recent reports exist for this location and ${reason}. Reported ${describeRecency(nowMs, latestAt)}.`,
      reportCount: active.length,
      contradictionCount: contradictions,
      corroborationCount: corroborations,
    };
  }

  // UNVERIFIED: single isolated report.
  return {
    signal: 'UNVERIFIED',
    summary: `One isolated report exists for this location (${describeRecency(nowMs, latestAt)}), with no corroboration yet. Treat with caution.`,
    reportCount: active.length,
    contradictionCount: contradictions,
    corroborationCount: corroborations,
  };
}
