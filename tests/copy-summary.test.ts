// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CopySummary from '../src/components/CopySummary.vue';
import { buildImpactSummary } from '../src/summary';
import { impactResult } from './impact-fixture';

const plain = (text: string) => text.replace(/[^\S\n]/g, ' ');

describe('buildImpactSummary', () => {
  it('writes a plain-text summary to send to Accounts or Purchasing', () => {
    expect(plain(buildImpactSummary(impactResult, 0))).toBe(
      [
        'Impacto de TJ-007 · Sarga 65/35 marino (Descatalogado)',
        'Afecta a 3 prendas y 2 clientes · 18.200,00 € de coste anual.',
        '',
        'Prendas afectadas:',
        '- PR-001 Pantalón multibolsillos · Producción · riesgo Rojo',
        '- PR-002 Chaqueta de trabajo · Aprobada · riesgo Ámbar',
        '- PR-003 Peto · Diseño · riesgo sin calcular',
        '',
        'Clientes afectados:',
        '- Hospital Ribera Norte · 1500 unidades al año · 15.000,00 € al año',
        '- Logística Meseta · 400 unidades al año · 3200,00 € al año',
      ].join('\n'),
    );
  });

  it('adds the simulation, marked as such, when the price was changed', () => {
    const text = plain(buildImpactSummary(impactResult, 10));
    expect(text).toContain('Simulación: precio +10 % → +1230,00 € al año (+6,8 %). No es un cambio real.');
    expect(text).toContain('- Hospital Ribera Norte · 1500 unidades al año · 15.000,00 € al año (simulación: +990,00 €)');
  });

  it('summarises a material that is not used anywhere', () => {
    const unused = {
      ...impactResult,
      subject: { ...impactResult.subject, label: 'TJ-030 · Lino', status: 'Activo' },
      garments: [],
      clients: [],
      totals: { garmentCount: 0, clientCount: 0, annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 },
    };
    expect(buildImpactSummary(unused, 0)).toBe(
      'Impacto de TJ-030 · Lino (Activo)\nTJ-030 · Lino no se usa en ninguna prenda, así que no afecta a ningún cliente.',
    );
  });
});

describe('CopySummary', () => {
  it('copies the summary and confirms it', async () => {
    const writeText = vi.fn(async () => {});
    const wrapper = mount(CopySummary, { props: { impact: impactResult, pricePct: 10, writeText } });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith(buildImpactSummary(impactResult, 10));
    expect(wrapper.get('[role="status"]').text()).toBe('Resumen copiado. Ya puedes pegarlo en un correo o un chat.');
  });

  it('shows the text to copy by hand when the clipboard is not available', async () => {
    const wrapper = mount(CopySummary, { props: { impact: impactResult, pricePct: 0, writeText: async () => Promise.reject(new Error('denied')) } });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('No se pudo copiar automáticamente. Selecciona el texto y cópialo.');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(buildImpactSummary(impactResult, 0));
  });
});
