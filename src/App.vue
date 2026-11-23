<script setup lang="ts">
import { ref } from 'vue';
import type { SearchResult } from '../shared/types';
import { api } from './api/client';
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
    <main class="app__main">
      <p v-if="subject">{{ subject.label }}</p>
    </main>
  </div>
</template>

<style scoped>
.app { max-width: 80rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.app__header { display: grid; gap: 0.75rem; margin-bottom: 1.5rem; }
.app__intro { margin: 0; color: var(--text-muted); }
</style>
