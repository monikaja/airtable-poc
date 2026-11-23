import { describe, expect, it, vi } from 'vitest';
import { buildExplanationRequest, EXPLAINER_MODEL, readExplanations, type Explainer } from '../api/_lib/explainer';
import { alternativesRoute } from '../api/_lib/routes';
import { findAlternatives } from '../shared/alternatives';
import { fabric, snapshot } from './snapshot-builder';

const data = snapshot({
  fabrics: [
    fabric({ id: 'REF', code: 'TJ-007', name: 'Sarga marino', composition: '65 % poliéster, 35 % algodón', weightGsm: 245, pricePerMeter: 4.8, status: 'Descatalogado' }),
    fabric({ id: 'ALT', code: 'TJ-008', name: 'Sarga 67/33', composition: '67 % poliéster, 33 % algodón', weightGsm: 240, pricePerMeter: 5.1, supplierLeadTimeDays: 21 }),
    fabric({ id: 'LONE', code: 'TJ-030', name: 'Lino', composition: '100 % lino', weightGsm: 180 }),
  ],
});
const base = findAlternatives(data, 'REF')!;
const request = (query: string) => new Request(`http://localhost/api/alternatives${query}`);
const load = async () => data;

describe('GET /api/alternatives', () => {
  it('adds the sentence written for each alternative', async () => {
    const explainer: Explainer = async () => new Map([['ALT', 'Casi la misma mezcla; sube 6,3 % pero entrega en 21 días.']]);
    const response = await alternativesRoute(request('?id=REF'), load, explainer);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      reference: expect.objectContaining({ id: 'REF', label: 'TJ-007 · Sarga marino' }),
      alternatives: [expect.objectContaining({ id: 'ALT', priceDeltaPct: 6.3, explanation: 'Casi la misma mezcla; sube 6,3 % pero entrega en 21 días.' })],
      explanationsAvailable: true,
    });
  });

  it('still answers the alternatives when the LLM fails, flagging that sentences are missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await alternativesRoute(request('?id=REF'), load, async () => Promise.reject(new Error('timeout')));
    expect(await response.json()).toMatchObject({ alternatives: [{ id: 'ALT', explanation: null }], explanationsAvailable: false });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('answers without sentences when there is no API key', async () => {
    const response = await alternativesRoute(request('?id=REF'), load, null);
    expect(await response.json()).toMatchObject({ alternatives: [{ id: 'ALT', explanation: null }], explanationsAvailable: false });
  });

  it('does not call the LLM when there are no alternatives', async () => {
    const explainer = vi.fn<Explainer>();
    const response = await alternativesRoute(request('?id=LONE'), load, explainer);
    expect(await response.json()).toMatchObject({ alternatives: [], explanationsAvailable: true });
    expect(explainer).not.toHaveBeenCalled();
  });

  it('answers 400 without id and 404 for an unknown material', async () => {
    const missing = await alternativesRoute(request(''), load, null);
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: 'Falta el parámetro id.' });

    const unknown = await alternativesRoute(request('?id=NOPE'), load, null);
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: 'No se encontró el material.' });
  });
});

describe('explainer', () => {
  it('asks Claude Haiku 5.5 at low effort for structured output, sending only the filtered facts', () => {
    const params = buildExplanationRequest(base);
    expect(params.model).toBe(EXPLAINER_MODEL);
    expect(EXPLAINER_MODEL).toBe('claude-haiku-5-5');
    expect(params.output_config.effort).toBe('low');
    expect(params.output_config.format).toBeDefined();
    const content = params.messages[0]?.content ?? '';
    expect(content).toContain('"id": "ALT"');
    expect(content).toContain('"diferenciaPrecioPct": 6.3');
    expect(content).not.toContain('TJ-030');
  });

  it('keeps one sentence per known id and ignores the rest', () => {
    const sentences = readExplanations(
      {
        stop_reason: 'end_turn',
        parsed_output: {
          explanations: [
            { id: 'ALT', sentence: '  Buena opción.  ' },
            { id: 'ALT', sentence: 'Duplicada.' },
            { id: 'INVENTED', sentence: 'No debería aparecer.' },
          ],
        },
      },
      base,
    );
    expect([...sentences]).toEqual([['ALT', 'Buena opción.']]);
  });

  it('fails on refusal, truncation or unreadable output', () => {
    for (const response of [
      { stop_reason: 'refusal', parsed_output: null },
      { stop_reason: 'max_tokens', parsed_output: { explanations: [] } },
      { stop_reason: 'end_turn', parsed_output: null },
    ]) {
      expect(() => readExplanations(response, base)).toThrow('El LLM no devolvió explicaciones');
    }
  });
});
