<script setup lang="ts">
import { computed, useId } from 'vue';
import { SIMULATION_RANGE } from '../../shared/simulation';
import type { SubjectKind } from '../../shared/types';
import { formatSignedPct } from '../format';

const props = defineProps<{ modelValue: number; subjectKind: SubjectKind }>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const id = useId();
const scope = computed(() =>
  props.subjectKind === 'proveedor' ? 'todos los materiales del proveedor' : props.subjectKind === 'tejido' ? 'este tejido' : 'este avío',
);

function onInput(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <div class="simulator">
    <div class="simulator__head">
      <span class="sim-tag">Simulación</span>
      <label :for="`${id}-range`" class="simulator__label">Cambio de precio de {{ scope }}</label>
      <output :for="`${id}-range`" class="simulator__value">{{ formatSignedPct(modelValue) }}</output>
    </div>
    <input
      :id="`${id}-range`"
      class="simulator__range"
      type="range"
      :min="SIMULATION_RANGE.min"
      :max="SIMULATION_RANGE.max"
      :step="SIMULATION_RANGE.step"
      :value="modelValue"
      :aria-valuetext="formatSignedPct(modelValue)"
      @input="onInput"
    />
    <div class="simulator__scale" aria-hidden="true">
      <span>{{ formatSignedPct(SIMULATION_RANGE.min) }}</span>
      <span>0 %</span>
      <span>{{ formatSignedPct(SIMULATION_RANGE.max) }}</span>
    </div>
    <div class="simulator__foot">
      <p class="simulator__note">No modifica los datos de Airtable.</p>
      <button type="button" class="simulator__reset" :disabled="modelValue === 0" @click="emit('update:modelValue', 0)">
        Volver al precio actual
      </button>
    </div>
  </div>
</template>

<style scoped>
.simulator {
  display: grid;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: var(--sim-bg);
  border: 1px dashed var(--sim-border);
  border-radius: var(--radius);
}
.simulator__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem; }
.simulator__label { font-weight: 600; }
.simulator__value { margin-left: auto; font-size: 1.25rem; font-weight: 700; color: var(--sim-text); font-variant-numeric: tabular-nums; }
.simulator__range { width: 100%; accent-color: var(--sim-border); }
.simulator__range:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.simulator__scale { display: flex; justify-content: space-between; font-size: 0.8125rem; color: var(--text-muted); }
.simulator__scale span:nth-child(2) { position: relative; left: -16.6%; }
.simulator__foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; }
.simulator__note { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
.simulator__reset {
  font: inherit;
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.simulator__reset:disabled { opacity: 0.5; cursor: default; }
.simulator__reset:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
</style>
