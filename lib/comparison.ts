import { GoogleGenAI } from '@google/genai';
import type { RelationKind } from './types';

export interface ComparisonResult {
  relation: RelationKind;
  rationale: string;
}

export class ComparisonError extends Error {
  constructor(
    message: string,
    readonly causeDetail?: string
  ) {
    super(message);
    this.name = 'ComparisonError';
  }
}

const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const TIMEOUT_MS = 20_000;

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

function heuristicComparison(a: string, b: string): ComparisonResult {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const disruption = [
    'block',
    'robbery',
    'attack',
    'accident',
    'crash',
    'holdup',
    'gun',
    'fire',
    'flood',
    'closed',
  ];
  const clear = ['clear', 'free', 'moving', 'open', 'normal', 'calm'];
  const aDis = disruption.some((w) => la.includes(w));
  const bDis = disruption.some((w) => lb.includes(w));
  const aClr = clear.some((w) => la.includes(w));
  const bClr = clear.some((w) => lb.includes(w));
  if ((aDis && bClr) || (aClr && bDis)) {
    return {
      relation: 'contradicts',
      rationale: 'One report describes a disruption while the other describes normal conditions.',
    };
  }
  const ta = tokenize(la);
  const tb = tokenize(lb);
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap += 1;
  if (overlap >= 3 || (aDis && bDis)) {
    return {
      relation: 'corroborates',
      rationale: 'Both reports describe a similar incident at the same location.',
    };
  }
  return {
    relation: 'unrelated',
    rationale: 'The reports do not clearly refer to the same incident.',
  };
}

function parseComparison(text: string): ComparisonResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last <= first) {
      throw new ComparisonError('Model returned unparseable JSON', text.slice(0, 500));
    }
    try {
      parsed = JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>;
    } catch {
      throw new ComparisonError('Model returned unparseable JSON', text.slice(0, 500));
    }
  }
  const relation = parsed.relation;
  if (relation !== 'corroborates' && relation !== 'contradicts' && relation !== 'unrelated') {
    throw new ComparisonError('Model returned unknown relation', String(relation));
  }
  const rationale =
    typeof parsed.rationale === 'string' && parsed.rationale.trim()
      ? parsed.rationale.trim()
      : 'No rationale provided.';
  return { relation, rationale };
}

export async function compareIncidentReports(
  reportAText: string,
  reportBText: string
): Promise<ComparisonResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return heuristicComparison(reportAText, reportBText);

  const prompt = [
    'Compare two community incident reports about the same location.',
    'Decide whether report B corroborates, contradicts, or is unrelated to report A.',
    'Handle Nigerian Pidgin and colloquial phrasing.',
    'Respond with JSON only: {"relation": "corroborates"|"contradicts"|"unrelated", "rationale": "one concise user-facing sentence"}.',
    `Report A: """${reportAText.trim()}"""`,
    `Report B: """${reportBText.trim()}"""`,
  ].join('\n');

  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      client.models.generateContent({ model: MODEL_ID, contents: prompt }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ComparisonError('Model request timed out')), TIMEOUT_MS)
      ),
    ]);
    const output = (response.text ?? '').trim();
    if (!output) throw new ComparisonError('Model returned empty output');
    return parseComparison(output);
  } catch (err) {
    if (err instanceof ComparisonError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new ComparisonError('Pairwise comparison failed', detail);
  }
}
