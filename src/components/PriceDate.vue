<script setup lang="ts">
import { computed } from 'vue';
import { describePriceDate, type PriceDateScope } from '../price-date';

const props = withDefaults(
  defineProps<{
    updatedOn: string | null;
    scope?: PriceDateScope;
    /** Adds that the simulation starts from this price when it is stale. */
    simulationNote?: boolean;
  }>(),
  { scope: 'material', simulationNote: false },
);

const description = computed(() => describePriceDate(props.updatedOn, new Date(), props.scope, props.simulationNote));
</script>

<template>
  <p class="price-date" :class="{ 'price-date--stale': description.stale }" data-test="price-date">
    {{ description.text }}
  </p>
</template>

<style scoped>
.price-date { margin: 0; font-size: 0.875rem; color: var(--text-muted); }
.price-date--stale { color: var(--risk-amber-text); font-weight: 600; }
</style>
