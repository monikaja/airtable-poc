// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import type { AlternativesResult, ImpactResult } from '../shared/types';
import AlternativesPanel from '../src/components/AlternativesPanel.vue';
import ImpactView from '../src/components/ImpactView.vue';
import { buildImpactSummary } from '../src/summary';
import { impactResult } from './impact-fixture';

const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
const fabric = { tipo: 'tejido' as const, id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };
const supplier = { tipo: 'proveedor' as const, id: 'recP4', label: 'Anatolia Dokuma', detail: 'Turquía', status: 'Activo' };

const withPriceDate = (priceUpdatedOn: string | null, overrides: Partial<ImpactResult['subject']> = {}): ImpactResult => ({
  ...impactResult,
  subject: { ...impactResult.subject, priceUpdatedOn, ...overrides },
});

async function mountImpact(result: ImpactResult, subject: typeof fabric | typeof supplier = fabric) {
  const wrapper = mount(ImpactView, { props: { subject, loadImpact: async () => result } });
  await flushPromises();
  return plain(wrapper.get('[data-test="price-date"]').text());
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 23, 12));
});
afterEach(() => vi.useRealTimers());

describe('Price date of the chosen material', () => {
  it('shows when the price was last updated', async () => {
    expect(await mountImpact(withPriceDate('2026-10-28'))).toBe('Precio del 28/10/2026');
  });

  it('warns when the price is more than 90 days old, because the simulation starts from it', async () => {
    expect(await mountImpact(withPriceDate('2026-03-03'))).toBe(
      'Aviso: precio sin actualizar desde el 03/03/2026 (hace 265 días). La simulación parte de este precio.',
    );
  });

  it('warns when the price date is unknown', async () => {
    expect(await mountImpact(withPriceDate(null))).toBe(
      'Aviso: precio sin fecha de actualización. La simulación parte de este precio.',
    );
  });

  it('uses the oldest price of a supplier’s materials', async () => {
    const result = withPriceDate('2026-03-03', { tipo: 'proveedor', id: 'recP4', label: 'Anatolia Dokuma', status: 'Activo', materialCount: 2 });
    expect(await mountImpact(result, supplier)).toBe(
      'Aviso: el precio más antiguo de sus materiales es del 03/03/2026 (hace 265 días). La simulación parte de estos precios.',
    );
  });

  it('adds the warning to the summary to share', () => {
    expect(buildImpactSummary(withPriceDate('2026-03-03'), 0)).toContain(
      'Aviso: precio sin actualizar desde el 03/03/2026 (hace 265 días). La simulación parte de este precio.',
    );
    expect(buildImpactSummary(withPriceDate('2026-10-28'), 0)).not.toContain('Aviso');
  });
});

describe('Price date of the alternatives', () => {
  const result: AlternativesResult = {
    reference: {
      tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', price: 4.8, unit: 'm',
      leadTimeDays: 30, status: 'Descatalogado', priceUpdatedOn: '2026-03-03',
    },
    alternatives: [
      {
        tipo: 'tejido', id: 'recF9', label: 'TJ-009 · Sarga 60/40 marino', detail: '', supplierName: 'Lianhe Weaving',
        price: 4.6, unit: 'm', priceDelta: -0.2, priceDeltaPct: -4.2, leadTimeDays: 50, status: 'Activo', risk: 'Verde',
        riskReason: null, priceUpdatedOn: '2026-10-28', explanation: 'Más barata.', explanationSource: 'llm',
      },
      {
        tipo: 'tejido', id: 'recF10', label: 'TJ-010 · Sarga 70/30 azul noche', detail: '', supplierName: 'Tecelagem do Norte',
        price: 5.4, unit: 'm', priceDelta: 0.6, priceDeltaPct: 12.5, leadTimeDays: 18, status: 'Activo', risk: 'Verde',
        riskReason: null, priceUpdatedOn: null, explanation: 'Más cara.', explanationSource: 'llm',
      },
    ],
  };

  it('dates the reference price and each alternative price, warning when stale or unknown', async () => {
    const wrapper = mount(AlternativesPanel, { props: { subject: fabric, loadAlternatives: async () => result } });
    await flushPromises();

    expect(plain(wrapper.get('[data-test="reference"]').text())).toContain('Aviso: precio sin actualizar desde el 03/03/2026 (hace 265 días)');
    const cards = wrapper.findAll('[data-test="alternative"]').map((card) => plain(card.text()));
    expect(cards[0]).toContain('Precio del 28/10/2026');
    expect(cards[1]).toContain('Aviso: precio sin fecha de actualización');
  });
});
