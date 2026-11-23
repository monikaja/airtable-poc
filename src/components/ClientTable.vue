<script setup lang="ts">
import { simulateClient } from '../../shared/simulation';
import type { AffectedClient } from '../../shared/types';
import { formatEuro, formatNumber, formatSignedEuro, formatSignedPct } from '../format';

defineProps<{ clients: AffectedClient[]; pricePct: number }>();
</script>

<template>
  <div class="table-wrap">
    <table class="table" data-test="clients">
      <caption class="visually-hidden">Clientes afectados</caption>
      <thead>
        <tr>
          <th scope="col">Cliente</th>
          <th scope="col">Sector</th>
          <th scope="col" class="num">Prendas</th>
          <th scope="col" class="num">Unidades anuales</th>
          <th scope="col" class="num">Coste anual</th>
          <template v-if="pricePct !== 0">
            <th scope="col" class="num sim">Coste anual simulado</th>
            <th scope="col" class="num sim">Impacto anual</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <th scope="row">{{ client.name }}</th>
          <td>{{ client.sector ?? 'Sin sector' }}</td>
          <td class="num">{{ formatNumber(client.garmentCount) }}</td>
          <td class="num">{{ formatNumber(client.annualUnits) }}</td>
          <td class="num">{{ formatEuro(client.annualCost) }}</td>
          <template v-if="pricePct !== 0">
            <td class="num sim">{{ formatEuro(simulateClient(client, pricePct).simulated) }}</td>
            <td class="num sim">
              {{ formatSignedEuro(simulateClient(client, pricePct).delta) }}
              <span class="pct">{{ formatSignedPct(simulateClient(client, pricePct).deltaPct) }}</span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
