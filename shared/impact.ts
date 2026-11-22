import { fabricLabel, trimLabel } from './labels.js';
import type { RiskLevel } from './schema.js';
import type { AffectedClient, AffectedGarment, ImpactResult, Snapshot, SubjectKind } from './types.js';

// "Where is it used?": walks material → BOM → garments → catalog → clients.
// Costs, lead times and risk come from Airtable's computed fields; this module only
// joins and adds them up. It also returns the base a price simulation multiplies
// (affected material cost), so the simulation can run in memory without Airtable.

const RISK_ORDER: Record<RiskLevel, number> = { Rojo: 0, Ámbar: 1, Verde: 2 };
const UNKNOWN_RISK_ORDER = 3;

const toCents = (value: number): number => Math.round(value * 100) / 100;

interface Subject {
  label: string;
  status: string | null;
  materialIds: Set<string>;
}

function findSubject(snapshot: Snapshot, tipo: SubjectKind, id: string): Subject | null {
  if (tipo === 'tejido') {
    const fabric = snapshot.fabrics.find((candidate) => candidate.id === id);
    return fabric ? { label: fabricLabel(fabric), status: fabric.status, materialIds: new Set([fabric.id]) } : null;
  }
  if (tipo === 'avio') {
    const trim = snapshot.trims.find((candidate) => candidate.id === id);
    return trim ? { label: trimLabel(trim), status: trim.status, materialIds: new Set([trim.id]) } : null;
  }
  const supplier = snapshot.suppliers.find((candidate) => candidate.id === id);
  if (!supplier) return null;
  const materialIds = new Set(
    [...snapshot.fabrics, ...snapshot.trims].filter((material) => material.supplierId === id).map((material) => material.id),
  );
  return { label: supplier.name, status: supplier.status, materialIds };
}

/** The impact of a fabric, trim or supplier, or null when it does not exist. */
export function computeImpact(snapshot: Snapshot, tipo: SubjectKind, id: string): ImpactResult | null {
  const subject = findSubject(snapshot, tipo, id);
  if (!subject) return null;

  // Affected material cost per garment, from the BOM lines that use an affected material.
  const affectedCostByGarment = new Map<string, number>();
  for (const line of snapshot.bom) {
    const usesMaterial =
      (line.fabricId !== null && subject.materialIds.has(line.fabricId)) || (line.trimId !== null && subject.materialIds.has(line.trimId));
    if (!usesMaterial || line.garmentId === null) continue;
    affectedCostByGarment.set(line.garmentId, (affectedCostByGarment.get(line.garmentId) ?? 0) + (line.lineCost ?? 0));
  }

  const garments: AffectedGarment[] = snapshot.garments
    .filter((garment) => affectedCostByGarment.has(garment.id))
    .map((garment) => ({
      id: garment.id,
      code: garment.code,
      name: garment.name,
      phase: garment.phase,
      risk: garment.risk,
      materialsCost: garment.materialsCost,
      criticalLeadTimeDays: garment.criticalLeadTimeDays,
      affectedMaterialCost: toCents(affectedCostByGarment.get(garment.id) ?? 0),
    }))
    .sort(
      (a, b) =>
        (a.risk ? RISK_ORDER[a.risk] : UNKNOWN_RISK_ORDER) - (b.risk ? RISK_ORDER[b.risk] : UNKNOWN_RISK_ORDER) ||
        a.code.localeCompare(b.code, 'es'),
    );

  const affectedGarmentIds = new Set(garments.map((garment) => garment.id));
  const byClient = new Map<string, { garments: Set<string>; annualUnits: number; annualCost: number; affectedAnnualMaterialCost: number }>();
  for (const line of snapshot.catalog) {
    if (line.clientId === null || line.garmentId === null || !affectedGarmentIds.has(line.garmentId)) continue;
    const totals = byClient.get(line.clientId) ?? { garments: new Set(), annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 };
    const units = line.annualUnits ?? 0;
    totals.garments.add(line.garmentId);
    totals.annualUnits += units;
    totals.annualCost += line.annualCost ?? 0;
    totals.affectedAnnualMaterialCost += units * (affectedCostByGarment.get(line.garmentId) ?? 0);
    byClient.set(line.clientId, totals);
  }

  const clients: AffectedClient[] = snapshot.clients
    .flatMap((client) => {
      const totals = byClient.get(client.id);
      if (!totals) return [];
      return [
        {
          id: client.id,
          name: client.name,
          sector: client.sector,
          garmentCount: totals.garments.size,
          annualUnits: totals.annualUnits,
          annualCost: toCents(totals.annualCost),
          affectedAnnualMaterialCost: toCents(totals.affectedAnnualMaterialCost),
        },
      ];
    })
    .sort((a, b) => b.annualCost - a.annualCost || a.name.localeCompare(b.name, 'es'));

  const sum = (pick: (client: AffectedClient) => number) => toCents(clients.reduce((total, client) => total + pick(client), 0));

  return {
    subject: { tipo, id, label: subject.label, status: subject.status, materialCount: subject.materialIds.size },
    garments,
    clients,
    totals: {
      garmentCount: garments.length,
      clientCount: clients.length,
      annualUnits: clients.reduce((total, client) => total + client.annualUnits, 0),
      annualCost: sum((client) => client.annualCost),
      affectedAnnualMaterialCost: sum((client) => client.affectedAnnualMaterialCost),
    },
  };
}
