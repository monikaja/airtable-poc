<script setup lang="ts">
import type { AffectedClient } from '../../shared/types';
import { formatEuro, formatNumber } from '../format';

defineProps<{ clients: AffectedClient[] }>();
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
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <th scope="row">{{ client.name }}</th>
          <td>{{ client.sector ?? 'Sin sector' }}</td>
          <td class="num">{{ formatNumber(client.garmentCount) }}</td>
          <td class="num">{{ formatNumber(client.annualUnits) }}</td>
          <td class="num">{{ formatEuro(client.annualCost) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
