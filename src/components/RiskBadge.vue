<script setup lang="ts">
import { computed } from 'vue';
import type { RiskLevel } from '../../shared/schema';

// The risk is always written out: colour alone is never the only signal.
const props = defineProps<{ risk: RiskLevel | null }>();

const MODIFIERS: Record<RiskLevel, string> = { Rojo: 'risk--red', Ámbar: 'risk--amber', Verde: 'risk--green' };
const modifier = computed(() => (props.risk ? MODIFIERS[props.risk] : 'risk--none'));
</script>

<template>
  <span class="risk" :class="modifier">{{ risk ?? 'Sin calcular' }}</span>
</template>

<style scoped>
.risk {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}
.risk::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}
.risk--red { background: var(--risk-red-bg); color: var(--risk-red-text); }
.risk--amber { background: var(--risk-amber-bg); color: var(--risk-amber-text); }
.risk--green { background: var(--risk-green-bg); color: var(--risk-green-text); }
.risk--none { background: var(--surface-hover); color: var(--text-muted); }
</style>
