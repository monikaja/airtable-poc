<script setup lang="ts">
import { simulateGarment } from '../../shared/simulation';
import type { AffectedGarment } from '../../shared/types';
import { formatDays, formatEuro, formatSignedEuro, formatSignedPct } from '../format';
import RiskBadge from './RiskBadge.vue';

defineProps<{ garments: AffectedGarment[]; pricePct: number }>();
</script>

<template>
  <div class="table-wrap">
    <table class="table" data-test="garments">
      <caption class="visually-hidden">Prendas afectadas</caption>
      <thead>
        <tr>
          <th scope="col">Prenda</th>
          <th scope="col">Fase</th>
          <th scope="col">Riesgo</th>
          <th scope="col">Plazo crítico</th>
          <th scope="col" class="num">Coste materiales</th>
          <th v-if="pricePct === 0" scope="col" class="num">Del material afectado</th>
          <template v-else>
            <th scope="col" class="num sim">Coste simulado</th>
            <th scope="col" class="num sim">Diferencia</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="garment in garments" :key="garment.id">
          <th scope="row"><span class="code">{{ garment.code }}</span> {{ garment.name }}</th>
          <td>{{ garment.phase ?? 'Sin fase' }}</td>
          <td><RiskBadge :risk="garment.risk" /></td>
          <td>{{ formatDays(garment.criticalLeadTimeDays) }}</td>
          <td class="num">{{ formatEuro(garment.materialsCost) }}</td>
          <td v-if="pricePct === 0" class="num">{{ formatEuro(garment.affectedMaterialCost) }}</td>
          <template v-else>
            <td class="num sim">{{ formatEuro(simulateGarment(garment, pricePct).simulated) }}</td>
            <td class="num sim">
              {{ formatSignedEuro(simulateGarment(garment, pricePct).delta) }}
              <span class="pct">{{ formatSignedPct(simulateGarment(garment, pricePct).deltaPct) }}</span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
