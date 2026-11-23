<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SearchResult } from '../shared/types';
import { api } from './api/client';
import AlternativesPanel from './components/AlternativesPanel.vue';
import ImpactView from './components/ImpactView.vue';
import SearchBox from './components/SearchBox.vue';
import { readShareState, writeShareSearch } from './share';

// A shared link opens its material directly; its label arrives with the impact.
const shared = readShareState(window.location.search);
const subject = ref<SearchResult | null>(shared ? { tipo: shared.tipo, id: shared.id, label: '', detail: '', status: null } : null);
const pricePct = ref(shared?.pricePct ?? 0);

function choose(result: SearchResult) {
  subject.value = result;
  pricePct.value = 0;
}

const search = computed(() =>
  writeShareSearch(subject.value ? { tipo: subject.value.tipo, id: subject.value.id, pricePct: pricePct.value } : null),
);
const shareUrl = computed(() => `${window.location.origin}${window.location.pathname}${search.value}`);

// Keep the address bar in step without adding a history entry per slider move.
watch(search, (value) => window.history.replaceState(null, '', value || window.location.pathname));
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1>Análisis de impacto de materiales</h1>
      <p class="app__intro no-print">Busca un tejido, un avío o un proveedor para ver qué prendas y clientes se ven afectados.</p>
      <SearchBox class="no-print" :search="api.search" @select="choose" />
    </header>

    <div v-if="subject" class="app__body">
      <ImpactView v-model:price-pct="pricePct" :subject="subject" :load-impact="api.impact" :share-url="shareUrl" />
      <AlternativesPanel :subject="subject" :load-alternatives="api.alternatives" />
    </div>
  </div>
</template>

<style scoped>
.app { max-width: 84rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.app__header { display: grid; gap: 0.75rem; margin-bottom: 1.5rem; max-width: 48rem; }
.app__intro { margin: 0; color: var(--text-muted); }
.app__body { display: grid; gap: 1.5rem; }

@media (min-width: 64rem) {
  .app__body { grid-template-columns: minmax(0, 1fr) 22rem; align-items: start; }
}

/* The printed report reads top to bottom: impact first, then the alternatives. */
@media print {
  .app { padding: 0; max-width: none; }
  .app__header { margin-bottom: 0.75rem; }
  .app__body { grid-template-columns: none; }
}
</style>
