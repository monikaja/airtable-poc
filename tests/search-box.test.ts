// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchBox from '../src/components/SearchBox.vue';
import type { SearchResult } from '../shared/types';

const results: SearchResult[] = [
  { tipo: 'tejido', id: 'recF1', label: 'TJ-007 · Sarga 65/35 marino', detail: '65 % poliéster, 35 % algodón', status: 'Descatalogado' },
  { tipo: 'proveedor', id: 'recP1', label: 'Anatolia Dokuma', detail: 'Turquía', status: 'Activo' },
];

async function type(wrapper: ReturnType<typeof mount>, text: string) {
  await wrapper.get('input').setValue(text);
  vi.advanceTimersByTime(250);
  await flushPromises();
}

describe('SearchBox', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('searches 250 ms after the user stops typing and lists kind, name, detail and status', async () => {
    const search = vi.fn(async () => results);
    const wrapper = mount(SearchBox, { props: { search } });

    await wrapper.get('input').setValue('tj');
    vi.advanceTimersByTime(200);
    expect(search).not.toHaveBeenCalled();
    await type(wrapper, 'tj-0');

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('tj-0', expect.any(AbortSignal));
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((option) => option.text())).toEqual([
      expect.stringMatching(/Tejido.*TJ-007 · Sarga 65\/35 marino.*65 % poliéster, 35 % algodón.*Descatalogado/),
      expect.stringMatching(/Proveedor.*Anatolia Dokuma.*Turquía.*Activo/),
    ]);
  });

  it('waits for at least 2 characters', async () => {
    const search = vi.fn(async () => results);
    const wrapper = mount(SearchBox, { props: { search } });
    await type(wrapper, 't');
    expect(search).not.toHaveBeenCalled();
  });

  it('emits the chosen result on click and shows it in the box', async () => {
    const wrapper = mount(SearchBox, { props: { search: async () => results } });
    await type(wrapper, 'tj');
    await wrapper.findAll('[role="option"]')[1]!.trigger('mousedown');

    expect(wrapper.emitted('select')).toEqual([[results[1]]]);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Anatolia Dokuma');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('can be used with the keyboard', async () => {
    const wrapper = mount(SearchBox, { props: { search: async () => results } });
    await type(wrapper, 'tj');
    const input = wrapper.get('input');

    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[1]!.attributes('id'));
    await input.trigger('keydown', { key: 'ArrowUp' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('select')).toEqual([[results[0]]]);

    await type(wrapper, 'anatolia');
    await input.trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('explains when nothing matches', async () => {
    const wrapper = mount(SearchBox, { props: { search: async () => [] } });
    await type(wrapper, 'zzz');
    expect(wrapper.text()).toContain('No hay tejidos, avíos ni proveedores que coincidan con «zzz».');
  });

  it('shows the server error message', async () => {
    const wrapper = mount(SearchBox, { props: { search: async () => Promise.reject(new Error('Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.')) } });
    await type(wrapper, 'tj');
    expect(wrapper.get('[role="alert"]').text()).toBe('Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.');
  });

  it('cancels the previous search when the user keeps typing', async () => {
    const signals: AbortSignal[] = [];
    const search = vi.fn((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<SearchResult[]>(() => {});
    });
    const wrapper = mount(SearchBox, { props: { search } });
    await type(wrapper, 'tj');
    await type(wrapper, 'tj-0');
    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
  });
});
