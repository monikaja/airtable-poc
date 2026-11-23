// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AlternativesPanel from '../src/components/AlternativesPanel.vue';
import type { AlternativesResult, SearchResult } from '../shared/types';

const plain = (text: string) => text.replace(/\s+/g, ' ');
const fabric: SearchResult = { tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };

const result: AlternativesResult = {
  reference: {
    tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '65 % poliéster, 35 % algodón · 245 g/m²',
    price: 4.8, unit: 'm', leadTimeDays: 30, status: 'Descatalogado', priceUpdatedOn: '2026-03-03',
  },
  alternatives: [
    {
      tipo: 'tejido', id: 'recF9', label: 'TJ-009 · Sarga 60/40 marino', detail: '60 % poliéster, 40 % algodón · 255 g/m²',
      supplierName: 'Lianhe Weaving', price: 4.6, unit: 'm', priceDelta: -0.2, priceDeltaPct: -4.2, leadTimeDays: 50,
      status: 'Activo', risk: 'Verde', riskReason: null, priceUpdatedOn: '2026-10-28',
      explanation: 'Más barata, pero tarda 20 días más.', explanationSource: 'llm',
    },
    {
      tipo: 'tejido', id: 'recF10', label: 'TJ-010 · Sarga 70/30 azul noche', detail: '70 % poliéster, 30 % algodón · 260 g/m²',
      supplierName: 'Tecelagem do Norte', price: 5.4, unit: 'm', priceDelta: 0.6, priceDeltaPct: 12.5, leadTimeDays: 18,
      status: 'En revisión', risk: 'Ámbar', riskReason: 'Material en revisión', priceUpdatedOn: null,
      explanation: 'Composición y gramaje compatibles; cuesta un 12,5 % más y entrega en 18 días (frente a 30).', explanationSource: 'plantilla',
    },
  ],
};

async function mountWith(subject: SearchResult, response: AlternativesResult | Promise<AlternativesResult> = result) {
  const loadAlternatives = vi.fn(async () => response);
  const wrapper = mount(AlternativesPanel, { props: { subject, loadAlternatives } });
  await flushPromises();
  return { wrapper, loadAlternatives };
}

describe('AlternativesPanel', () => {
  it('loads the alternatives of the chosen material', async () => {
    const { loadAlternatives } = await mountWith(fabric);
    expect(loadAlternatives).toHaveBeenCalledWith('recF7', expect.any(AbortSignal));
  });

  it('shows the reference it compares against', async () => {
    const { wrapper } = await mountWith(fabric);
    expect(plain(wrapper.get('[data-test="reference"]').text())).toMatch(/TJ-007 · Sarga 65\/35 marino.*4,80 €\/m.*30 días/);
  });

  it('shows cost, lead time, written risk and the sentence of each alternative', async () => {
    const { wrapper } = await mountWith(fabric);
    const cards = wrapper.findAll('[data-test="alternative"]').map((card) => plain(card.text()));
    expect(cards).toHaveLength(2);
    for (const fact of ['TJ-009 · Sarga 60/40 marino', 'Lianhe Weaving', '4,60 €/m', '−4,2 %', '50 días', 'Verde', 'Más barata, pero tarda 20 días más.']) {
      expect(cards[0]).toContain(fact);
    }
    expect(cards[1]).toMatch(/Ámbar.*Material en revisión/);
  });

  it('says who wrote each sentence', async () => {
    const { wrapper } = await mountWith(fabric);
    const cards = wrapper.findAll('[data-test="alternative"]');
    expect(cards[0]!.text()).toContain('Redactada por IA');
    expect(cards[1]!.text()).toContain('Resumen automático');
  });

  it('explains when no material is compatible', async () => {
    const { wrapper } = await mountWith(fabric, { ...result, alternatives: [] });
    expect(wrapper.text()).toContain(
      'No hay tejidos compatibles con TJ-007 · Sarga 65/35 marino: mismas fibras en proporción parecida y gramaje dentro de ±10 %.',
    );
  });

  it('explains the rule for trims too', async () => {
    const trim: SearchResult = { tipo: 'avio', id: 'recA5', label: 'AV-005 · Cremallera', detail: '', status: 'En revisión' };
    const { wrapper } = await mountWith(trim, { reference: { ...result.reference, tipo: 'avio', label: 'AV-005 · Cremallera', unit: 'ud' }, alternatives: [] });
    expect(wrapper.text()).toContain('No hay avíos compatibles con AV-005 · Cremallera: mismo tipo de avío.');
  });

  it('does not search alternatives for a supplier', async () => {
    const supplier: SearchResult = { tipo: 'proveedor', id: 'recP1', label: 'Anatolia Dokuma', detail: 'Turquía', status: 'Activo' };
    const { wrapper, loadAlternatives } = await mountWith(supplier);
    expect(loadAlternatives).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Las alternativas se buscan por material. Elige un tejido o un avío para verlas.');
  });

  it('shows loading and error states', async () => {
    let fail!: (error: Error) => void;
    const { wrapper } = await mountWith(fabric, new Promise((_, reject) => (fail = reject)));
    expect(wrapper.text()).toContain('Buscando alternativas compatibles…');
    fail(new Error('Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.'));
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.');
  });
});
