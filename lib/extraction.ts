import { GoogleGenAI } from '@google/genai';

export interface ExtractionResult {
  location: string | null;
  incident_type: string | null;
  confidence: 'low' | 'medium' | 'high';
  event_time_reference: string | null;
}

export class ExtractionError extends Error {
  readonly causeDetail?: string;
  constructor(message: string, causeDetail?: string) {
    super(message);
    this.name = 'ExtractionError';
    this.causeDetail = causeDetail;
  }
}

const MODEL_ID = 'gemini-2.5-flash';
const TIMEOUT_MS = 20_000;

const DISRUPTION_HINTS = [
  'block',
  'blocked',
  'holdup',
  'robbery',
  'attack',
  'accident',
  'crash',
  'traffic',
  'flood',
  'fire',
  'closed',
  'gun',
  'thief',
  'kidnap',
  'protest',
  'dem block',
  'road don',
];
const CLEAR_HINTS = ['clear', 'free', 'moving', 'open', 'normal', 'calm', 'dey move', 'don clear'];

// Deterministic offline fallback used when no model key is configured.
// Keeps local dev/seed usable; production with a key always prefers the model.
function heuristicExtraction(rawText: string): ExtractionResult {
  const lower = rawText.toLowerCase();
  const isClear =
    CLEAR_HINTS.some((h) => lower.includes(h)) &&
    !DISRUPTION_HINTS.some((h) => lower.includes(h) && !lower.includes('clear'));
  const isDisruption = DISRUPTION_HINTS.some((h) => lower.includes(h));
  let incident_type: string | null = null;
  if (isClear && !isDisruption) incident_type = 'all_clear';
  else if (isDisruption && !isClear) incident_type = 'road_disruption';
  else if (isDisruption) incident_type = 'road_disruption';

  const timeMatch = lower.match(
    /(just now|now|(\d+)\s*(min|mins|minutes?|hrs?|hours?)\s*ago|this morning|this evening|yesterday)/
  );
  return {
    location: null,
    incident_type,
    confidence: 'low',
    event_time_reference: timeMatch ? timeMatch[0] : null,
  };
}

function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>;
      } catch {
        // fall through
      }
    }
    throw new ExtractionError('Model returned unparseable JSON', text);
  }
}

function normalizeExtraction(raw: Record<string, unknown>): ExtractionResult {
  const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
  const confidence =
    raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
      ? raw.confidence
      : 'low';
  return {
    location: strOrNull(raw.location),
    incident_type: strOrNull(raw.incident_type),
    confidence,
    event_time_reference: strOrNull(raw.event_time_reference),
  };
}

export async function extractIncidentEntities(rawText: string): Promise<ExtractionResult> {
  const text = rawText.trim();
  if (!text) throw new ExtractionError('Empty report text');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return heuristicExtraction(text);

  const prompt = [
    'Extract structured incident fields from a community safety report.',
    'The report may be in English, Nigerian Pidgin, or code-switched text.',
    'Zero-hallucination policy: if a field is not present in the input, return null for it.',
    'incident_type must be one of: "road_disruption", "security_concern", "all_clear", or null.',
    'confidence is "low" | "medium" | "high" for the extraction itself.',
    'event_time_reference is the raw temporal phrase (e.g. "just now", "10 mins ago") or null.',
    'Respond with JSON only, no markdown, no commentary.',
    `Report: """${text}"""`,
    'Schema: {"location": string|null, "incident_type": string|null, "confidence": "low"|"medium"|"high", "event_time_reference": string|null}',
  ].join('\n');

  try {
    const client = new GoogleGenAI({ apiKey });
    const withTimeout = Promise.race([
      client.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ExtractionError('Model request timed out')), TIMEOUT_MS)
      ),
    ]);
    const response = await withTimeout;
    const output = (response.text ?? '').trim();
    if (!output) throw new ExtractionError('Model returned empty output');
    return normalizeExtraction(extractJsonObject(output));
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new ExtractionError('Structured extraction failed', detail);
  }
}
