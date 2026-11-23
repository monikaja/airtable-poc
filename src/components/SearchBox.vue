<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import type { SearchResult } from '../../shared/types';
import { KIND_LABELS } from '../format';

const props = defineProps<{
  search: (q: string, signal: AbortSignal) => Promise<SearchResult[]>;
}>();
const emit = defineEmits<{ select: [result: SearchResult] }>();

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

const id = useId();
const query = ref('');
const results = ref<SearchResult[]>([]);
const searchedQuery = ref('');
const loading = ref(false);
const error = ref('');
const open = ref(false);
const active = ref(-1);

let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;

const optionId = (index: number) => `${id}-option-${index}`;
const activeDescendant = computed(() => (open.value && active.value >= 0 ? optionId(active.value) : undefined));
const showEmpty = computed(() => open.value && !loading.value && !error.value && searchedQuery.value !== '' && results.value.length === 0);

function onInput() {
  clearTimeout(timer);
  controller?.abort();
  error.value = '';
  const q = query.value.trim();
  if (q.length < MIN_QUERY_LENGTH) {
    results.value = [];
    searchedQuery.value = '';
    open.value = false;
    loading.value = false;
    return;
  }
  loading.value = true;
  timer = setTimeout(() => run(q), DEBOUNCE_MS);
}

async function run(q: string) {
  controller = new AbortController();
  const { signal } = controller;
  try {
    const found = await props.search(q, signal);
    if (signal.aborted) return;
    results.value = found;
    searchedQuery.value = q;
    active.value = -1;
    open.value = true;
  } catch (cause) {
    if (signal.aborted) return;
    results.value = [];
    error.value = cause instanceof Error ? cause.message : 'No se pudo buscar.';
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

function choose(result: SearchResult) {
  query.value = result.label;
  open.value = false;
  emit('select', result);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false;
    return;
  }
  if (!open.value || results.value.length === 0) return;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    active.value = (active.value + 1) % results.value.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    active.value = (active.value - 1 + results.value.length) % results.value.length;
  } else if (event.key === 'Enter' && active.value >= 0) {
    event.preventDefault();
    choose(results.value[active.value]!);
  }
}

onBeforeUnmount(() => {
  clearTimeout(timer);
  controller?.abort();
});
</script>

<template>
  <div class="search">
    <label :for="`${id}-input`" class="search__label">Tejido, avío o proveedor</label>
    <input
      :id="`${id}-input`"
      v-model="query"
      class="search__input"
      type="search"
      role="combobox"
      autocomplete="off"
      placeholder="Código o nombre, por ejemplo TJ-007 o cremallera"
      aria-autocomplete="list"
      :aria-expanded="open && results.length > 0"
      :aria-controls="`${id}-listbox`"
      :aria-activedescendant="activeDescendant"
      @input="onInput"
      @keydown="onKeydown"
      @blur="open = false"
      @focus="open = results.length > 0"
    />
    <p v-if="loading" class="search__hint" aria-live="polite">Buscando…</p>
    <p v-else-if="error" class="search__error" role="alert">{{ error }}</p>
    <p v-else-if="showEmpty" class="search__hint" aria-live="polite">
      No hay tejidos, avíos ni proveedores que coincidan con «{{ searchedQuery }}».
    </p>
    <ul v-if="open && results.length > 0" :id="`${id}-listbox`" class="search__list" role="listbox">
      <li
        v-for="(result, index) in results"
        :id="optionId(index)"
        :key="`${result.tipo}-${result.id}`"
        role="option"
        class="search__option"
        :class="{ 'search__option--active': index === active }"
        :aria-selected="index === active"
        @mousedown.prevent="choose(result)"
        @mouseenter="active = index"
      >
        <span class="search__kind">{{ KIND_LABELS[result.tipo] }}</span>
        <span class="search__name">{{ result.label }}</span>
        <span class="search__detail">{{ result.detail }}</span>
        <span v-if="result.status" class="search__status">{{ result.status }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search { position: relative; }
.search__label { display: block; font-weight: 600; margin-bottom: 0.375rem; }
.search__input {
  width: 100%;
  font: inherit;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}
.search__input:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.search__hint { margin: 0.5rem 0 0; color: var(--text-muted); }
.search__error { margin: 0.5rem 0 0; color: var(--danger-text); }
.search__list {
  position: absolute;
  z-index: 10;
  inset-inline: 0;
  margin: 0.25rem 0 0;
  padding: 0.25rem;
  list-style: none;
  max-height: 22rem;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.search__option {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  gap: 0.125rem 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: calc(var(--radius) - 2px);
  cursor: pointer;
}
.search__option--active { background: var(--surface-hover); }
.search__kind { grid-row: span 2; color: var(--text-muted); font-size: 0.8125rem; padding-top: 0.125rem; }
.search__name { font-weight: 600; }
.search__detail { grid-column: 2; color: var(--text-muted); font-size: 0.875rem; }
.search__status { grid-column: 3; grid-row: 1; font-size: 0.8125rem; color: var(--text-muted); }
</style>
