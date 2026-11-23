<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    url: string;
    writeText?: (text: string) => Promise<void>;
  }>(),
  { writeText: (text: string) => navigator.clipboard.writeText(text) },
);

const state = ref<'idle' | 'copied' | 'failed'>('idle');
watch(() => props.url, () => (state.value = 'idle'));

async function copy() {
  try {
    await props.writeText(props.url);
    state.value = 'copied';
  } catch {
    state.value = 'failed';
  }
}
</script>

<template>
  <div class="copy-link">
    <button type="button" class="action-button" @click="copy">Copiar enlace</button>
    <p role="status" class="copy-link__status">
      <template v-if="state === 'copied'">Enlace copiado. Quien lo abra verá este impacto con los datos del momento.</template>
      <template v-else-if="state === 'failed'">No se pudo copiar automáticamente. Selecciona el enlace y cópialo.</template>
    </p>
    <input v-if="state === 'failed'" class="copy-link__text" readonly :value="url" aria-label="Enlace al impacto" />
  </div>
</template>

<style scoped>
.copy-link { display: grid; gap: 0.375rem; justify-items: start; }
.copy-link__status { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
.copy-link__status:empty { display: none; }
.copy-link__text { width: 100%; font: inherit; font-size: 0.875rem; padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); color: var(--text); }
</style>
