import type {
  BomUnit,
  ClientSector,
  GarmentPhase,
  MaterialStatus,
  RiskLevel,
  SupplierStatus,
  TrimType,
} from './schema.js';

// Read model of the Airtable base, already mapped from raw records.
// Computed values come from Airtable as-is; null means Airtable returned no value.

export interface Supplier {
  id: string;
  name: string;
  country: string;
  leadTimeDays: number | null;
  status: SupplierStatus | null;
}

export interface Fabric {
  id: string;
  code: string;
  name: string;
  composition: string;
  weightGsm: number | null;
  color: string;
  pricePerMeter: number | null;
  status: MaterialStatus | null;
  supplierId: string | null;
  supplierLeadTimeDays: number | null;
  /** Day the price was last updated in Airtable ("2026-03-03"); null when unknown. */
  priceUpdatedOn: string | null;
}

export interface Trim {
  id: string;
  reference: string;
  type: TrimType | null;
  pricePerUnit: number | null;
  status: MaterialStatus | null;
  supplierId: string | null;
  supplierLeadTimeDays: number | null;
  /** Day the price was last updated in Airtable ("2026-03-03"); null when unknown. */
  priceUpdatedOn: string | null;
}

export interface Garment {
  id: string;
  code: string;
  name: string;
  category: string;
  phase: GarmentPhase | null;
  materialsCost: number | null;
  criticalLeadTimeDays: number | null;
  risk: RiskLevel | null;
}

export interface BomLine {
  id: string;
  garmentId: string | null;
  fabricId: string | null;
  trimId: string | null;
  quantity: number | null;
  unit: BomUnit | null;
  lineCost: number | null;
}

export interface Client {
  id: string;
  name: string;
  sector: ClientSector | null;
  employees: number | null;
}

export interface CatalogLine {
  id: string;
  clientId: string | null;
  garmentId: string | null;
  annualUnits: number | null;
  annualCost: number | null;
}

export interface Snapshot {
  suppliers: Supplier[];
  fabrics: Fabric[];
  trims: Trim[];
  garments: Garment[];
  bom: BomLine[];
  clients: Client[];
  catalog: CatalogLine[];
}

/** Subject kinds as they appear in the public API (?tipo=). */
export const SUBJECT_KINDS = ['tejido', 'avio', 'proveedor'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export function isSubjectKind(value: string | null): value is SubjectKind {
  return value !== null && (SUBJECT_KINDS as readonly string[]).includes(value);
}

export interface SearchResult {
  tipo: SubjectKind;
  id: string;
  /** "TJ-007 · Sarga 65/35 marino", "AV-005 · Cremallera" or the supplier name. */
  label: string;
  /** Composition for fabrics, supplier for trims, country for suppliers. */
  detail: string;
  status: string | null;
}

export interface AffectedGarment {
  id: string;
  code: string;
  name: string;
  phase: GarmentPhase | null;
  risk: RiskLevel | null;
  materialsCost: number | null;
  criticalLeadTimeDays: number | null;
  /** Sum of "Coste línea" of this garment's BOM lines that use an affected material. */
  affectedMaterialCost: number;
}

export interface AffectedClient {
  id: string;
  name: string;
  sector: ClientSector | null;
  garmentCount: number;
  annualUnits: number;
  /** Sum of "Coste anual" of the affected garments in this client's catalog. */
  annualCost: number;
  /** Annual units × affected material cost: the base a price change multiplies. */
  affectedAnnualMaterialCost: number;
}

export interface ImpactResult {
  subject: {
    tipo: SubjectKind;
    id: string;
    label: string;
    status: string | null;
    /** Materials considered: 1 for a fabric or trim, all of a supplier's materials otherwise. */
    materialCount: number;
    /** Price date of the material, or the oldest of a supplier's materials; null when unknown. */
    priceUpdatedOn: string | null;
  };
  garments: AffectedGarment[];
  clients: AffectedClient[];
  totals: {
    garmentCount: number;
    clientCount: number;
    annualUnits: number;
    annualCost: number;
    affectedAnnualMaterialCost: number;
  };
}

export type MaterialKind = Exclude<SubjectKind, 'proveedor'>;

export interface AlternativeReference {
  tipo: MaterialKind;
  id: string;
  label: string;
  /** Composition and weight for fabrics, type for trims. */
  detail: string;
  price: number | null;
  unit: BomUnit;
  leadTimeDays: number | null;
  status: MaterialStatus | null;
  /** Day the price was last updated in Airtable ("2026-03-03"); null when unknown. */
  priceUpdatedOn: string | null;
}

export interface AlternativeOption {
  tipo: MaterialKind;
  id: string;
  label: string;
  detail: string;
  supplierName: string;
  price: number | null;
  unit: BomUnit;
  /** Price minus the reference price, in €; null when either price is unknown. */
  priceDelta: number | null;
  /** Price difference as % of the reference price, one decimal. */
  priceDeltaPct: number | null;
  leadTimeDays: number | null;
  status: MaterialStatus | null;
  risk: Exclude<RiskLevel, 'Rojo'>;
  riskReason: string | null;
  /** Day the price was last updated in Airtable ("2026-03-03"); null when unknown. */
  priceUpdatedOn: string | null;
}

export interface AlternativesBase {
  reference: AlternativeReference;
  alternatives: AlternativeOption[];
}

export interface AlternativesResult {
  reference: AlternativeReference;
  alternatives: (AlternativeOption & {
    explanation: string;
    /** "llm" when Claude wrote it; "plantilla" when the deterministic template filled in. */
    explanationSource: ExplanationSource;
  })[];
}

export type ExplanationSource = 'llm' | 'plantilla';
