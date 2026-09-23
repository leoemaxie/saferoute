export interface SeedReport {
  location: string;
  raw_text: string;
  minutesAgo: number;
  incident_type: string | null;
  confidence: 'low' | 'medium' | 'high';
  event_time_reference: string | null;
  source_label: string;
}

export const SEED_LOCATIONS = ['Oke-Odo Junction', 'Market Road', 'Ile-Ogbo Junction'];

export const SEED_REPORTS: SeedReport[] = [
  {
    location: 'Oke-Odo Junction',
    raw_text: 'Dem block road for Oke-Odo junction, traffic dey stand still.',
    minutesAgo: 25,
    incident_type: 'road_disruption',
    confidence: 'high',
    event_time_reference: 'just now',
    source_label: 'community',
  },
  {
    location: 'Oke-Odo Junction',
    raw_text: 'Road block at Oke-Odo junction, cars no fit pass now.',
    minutesAgo: 12,
    incident_type: 'road_disruption',
    confidence: 'high',
    event_time_reference: 'just now',
    source_label: 'community',
  },
  {
    location: 'Market Road',
    raw_text: 'Heavy traffic jam for Market Road, accident happen just now.',
    minutesAgo: 40,
    incident_type: 'road_disruption',
    confidence: 'medium',
    event_time_reference: 'just now',
    source_label: 'community',
  },
  {
    location: 'Market Road',
    raw_text: 'Traffic moving freely for Market Road now, road don clear.',
    minutesAgo: 8,
    incident_type: 'all_clear',
    confidence: 'medium',
    event_time_reference: 'just now',
    source_label: 'community',
  },
  {
    location: 'Ile-Ogbo Junction',
    raw_text: 'Small holdup reported near Ile-Ogbo Junction this morning.',
    minutesAgo: 150,
    incident_type: 'security_concern',
    confidence: 'low',
    event_time_reference: 'this morning',
    source_label: 'community',
  },
];
