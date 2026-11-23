import { findCompatibleFabrics, findCompatibleTrims } from './compatibility.js';
import { fabricLabel, trimLabel } from './labels.js';
import type { AlternativeOption, AlternativeReference, AlternativesBase, Fabric, Snapshot, Trim } from './types.js';

// Deterministic part of "alternatives": compatibility filter, risk, ordering and the
// top-3 cut. The LLM only writes a sentence for the options this module returns.

export const MAX_ALTERNATIVES = 3;
/** Same threshold as the "Riesgo" formula in Airtable. */
export const LONG_LEAD_TIME_DAYS = 60;

const RISK_ORDER = { Verde: 0, Ámbar: 1 } as const;

function fabricDetail(fabric: Fabric): string {
  return fabric.weightGsm === null ? fabric.composition : `${fabric.composition} · ${fabric.weightGsm} g/m²`;
}

function materialRisk(material: { status: Fabric['status']; supplierLeadTimeDays: number | null }): Pick<AlternativeOption, 'risk' | 'riskReason'> {
  if (material.status === 'En revisión') return { risk: 'Ámbar', riskReason: 'Material en revisión' };
  if (material.supplierLeadTimeDays !== null && material.supplierLeadTimeDays > LONG_LEAD_TIME_DAYS) {
    return { risk: 'Ámbar', riskReason: `Plazo del proveedor de ${material.supplierLeadTimeDays} días` };
  }
  return { risk: 'Verde', riskReason: null };
}

/** Works in whole cents so 5.10 − 4.80 is exactly 0.30 and its share exactly 6.25 %. */
function priceDifference(price: number | null, reference: number | null): Pick<AlternativeOption, 'priceDelta' | 'priceDeltaPct'> {
  if (price === null || reference === null || reference === 0) return { priceDelta: null, priceDeltaPct: null };
  const referenceCents = Math.round(reference * 100);
  const deltaCents = Math.round(price * 100) - referenceCents;
  return { priceDelta: deltaCents / 100, priceDeltaPct: Math.round((deltaCents * 1000) / referenceCents) / 10 };
}

const nullsLast = (a: number | null, b: number | null): number => (a ?? Number.POSITIVE_INFINITY) - (b ?? Number.POSITIVE_INFINITY) || 0;

function byRiskPriceLeadTime(a: AlternativeOption, b: AlternativeOption): number {
  return (
    RISK_ORDER[a.risk] - RISK_ORDER[b.risk] ||
    nullsLast(a.price, b.price) ||
    nullsLast(a.leadTimeDays, b.leadTimeDays) ||
    a.label.localeCompare(b.label, 'es')
  );
}

function fabricAlternatives(snapshot: Snapshot, reference: Fabric, supplierName: (id: string | null) => string): AlternativesBase {
  // Fabrics without weight or status cannot be compared, so they are never offered.
  const asCandidate = (item: Fabric) =>
    item.weightGsm === null || item.status === null ? null : { ...item, weightGsm: item.weightGsm, status: item.status };
  const referenceCandidate = asCandidate(reference);
  const candidates = snapshot.fabrics.flatMap((item) => {
    const candidate = asCandidate(item);
    return candidate ? [candidate] : [];
  });
  const compatible = referenceCandidate ? findCompatibleFabrics(referenceCandidate, candidates) : [];

  return {
    reference: {
      tipo: 'tejido',
      id: reference.id,
      label: fabricLabel(reference),
      detail: fabricDetail(reference),
      price: reference.pricePerMeter,
      unit: 'm',
      leadTimeDays: reference.supplierLeadTimeDays,
      status: reference.status,
      priceUpdatedOn: reference.priceUpdatedOn,
    },
    alternatives: compatible.map((item) => ({
      tipo: 'tejido' as const,
      id: item.id,
      label: fabricLabel(item),
      detail: fabricDetail(item),
      supplierName: supplierName(item.supplierId),
      price: item.pricePerMeter,
      unit: 'm' as const,
      ...priceDifference(item.pricePerMeter, reference.pricePerMeter),
      leadTimeDays: item.supplierLeadTimeDays,
      status: item.status,
      ...materialRisk(item),
      priceUpdatedOn: item.priceUpdatedOn,
    })),
  };
}

function trimAlternatives(snapshot: Snapshot, reference: Trim, supplierName: (id: string | null) => string): AlternativesBase {
  // Trims without type or status cannot be compared, so they are never offered.
  const typed = (item: Trim) => (item.type === null || item.status === null ? null : { ...item, type: item.type, status: item.status });
  const referenceCandidate = typed(reference);
  const candidates = snapshot.trims.flatMap((item) => {
    const candidate = typed(item);
    return candidate ? [candidate] : [];
  });
  const compatible = referenceCandidate ? findCompatibleTrims(referenceCandidate, candidates) : [];

  return {
    reference: {
      tipo: 'avio',
      id: reference.id,
      label: trimLabel(reference),
      detail: reference.type ?? '',
      price: reference.pricePerUnit,
      unit: 'ud',
      leadTimeDays: reference.supplierLeadTimeDays,
      status: reference.status,
      priceUpdatedOn: reference.priceUpdatedOn,
    },
    alternatives: compatible.map((item) => ({
      tipo: 'avio' as const,
      id: item.id,
      label: trimLabel(item),
      detail: item.type,
      supplierName: supplierName(item.supplierId),
      price: item.pricePerUnit,
      unit: 'ud' as const,
      ...priceDifference(item.pricePerUnit, reference.pricePerUnit),
      leadTimeDays: item.supplierLeadTimeDays,
      status: item.status,
      ...materialRisk(item),
      priceUpdatedOn: item.priceUpdatedOn,
    })),
  };
}

/** Up to 3 compatible alternatives to a fabric or trim, or null when the id is unknown. */
export function findAlternatives(snapshot: Snapshot, id: string): AlternativesBase | null {
  const names = new Map(snapshot.suppliers.map((supplier) => [supplier.id, supplier.name]));
  const supplierName = (supplierId: string | null) => (supplierId && names.get(supplierId)) || '';

  const fabric = snapshot.fabrics.find((item) => item.id === id);
  const trim = fabric ? undefined : snapshot.trims.find((item) => item.id === id);
  const base = fabric
    ? fabricAlternatives(snapshot, fabric, supplierName)
    : trim
      ? trimAlternatives(snapshot, trim, supplierName)
      : null;
  if (!base) return null;

  return { reference: base.reference, alternatives: [...base.alternatives].sort(byRiskPriceLeadTime).slice(0, MAX_ALTERNATIVES) };
}

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/**
 * Deterministic sentence built from the same facts the LLM receives. Used when the LLM
 * is not configured, fails, refuses or skips an alternative, so the page never has gaps.
 */
export function templateExplanation(reference: AlternativeReference, option: AlternativeOption): string {
  const compatibility = option.tipo === 'tejido' ? 'Composición y gramaje compatibles' : 'Mismo tipo de avío';

  let price = 'precio sin comparar';
  if (option.priceDeltaPct !== null) {
    if (option.priceDeltaPct === 0) price = 'cuesta lo mismo';
    else price = `cuesta un ${percent.format(Math.abs(option.priceDeltaPct))} % ${option.priceDeltaPct > 0 ? 'más' : 'menos'}`;
  }

  let leadTime = 'plazo sin informar';
  if (option.leadTimeDays !== null) {
    if (option.leadTimeDays === reference.leadTimeDays) leadTime = `mismo plazo (${option.leadTimeDays} días)`;
    else {
      leadTime = `entrega en ${option.leadTimeDays} días`;
      if (reference.leadTimeDays !== null) leadTime += ` (frente a ${reference.leadTimeDays})`;
    }
  }

  const watch = option.risk === 'Ámbar' && option.riskReason
    ? ` A vigilar: ${option.riskReason.charAt(0).toLocaleLowerCase('es')}${option.riskReason.slice(1)}.`
    : '';
  return `${compatibility}; ${price} y ${leadTime}.${watch}`;
}
