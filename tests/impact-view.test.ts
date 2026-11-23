// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ImpactView from '../src/components/ImpactView.vue';
import RiskBadge from '../src/components/RiskBadge.vue';
import type { ImpactResult, SearchResult } from '../shared/types';
import { impactResult } from './impact-fixture';

const subject: SearchResult = { tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };
const plain = (text: string) => text.replace(/\s+/g, ' ');

async function mountWith(result: ImpactResult | Promise<ImpactResult>) {
  const loadImpact = vi.fn(async () => result);
  const wrapper = mount(ImpactView, { props: { subject, loadImpact } });
  await flushPromises();
  return { wrapper, loadImpact };
}

describe('RiskBadge', () => {
  it('always shows the risk as text, not only as colour', () => {
    expect(mount(RiskBadge, { props: { risk: 'Rojo' } }).text()).toBe('Rojo');
    expect(mount(RiskBadge, { props: { risk: 'Ámbar' } }).classes()).toContain('risk--amber');
    expect(mount(RiskBadge, { props: { risk: null } }).text()).toBe('Sin calcular');
  });
});

describe('ImpactView', () => {
  it('loads the impact of the chosen subject', async () => {
    const { loadImpact } = await mountWith(impactResult);
    expect(loadImpact).toHaveBeenCalledWith('tejido', 'recF7', expect.any(AbortSignal));
  });

  it('states the key answer in one sentence before any table', async () => {
    const { wrapper } = await mountWith(impactResult);
    const summary = wrapper.get('[data-test="impact-summary"]');
    expect(plain(summary.text())).toContain('Afecta a 3 prendas y 2 clientes');
    expect(plain(summary.text())).toContain('18.200,00 € de coste anual');
    expect(summary.text()).toContain('Descatalogado');
  });

  it('lists garments with phase, risk, critical lead time and cost', async () => {
    const { wrapper } = await mountWith(impactResult);
    const rows = wrapper.findAll('[data-test="garments"] tbody tr').map((row) => plain(row.text()));
    expect(rows[0]).toMatch(/PR-001.*Pantalón multibolsillos.*Producción.*Rojo.*30 días.*8,00 €.*6,00 €/);
    expect(rows[1]).toMatch(/PR-002.*Sin plazo informado/);
    expect(rows[2]).toMatch(/PR-003.*Sin calcular.*Sin precio/);
  });

  it('lists clients with sector, garments, annual units and annual cost', async () => {
    const { wrapper } = await mountWith(impactResult);
    const rows = wrapper.findAll('[data-test="clients"] tbody tr').map((row) => plain(row.text()));
    expect(rows[0]).toMatch(/Hospital Ribera Norte.*Sanidad.*2.*1500.*15\.000,00 €/);
  });

  it('explains a material that is not used anywhere', async () => {
    const unused: ImpactResult = {
      ...impactResult,
      subject: { ...impactResult.subject, label: 'TJ-030 · Lino', status: 'Activo' },
      garments: [],
      clients: [],
      totals: { garmentCount: 0, clientCount: 0, annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 },
    };
    const { wrapper } = await mountWith(unused);
    expect(wrapper.text()).toContain('TJ-030 · Lino no se usa en ninguna prenda, así que no afecta a ningún cliente.');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('explains garments that no client buys', async () => {
    const { wrapper } = await mountWith({ ...impactResult, clients: [], totals: { ...impactResult.totals, clientCount: 0, annualCost: 0 } });
    expect(wrapper.text()).toContain('Ningún cliente tiene estas prendas en su catálogo.');
  });

  it('shows loading and error states', async () => {
    let fail!: (error: Error) => void;
    const { wrapper } = await mountWith(new Promise((_, reject) => (fail = reject)));
    expect(wrapper.text()).toContain('Calculando el impacto…');
    fail(new Error('No se encontró el tejido.'));
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('No se encontró el tejido.');
  });
});
