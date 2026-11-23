<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ImpactResult } from '../../shared/types';
import { buildImpactSummary } from '../summary';

const props = withDefaults(
  defineProps<{
    impact: ImpactResult;
    pricePct: number;
    writeText?: (text: string) => Promise<void>;
  }>(),
  { writeText: (text: string) => navigator.clipboard.writeText(text) },
);

const state = ref<'idle' | 'copied' | 'failed'>('idle');
const text = computed(() => buildImpactSummary(props.impact, props.pricePct));

async function copy() {
  try {
    await props.writeText(text.value);
    state.value = 'copied';
  } catch {
    state.value = 'failed';
  }
}
</script>

<template>
  <div class="copy">
    <button type="button" class="action-button" @click="copy">Copiar resumen</button>
    <p role="status" class="copy__status">
      <template v-if="state === 'copied'">Resumen copiado. Ya puedes pegarlo en un correo o un chat.</template>
      <template v-else-if="state === 'failed'">No se pudo copiar automáticamente. Selecciona el texto y cópialo.</template>
    </p>
    <textarea v-if="state === 'failed'" class="copy__text" readonly rows="8" :value="text" aria-label="Resumen del impacto" />
  </div>
</template>

<style scoped>
.copy { display: grid; gap: 0.375rem; justify-items: start; }
.copy__status { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
.copy__status:empty { display: none; }
.copy__text { width: 100%; font: inherit; font-size: 0.875rem; padding: 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); color: var(--text); }
</style>
