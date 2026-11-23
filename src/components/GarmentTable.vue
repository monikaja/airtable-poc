<script setup lang="ts">
import type { AffectedGarment } from '../../shared/types';
import { formatDays, formatEuro } from '../format';
import RiskBadge from './RiskBadge.vue';

defineProps<{ garments: AffectedGarment[] }>();
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
          <th scope="col" class="num">Del material afectado</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="garment in garments" :key="garment.id">
          <th scope="row"><span class="code">{{ garment.code }}</span> {{ garment.name }}</th>
          <td>{{ garment.phase ?? 'Sin fase' }}</td>
          <td><RiskBadge :risk="garment.risk" /></td>
          <td>{{ formatDays(garment.criticalLeadTimeDays) }}</td>
          <td class="num">{{ formatEuro(garment.materialsCost) }}</td>
          <td class="num">{{ formatEuro(garment.affectedMaterialCost) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
