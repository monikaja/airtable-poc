<script setup lang="ts">
import { ref } from 'vue';
import type { SearchResult } from '../shared/types';
import { api } from './api/client';
import AlternativesPanel from './components/AlternativesPanel.vue';
import ImpactView from './components/ImpactView.vue';
import SearchBox from './components/SearchBox.vue';

const subject = ref<SearchResult | null>(null);
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1>Análisis de impacto de materiales</h1>
      <p class="app__intro">Busca un tejido, un avío o un proveedor para ver qué prendas y clientes se ven afectados.</p>
      <SearchBox :search="api.search" @select="subject = $event" />
    </header>

    <div v-if="subject" class="app__body">
      <ImpactView :subject="subject" :load-impact="api.impact" />
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
</style>
