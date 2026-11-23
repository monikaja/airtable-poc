<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { ImpactResult, SearchResult, SubjectKind } from '../../shared/types';
import { formatEuro, plural } from '../format';
import ClientTable from './ClientTable.vue';
import GarmentTable from './GarmentTable.vue';

const props = defineProps<{
  subject: SearchResult;
  loadImpact: (tipo: SubjectKind, id: string, signal: AbortSignal) => Promise<ImpactResult>;
}>();

const impact = ref<ImpactResult | null>(null);
const loading = ref(false);
const error = ref('');
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
      </div>

      <template v-if="impact.totals.garmentCount > 0">
        <h3 class="impact__heading">Prendas afectadas</h3>
        <GarmentTable :garments="impact.garments" />

        <h3 class="impact__heading">Clientes afectados</h3>
        <p v-if="impact.clients.length === 0" class="muted">Ningún cliente tiene estas prendas en su catálogo.</p>
        <ClientTable v-else :clients="impact.clients" />
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
.impact__heading { font-size: 1.0625rem; margin-top: 0.5rem; }
</style>
