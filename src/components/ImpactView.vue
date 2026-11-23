<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { simulateTotals } from '../../shared/simulation';
import type { ImpactResult, SearchResult, SubjectKind } from '../../shared/types';
import { formatEuro, formatSignedEuro, formatSignedPct, plural } from '../format';
import ClientTable from './ClientTable.vue';
import CopyLink from './CopyLink.vue';
import CopySummary from './CopySummary.vue';
import GarmentTable from './GarmentTable.vue';
import PriceDate from './PriceDate.vue';
import PriceSimulator from './PriceSimulator.vue';

const props = defineProps<{
  subject: SearchResult;
  loadImpact: (tipo: SubjectKind, id: string, signal: AbortSignal) => Promise<ImpactResult>;
  /** Link that reopens this impact; the copy button is only shown when it is given. */
  shareUrl?: string;
  /** Opens the browser print dialog, where the report is saved as PDF. */
  print?: () => void;
}>();

const printedOn = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

function printReport() {
  (props.print ?? (() => window.print()))();
}

const impact = ref<ImpactResult | null>(null);
const loading = ref(false);
const error = ref('');
/** Simulated price change in %, in memory only. A parent may own it (v-model:price-pct) to keep it in the link. */
const pricePct = defineModel<number>('pricePct', { default: 0 });
const simulatedTotals = computed(() => (impact.value && pricePct.value !== 0 ? simulateTotals(impact.value, pricePct.value) : null));
let controller: AbortController | undefined;

async function load(subject: SearchResult) {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  impact.value = null;
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

watch(
  () => props.subject,
  (subject, previous) => {
    // A new subject starts again from its current price; the first one keeps the price of a shared link.
    if (previous) pricePct.value = 0;
    load(subject);
  },
  { immediate: true },
);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="impact" aria-labelledby="impact-title" :aria-busy="loading">
    <h2 id="impact-title" class="visually-hidden">Impacto</h2>
    <p v-if="loading" class="muted" aria-live="polite">Calculando el impacto…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>

    <template v-else-if="impact">
      <p class="print-only print-header" data-test="print-header">
        Informe de impacto · generado el {{ printedOn }} con los datos de Airtable de ese momento.
        <template v-if="pricePct !== 0">Incluye una simulación de precio {{ formatSignedPct(pricePct) }}: no es un cambio real.</template>
      </p>
      <div class="summary" data-test="impact-summary">
        <p class="summary__subject">
          {{ impact.subject.label }}
          <span v-if="impact.subject.status" class="summary__status">{{ impact.subject.status }}</span>
        </p>
        <PriceDate
          v-if="impact.subject.materialCount > 0"
          :updated-on="impact.subject.priceUpdatedOn"
          :scope="impact.subject.tipo === 'proveedor' ? 'proveedor' : 'material'"
          :simulation-note="impact.totals.garmentCount > 0"
        />
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
        <div class="summary__actions no-print">
          <CopySummary :impact="impact" :price-pct="pricePct" />
          <CopyLink v-if="shareUrl" :url="shareUrl" />
          <button type="button" class="action-button" @click="printReport">Descargar PDF</button>
        </div>
      </div>

      <template v-if="impact.totals.garmentCount > 0">
        <PriceSimulator v-model="pricePct" class="no-print" :subject-kind="impact.subject.tipo" />

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
.summary__actions { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: start; margin-top: 0.5rem; }
.summary__simulation { margin: 0; font-weight: 600; color: var(--sim-text); font-variant-numeric: tabular-nums; }
.impact__heading { font-size: 1.0625rem; margin-top: 0.5rem; }
.print-header { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
</style>
