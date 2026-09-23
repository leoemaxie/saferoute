// Domain types — vendor-agnostic, mirrors BUILDSPEC.md Section 4.

export type SignalState = 'CLEAR' | 'CAUTION' | 'UNVERIFIED' | 'CONFIRMED' | 'STALE';

export type ReportStatus = 'pending' | 'processed' | 'error';

export type RelationKind = 'corroborates' | 'contradicts' | 'unrelated';

export interface Location {
  id: string;
  name: string;
  created_at: string;
}

export interface Report {
  id: string;
  raw_text: string;
  location_id: string | null;
  location_raw: string;
  incident_type: string | null;
  extracted_confidence: string | null;
  reported_at: string;
  event_time_reference: string | null;
  source_label: string;
  status: ReportStatus;
  created_at: string;
}

export interface IncidentSignal {
  id: string;
  location_id: string;
  signal: SignalState;
  summary: string;
  report_count: number;
  contradiction_count: number;
  last_report_at: string | null;
  updated_at: string;
}

export interface ReportRelation {
  id: string;
  report_a_id: string;
  report_b_id: string;
  relation: RelationKind;
  rationale: string | null;
  created_at: string;
}

export interface IncidentFeedItem {
  location: Location;
  signal: IncidentSignal | null;
}

export interface EvidenceDetail {
  location: Location;
  signal: IncidentSignal | null;
  reports: Report[];
  relations: ReportRelation[];
}
