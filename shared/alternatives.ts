import { findCompatibleFabrics, findCompatibleTrims } from './compatibility.js';
import { fabricLabel, trimLabel } from './labels.js';
import type { AlternativeOption, AlternativesBase, Fabric, Snapshot, Trim } from './types.js';

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
