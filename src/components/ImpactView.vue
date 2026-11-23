<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { simulateTotals } from '../../shared/simulation';
import type { ImpactResult, SearchResult, SubjectKind } from '../../shared/types';
import { formatEuro, formatSignedEuro, formatSignedPct, plural } from '../format';
import ClientTable from './ClientTable.vue';
import GarmentTable from './GarmentTable.vue';
import PriceSimulator from './PriceSimulator.vue';

const props = defineProps<{
  subject: SearchResult;
  loadImpact: (tipo: SubjectKind, id: string, signal: AbortSignal) => Promise<ImpactResult>;
}>();

const impact = ref<ImpactResult | null>(null);
const loading = ref(false);
const error = ref('');
/** Simulated price change in %, in memory only. */
const pricePct = ref(0);
const simulatedTotals = computed(() => (impact.value && pricePct.value !== 0 ? simulateTotals(impact.value, pricePct.value) : null));
let controller: AbortController | undefined;

async function load(subject: SearchResult) {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  impact.value = null;
  pricePct.value = 0;
  error.value = '';
  loading.value = true;
  try {
    const result = await props.loadImpact(subject.tipo, subject.id, signal);
    if (!signal.aborted) impact.value = result;
  } catch (cause) {
    if (!signal.aborted) error.value = cause instanceof Error ? cause.message : 'No se pudo calcular el impacto.';
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

watch(() => props.subject, load, { immediate: true });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="impact" aria-labelledby="impact-title" :aria-busy="loading">
    <h2 id="impact-title" class="visually-hidden">Impacto</h2>
    <p v-if="loading" class="muted" aria-live="polite">Calculando el impacto…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <template v-else-if="impact">
      <div class="summary" data-test="impact-summary">
        <p class="summary__subject">
          {{ impact.subject.label }}
          <span v-if="impact.subject.status" class="summary__status">{{ impact.subject.status }}</span>
        </p>
        <p v-if="impact.totals.garmentCount === 0" class="summary__headline">
          {{ impact.subject.label }} no se usa en ninguna prenda, así que no afecta a ningún cliente.
        </p>
        <p v-else class="summary__headline">
          Afecta a {{ plural(impact.totals.garmentCount, 'prenda', 'prendas') }} y
          {{ plural(impact.totals.clientCount, 'cliente', 'clientes') }} ·
          <strong>{{ formatEuro(impact.totals.annualCost) }} de coste anual</strong>
        </p>
        <p v-if="simulatedTotals" class="summary__simulation" data-test="simulation-summary">
          <span class="sim-tag">Simulación {{ formatSignedPct(pricePct) }}</span>:
          {{ formatSignedEuro(simulatedTotals.delta) }} al año ({{ formatSignedPct(simulatedTotals.deltaPct) }})
        </p>
      </div>

      <template v-if="impact.totals.garmentCount > 0">
        <PriceSimulator v-model="pricePct" :subject-kind="impact.subject.tipo" />

        <h3 class="impact__heading">Prendas afectadas</h3>
        <GarmentTable :garments="impact.garments" :price-pct="pricePct" />

        <h3 class="impact__heading">Clientes afectados</h3>
        <p v-if="impact.clients.length === 0" class="muted">Ningún cliente tiene estas prendas en su catálogo.</p>
        <ClientTable v-else :clients="impact.clients" :price-pct="pricePct" />
      </template>
    </template>
  </section>
</template>

<style scoped>
.impact { display: grid; gap: 1rem; align-content: start; min-width: 0; }
.muted { margin: 0; color: var(--text-muted); }
.error { margin: 0; color: var(--danger-text); }
.summary {
  display: grid;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.summary__subject { margin: 0; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.summary__status { font-size: 0.8125rem; padding: 0 0.5rem; border: 1px solid var(--border-strong); border-radius: 999px; }
.summary__headline { margin: 0; font-size: 1.25rem; }
.summary__simulation { margin: 0; font-weight: 600; color: var(--sim-text); font-variant-numeric: tabular-nums; }
.impact__heading { font-size: 1.0625rem; margin-top: 0.5rem; }
</style>
