import { simulateClient, simulateTotals } from '../shared/simulation';
import type { ImpactResult } from '../shared/types';
import { formatEuro, formatNumber, formatSignedEuro, formatSignedPct, plural } from './format';
import { describePriceDate } from './price-date';

/** Plain-text impact summary to paste into an email or chat for Accounts or Purchasing. */
export function buildImpactSummary(impact: ImpactResult, pricePct: number, today: Date = new Date()): string {
  const { subject, totals } = impact;
  const title = `Impacto de ${subject.label}${subject.status ? ` (${subject.status})` : ''}`;

  if (totals.garmentCount === 0) {
    return `${title}\n${subject.label} no se usa en ninguna prenda, así que no afecta a ningún cliente.`;
  }

  const lines = [
    title,
    `Afecta a ${plural(totals.garmentCount, 'prenda', 'prendas')} y ${plural(totals.clientCount, 'cliente', 'clientes')} · ${formatEuro(totals.annualCost)} de coste anual.`,
  ];

  const priceDate = describePriceDate(subject.priceUpdatedOn, today, subject.tipo === 'proveedor' ? 'proveedor' : 'material', true);
  if (priceDate.stale) lines.push(priceDate.text);

  if (pricePct !== 0) {
    const simulated = simulateTotals(impact, pricePct);
    lines.push(
      `Simulación: precio ${formatSignedPct(pricePct)} → ${formatSignedEuro(simulated.delta)} al año (${formatSignedPct(simulated.deltaPct)}). No es un cambio real.`,
    );
  }

  lines.push('', 'Prendas afectadas:');
  for (const garment of impact.garments) {
    lines.push(`- ${garment.code} ${garment.name} · ${garment.phase ?? 'sin fase'} · riesgo ${garment.risk ?? 'sin calcular'}`);
  }

  if (impact.clients.length > 0) {
    lines.push('', 'Clientes afectados:');
    for (const client of impact.clients) {
      const simulation = pricePct === 0 ? '' : ` (simulación: ${formatSignedEuro(simulateClient(client, pricePct).delta)})`;
      lines.push(`- ${client.name} · ${formatNumber(client.annualUnits)} unidades al año · ${formatEuro(client.annualCost)} al año${simulation}`);
    }
  } else {
    lines.push('', 'Ningún cliente tiene estas prendas en su catálogo.');
  }

  return lines.join('\n');
}
