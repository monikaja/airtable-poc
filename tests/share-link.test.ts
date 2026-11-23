// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImpactResult } from '../shared/types';
import CopyLink from '../src/components/CopyLink.vue';
import ImpactView from '../src/components/ImpactView.vue';
import { impactResult } from './impact-fixture';

const { impact, alternatives, search } = vi.hoisted(() => ({
  impact: vi.fn(),
  alternatives: vi.fn(),
  search: vi.fn(),
}));
vi.mock('../src/api/client', () => ({ api: { impact, alternatives, search } }));

const subject = { tipo: 'tejido' as const, id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', detail: '', status: 'Descatalogado' };

describe('CopyLink', () => {
  it('copies the link and confirms it', async () => {
    const writeText = vi.fn(async () => {});
    const wrapper = mount(CopyLink, { props: { url: 'https://demo.test/?tipo=tejido&id=recF7&sim=10', writeText } });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith('https://demo.test/?tipo=tejido&id=recF7&sim=10');
    expect(wrapper.get('[role="status"]').text()).toBe('Enlace copiado. Quien lo abra verá este impacto con los datos del momento.');
  });

  it('shows the link to copy by hand when the clipboard is not available', async () => {
    const wrapper = mount(CopyLink, { props: { url: 'https://demo.test/?tipo=tejido&id=recF7', writeText: async () => Promise.reject(new Error('denied')) } });
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('No se pudo copiar automáticamente. Selecciona el enlace y cópialo.');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('https://demo.test/?tipo=tejido&id=recF7');
  });
});

describe('ImpactView with a shared link', () => {
  it('opens with the simulated price of the link', async () => {
    const wrapper = mount(ImpactView, { props: { subject, pricePct: 10, loadImpact: async () => impactResult } });
    await flushPromises();
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe('10');
    expect(wrapper.find('[data-test="simulation-summary"]').exists()).toBe(true);
  });

  it('offers the link only when it is given one', async () => {
    const withLink = mount(ImpactView, { props: { subject, shareUrl: 'https://demo.test/?tipo=tejido&id=recF7', loadImpact: async () => impactResult } });
    const withoutLink = mount(ImpactView, { props: { subject, loadImpact: async () => impactResult } });
    await flushPromises();
    expect(withLink.text()).toContain('Copiar enlace');
    expect(withoutLink.text()).not.toContain('Copiar enlace');
  });
});

describe('App and the address bar', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.resetModules();
  });

  async function mountApp() {
    impact.mockResolvedValue(impactResult satisfies ImpactResult);
    alternatives.mockResolvedValue({ reference: { ...subject, price: 4.8, unit: 'm', leadTimeDays: 30 }, alternatives: [] });
    const { default: App } = await import('../src/App.vue');
    const wrapper = mount(App);
    await flushPromises();
    return wrapper;
  }

  it('opens the material and the simulation of a shared link', async () => {
    window.history.replaceState(null, '', '/?tipo=tejido&id=recF7&sim=10');
    const wrapper = await mountApp();

    expect(impact).toHaveBeenCalledWith('tejido', 'recF7', expect.any(AbortSignal));
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe('10');
  });

  it('keeps the address bar in step with the simulation', async () => {
    window.history.replaceState(null, '', '/?tipo=tejido&id=recF7');
    const wrapper = await mountApp();

    await wrapper.get('input[type="range"]').setValue('25');
    expect(window.location.search).toBe('?tipo=tejido&id=recF7&sim=25');
  });

  it('starts empty without a shared link', async () => {
    const wrapper = await mountApp();
    expect(wrapper.find('[data-test="impact-summary"]').exists()).toBe(false);
    expect(window.location.search).toBe('');
  });
});
