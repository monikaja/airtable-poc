// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ImpactView from '../src/components/ImpactView.vue';
import { impactResult } from './impact-fixture';

const subject = { tipo: 'tejido' as const, id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };
const plain = (text: string) => text.replace(/\s+/g, ' ').trim();

async function mountView(pricePct = 0) {
  const print = vi.fn();
  const wrapper = mount(ImpactView, { props: { subject, pricePct, print, loadImpact: async () => impactResult } });
  await flushPromises();
  return { wrapper, print };
}

describe('Impact report as PDF', () => {
  afterEach(() => vi.useRealTimers());

  it('opens the print dialog to save the report as PDF', async () => {
    const { wrapper, print } = await mountView();
    const button = wrapper.findAll('button').find((b) => b.text() === 'Descargar PDF');
    await button!.trigger('click');
    expect(print).toHaveBeenCalledOnce();
  });

  it('dates the printed report', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 23, 12));
    const { wrapper } = await mountView();
    expect(plain(wrapper.get('[data-test="print-header"]').text())).toBe(
      'Informe de impacto · generado el 23/11/2026 con los datos de Airtable de ese momento.',
    );
  });

  it('warns in the printed report that a simulation is not a real change', async () => {
    const { wrapper } = await mountView(10);
    expect(plain(wrapper.get('[data-test="print-header"]').text())).toContain(
      'Incluye una simulación de precio +10 %: no es un cambio real.',
    );
  });
});
