<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { AlternativesResult, ExplanationSource, SearchResult } from '../../shared/types';
import { formatDays, formatEuro, formatSignedPct } from '../format';
import PriceDate from './PriceDate.vue';
import RiskBadge from './RiskBadge.vue';

const props = defineProps<{
  subject: SearchResult;
  loadAlternatives: (id: string, signal: AbortSignal) => Promise<AlternativesResult>;
}>();

const SOURCE_LABELS: Record<ExplanationSource, string> = {
  llm: 'Redactada por IA',
  plantilla: 'Resumen automático',
};

const result = ref<AlternativesResult | null>(null);
const loading = ref(false);
const error = ref('');
let controller: AbortController | undefined;

const price = (value: number | null, unit: string) => (value === null ? 'Sin precio' : `${formatEuro(value)}/${unit}`);

async function load(subject: SearchResult) {
  controller?.abort();
  result.value = null;
  error.value = '';
  loading.value = false;
  // Suppliers have no alternatives: the deterministic rule compares materials.
  if (subject.tipo === 'proveedor') return;

  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  try {
    const found = await props.loadAlternatives(subject.id, signal);
    if (!signal.aborted) result.value = found;
  } catch (cause) {
    if (!signal.aborted) error.value = cause instanceof Error ? cause.message : 'No se pudieron buscar alternativas.';
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

watch(() => props.subject, load, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <aside class="alternatives" aria-labelledby="alternatives-title" :aria-busy="loading">
    <h2 id="alternatives-title" class="alternatives__title">Alternativas compatibles</h2>

    <p v-if="subject.tipo === 'proveedor'" class="muted">
      Las alternativas se buscan por material. Elige un tejido o un avío para verlas.
    </p>
    <p v-else-if="loading" class="muted" aria-live="polite">Buscando alternativas compatibles…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <template v-else-if="result">
      <div class="reference" data-test="reference">
        <p class="reference__text">
          Frente a <strong>{{ result.reference.label }}</strong>:
          {{ price(result.reference.price, result.reference.unit) }} · {{ formatDays(result.reference.leadTimeDays) }}
        </p>
        <PriceDate :updated-on="result.reference.priceUpdatedOn" />
      </div>

      <p v-if="result.alternatives.length === 0" class="muted">
        <template v-if="result.reference.tipo === 'tejido'">
          No hay tejidos compatibles con {{ result.reference.label }}: mismas fibras en proporción parecida y gramaje dentro de ±10 %.
        </template>
        <template v-else>No hay avíos compatibles con {{ result.reference.label }}: mismo tipo de avío.</template>
      </p>

      <ol v-else class="alternatives__list">
        <li v-for="option in result.alternatives" :key="option.id" class="card" data-test="alternative">
          <div class="card__head">
            <h3 class="card__name">{{ option.label }}</h3>
            <RiskBadge :risk="option.risk" />
          </div>
          <p class="card__meta">{{ option.supplierName || 'Proveedor sin informar' }} · {{ option.detail }}</p>
          <dl class="card__facts">
            <div>
              <dt>Precio</dt>
              <dd>
                {{ price(option.price, option.unit) }}
                <span class="card__delta">{{ option.priceDeltaPct === 0 ? 'mismo precio' : formatSignedPct(option.priceDeltaPct) }}</span>
              </dd>
            </div>
            <div>
              <dt>Plazo</dt>
              <dd>{{ formatDays(option.leadTimeDays) }}</dd>
            </div>
          </dl>
          <PriceDate :updated-on="option.priceUpdatedOn" />
          <p v-if="option.riskReason" class="card__risk">{{ option.riskReason }}</p>
          <p class="card__explanation">{{ option.explanation }}</p>
          <p class="card__source">{{ SOURCE_LABELS[option.explanationSource] }}</p>
        </li>
      </ol>
    </template>
  </aside>
</template>

<style scoped>
.alternatives { display: grid; gap: 0.75rem; align-content: start; min-width: 0; }
.alternatives__title { font-size: 1.0625rem; }
.muted { margin: 0; color: var(--text-muted); }
.error { margin: 0; color: var(--danger-text); }
.reference { display: grid; gap: 0.125rem; font-size: 0.9375rem; color: var(--text-muted); }
.reference__text { margin: 0; }
.reference strong { color: var(--text); }
.alternatives__list { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
.card {
  display: grid;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.card__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
.card__name { font-size: 1rem; }
.card__meta { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
.card__facts { display: flex; gap: 1.5rem; margin: 0; }
.card__facts dt { font-size: 0.8125rem; color: var(--text-muted); }
.card__facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.card__delta { font-weight: 400; font-size: 0.875rem; color: var(--text-muted); margin-left: 0.25rem; }
.card__risk { margin: 0; font-size: 0.875rem; color: var(--risk-amber-text); }
.card__explanation { margin: 0; }
.card__source { margin: 0; font-size: 0.75rem; color: var(--text-muted); }
</style>
