// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ImpactView from '../src/components/ImpactView.vue';
import PriceSimulator from '../src/components/PriceSimulator.vue';
import type { ImpactResult, SearchResult } from '../shared/types';
import { impactResult } from './impact-fixture';

const plain = (text: string) => text.replace(/\s+/g, ' ');
const subject: SearchResult = { tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };

describe('PriceSimulator', () => {
  it('offers a slider from −20 % to +40 %, labelled as a simulation', () => {
    const wrapper = mount(PriceSimulator, { props: { modelValue: 0, subjectKind: 'tejido' } });
    const slider = wrapper.get('input[type="range"]');
    expect(slider.attributes()).toMatchObject({ min: '-20', max: '40', step: '1' });
    expect(wrapper.text()).toContain('Simulación');
    expect(wrapper.text()).toContain('No modifica los datos de Airtable.');
  });

  it('emits the new percentage and resets to the current price', async () => {
    const wrapper = mount(PriceSimulator, { props: { modelValue: 10, subjectKind: 'tejido' } });
    expect(plain(wrapper.text())).toContain('+10 %');
    await wrapper.get('input[type="range"]').setValue('25');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[25], [0]]);
  });

  it('explains that a supplier change applies to all its materials', () => {
    const wrapper = mount(PriceSimulator, { props: { modelValue: 0, subjectKind: 'proveedor' } });
    expect(wrapper.text()).toContain('todos los materiales del proveedor');
  });
});

describe('ImpactView with a simulated price', () => {
  async function simulate(pct: number, result: ImpactResult = impactResult) {
    const wrapper = mount(ImpactView, { props: { subject, loadImpact: async () => result } });
    await flushPromises();
    await wrapper.get('input[type="range"]').setValue(String(pct));
    return wrapper;
  }

  it('shows no simulated figures at the current price', async () => {
    const wrapper = mount(ImpactView, { props: { subject, loadImpact: async () => impactResult } });
    await flushPromises();
    expect(wrapper.find('[data-test="simulation-summary"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Coste simulado');
  });

  it('states the simulated annual impact next to the key answer', async () => {
    const wrapper = await simulate(10);
    expect(plain(wrapper.get('[data-test="simulation-summary"]').text())).toBe('Simulación +10 %: +1230,00 € al año (+6,8 %)');
  });

  it('shows current cost, simulated cost and difference per garment', async () => {
    const wrapper = await simulate(10);
    const row = plain(wrapper.findAll('[data-test="garments"] tbody tr')[0]!.text());
    expect(row).toMatch(/PR-001.*8,00 €.*8,60 €.*\+0,60 €.*\+7,5 %/);
  });

  it('shows the annual impact per client in €', async () => {
    const wrapper = await simulate(-20);
    const row = plain(wrapper.findAll('[data-test="clients"] tbody tr')[0]!.text());
    expect(row).toMatch(/Hospital Ribera Norte.*15\.000,00 €.*13\.020,00 €.*−1980,00 €.*−13,2 %/);
  });

  it('starts again from the current price when another subject is chosen', async () => {
    const wrapper = await simulate(10);
    await wrapper.setProps({ subject: { ...subject, id: 'recF8' } });
    await flushPromises();
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe('0');
  });

  it('does not offer the simulator when nothing is affected', async () => {
    const wrapper = mount(ImpactView, {
      props: { subject, loadImpact: async () => ({ ...impactResult, garments: [], clients: [], totals: { garmentCount: 0, clientCount: 0, annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 } }) },
    });
    await flushPromises();
    expect(wrapper.find('input[type="range"]').exists()).toBe(false);
  });
});
