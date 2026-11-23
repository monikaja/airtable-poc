import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { AlternativesBase } from '../../shared/types.js';
import { createCache } from './cache.js';

// The LLM writes one sentence per alternative that already passed the deterministic
// filter. It never chooses or ranks alternatives. One request covers all of them.

export const EXPLAINER_MODEL = 'claude-haiku-5-5';
/** Short sentences only; the margin covers the model's brief thinking at low effort. */
const MAX_TOKENS = 2000;
const REQUEST_TIMEOUT_MS = 8_000;
const EXPLANATION_CACHE_TTL_MS = 60 * 60_000;

export const SYSTEM_PROMPT = [
  'Eres analista de compras en una empresa de uniformes laborales.',
  'Recibes un material de referencia y alternativas compatibles que ya han pasado un filtro técnico.',
  'Para cada alternativa escribe una sola frase en español, de 25 palabras como máximo, que explique por qué encaja como sustituto y qué conviene vigilar.',
  'Usa solo los datos recibidos: composición, gramaje, tipo, proveedor, precio, diferencia de precio, plazo, estado y riesgo. No inventes certificaciones, calidades ni datos que no aparezcan.',
  'Habla en lenguaje de negocio (coste, plazo, riesgo de suministro), sin tecnicismos de bases de datos.',
  'Devuelve exactamente una explicación por cada id recibido.',
].join('\n');

const ExplanationsSchema = z.object({
  explanations: z.array(z.object({ id: z.string(), sentence: z.string() })),
});
export type Explanations = z.infer<typeof ExplanationsSchema>;

/** Maps alternative id → sentence. Throws when no explanation can be produced. */
export type Explainer = (base: AlternativesBase) => Promise<Map<string, string>>;

export function buildExplanationRequest(base: AlternativesBase) {
  const facts = {
    referencia: {
      material: base.reference.label,
      detalle: base.reference.detail,
      precio: base.reference.price === null ? null : `${base.reference.price} €/${base.reference.unit}`,
      plazoDias: base.reference.leadTimeDays,
      estado: base.reference.status,
    },
    alternativas: base.alternatives.map((option) => ({
      id: option.id,
      material: option.label,
      detalle: option.detail,
      proveedor: option.supplierName,
      precio: option.price === null ? null : `${option.price} €/${option.unit}`,
      diferenciaPrecioPct: option.priceDeltaPct,
      plazoDias: option.leadTimeDays,
      estado: option.status,
      riesgo: option.riskReason ? `${option.risk} (${option.riskReason})` : option.risk,
    })),
  };

  return {
    model: EXPLAINER_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content: `Datos (JSON):\n${JSON.stringify(facts, null, 2)}` }],
    output_config: { effort: 'low' as const, format: zodOutputFormat(ExplanationsSchema) },
  };
}

export interface ExplanationResponse {
  stop_reason: string | null;
  parsed_output: Explanations | null;
}

/** Keeps one non-empty sentence per known id. Throws on refusal, truncation or unreadable output. */
export function readExplanations(response: ExplanationResponse, base: AlternativesBase): Map<string, string> {
  if (response.stop_reason !== 'end_turn' || !response.parsed_output) {
    throw new Error(`El LLM no devolvió explicaciones (stop_reason: ${response.stop_reason ?? 'desconocido'})`);
  }
  const known = new Set(base.alternatives.map((option) => option.id));
  const sentences = new Map<string, string>();
  for (const { id, sentence } of response.parsed_output.explanations) {
    const text = sentence.trim();
    if (known.has(id) && text && !sentences.has(id)) sentences.set(id, text);
  }
  return sentences;
}

function cacheKey(base: AlternativesBase): string {
  const parts = [base.reference, ...base.alternatives].map((item) => [item.id, item.price, item.leadTimeDays, item.status].join(':'));
  return parts.join('|');
}

const cache = createCache(EXPLANATION_CACHE_TTL_MS);

/** Null when ANTHROPIC_API_KEY is missing: alternatives are then served without sentences. */
export function getExplainer(): Explainer | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return (base) =>
    cache.get(cacheKey(base), async () => readExplanations(await client.messages.parse(buildExplanationRequest(base)), base));
}
