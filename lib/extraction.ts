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

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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

  const systemInstruction = [
    'You are a strict, objective information extraction engine for community safety reports in Nigeria.',
    'Your role is to extract factual attributes without making assumptions or hallucinating.',
    '',
    'STRICT RULES:',
    '1. INQUIRIES & QUESTIONS: If a report asks a question (e.g. "Road clear for Oke-Odo?", "Any update?"), seeks info, or is casual conversation/greetings/prayers, return all null fields with confidence "low":',
    '   {"location": null, "incident_type": null, "confidence": "low", "event_time_reference": null}',
    '2. INCIDENT TYPES:',
    '   - "road_disruption": Physical blockages, heavy traffic/go-slow, vehicle breakdown, accidents, floods, road repairs.',
    '   - "security_concern": Armed robbery, violence, gunfire, extortion checkpoints, protests/riots, harassment.',
    '   - "all_clear": Reports explicitly confirming free flow, normal movement, or calm ("everywhere calm/soft", "road don open", "dey move normal", "no wahala").',
    '   - null: Ambiguous text, non-incidents, or general chatter.',
    '3. LOCATION: Extract ONLY the specific location where the incident occurred. Do NOT extract transit origins or destinations. If not mentioned, return null.',
    '4. TEMPORAL PHRASE: Extract the exact raw time mention (e.g. "just now", "10 mins ago", "this morning"). Return null if absent.',
    '5. CONFIDENCE: "high" if direct eyewitness report; "medium" if plausible but brief; "low" if uncertain, rumor, or question.',
    '6. Output valid JSON matching schema: {"location": string|null, "incident_type": string|null, "confidence": "low"|"medium"|"high", "event_time_reference": string|null}',
  ].join('\n');

  try {
    const client = new GoogleGenAI({ apiKey });
    const withTimeout = Promise.race([
      client.models.generateContent({
        model: MODEL_ID,
        contents: `Report: """${text}"""`,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
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
