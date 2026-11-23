import {
  BOM_UNITS,
  CLIENT_SECTORS,
  COMPUTED_FIELDS,
  FIELDS,
  GARMENT_PHASES,
  MATERIAL_STATUSES,
  RISK_LEVELS,
  SUPPLIER_STATUSES,
  TABLES,
  TRIM_TYPES,
} from '../../shared/schema.js';
import type { Snapshot } from '../../shared/types.js';
import { AirtableReader, type RawFields, type RawRecord } from './airtable.js';
import { createCache, READ_CACHE_TTL_MS } from './cache.js';

// Loads the whole base (a few hundred records) and maps it to the read model.
// Joins happen in memory; computed values are read from Airtable, never recalculated.

type SnapshotTable = keyof Snapshot;
export type RawTables = Record<SnapshotTable, RawRecord[]>;

const F = FIELDS;
const C = COMPUTED_FIELDS;

/** Fields requested per table. A missing field makes Airtable answer 422 with its name. */
export const READ_FIELDS: Record<SnapshotTable, readonly string[]> = {
  suppliers: [F.suppliers.name, F.suppliers.country, F.suppliers.leadTimeDays, F.suppliers.status],
  fabrics: [
    F.fabrics.code,
    F.fabrics.name,
    F.fabrics.composition,
    F.fabrics.weightGsm,
    F.fabrics.color,
    F.fabrics.pricePerMeter,
    F.fabrics.status,
    F.fabrics.supplier,
    F.fabrics.priceUpdatedOn,
    C.fabrics.supplierLeadTimeDays,
  ],
  trims: [
    F.trims.reference,
    F.trims.type,
    F.trims.pricePerUnit,
    F.trims.status,
    F.trims.supplier,
    F.trims.priceUpdatedOn,
    C.trims.supplierLeadTimeDays,
  ],
  garments: [F.garments.name, F.garments.code, F.garments.category, F.garments.phase, C.garments.materialsCost, C.garments.criticalLeadTimeDays, C.garments.risk],
  bom: [F.bom.garment, F.bom.fabric, F.bom.trim, F.bom.quantity, F.bom.unit, C.bom.lineCost],
  clients: [F.clients.name, F.clients.sector, F.clients.employees],
  catalog: [F.catalog.client, F.catalog.garment, F.catalog.annualUnits, C.catalog.annualCost],
};

function text(fields: RawFields, name: string): string {
  const value = fields[name];
  return typeof value === 'string' ? value : '';
}

/** Numbers, rollups and formulas come as numbers; lookups as arrays. Errors come as objects. */
function number(fields: RawFields, name: string): number | null {
  const value = fields[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'number' && Number.isFinite(first) ? first : null;
}

/** Date fields come as "2026-03-03"; anything else is treated as unknown. */
function date(fields: RawFields, name: string): string | null {
  const value = fields[name];
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function linkId(fields: RawFields, name: string): string | null {
  const value = fields[name];
  const first = Array.isArray(value) ? value[0] : undefined;
  return typeof first === 'string' ? first : null;
}

function option<T extends string>(fields: RawFields, name: string, options: readonly T[]): T | null {
  const value = fields[name];
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : null;
}

export function mapSnapshot(raw: RawTables): Snapshot {
  return {
    suppliers: raw.suppliers.map(({ id, fields }) => ({
      id,
      name: text(fields, F.suppliers.name),
      country: text(fields, F.suppliers.country),
      leadTimeDays: number(fields, F.suppliers.leadTimeDays),
      status: option(fields, F.suppliers.status, SUPPLIER_STATUSES),
    })),
    fabrics: raw.fabrics.map(({ id, fields }) => ({
      id,
      code: text(fields, F.fabrics.code),
      name: text(fields, F.fabrics.name),
      composition: text(fields, F.fabrics.composition),
      weightGsm: number(fields, F.fabrics.weightGsm),
      color: text(fields, F.fabrics.color),
      pricePerMeter: number(fields, F.fabrics.pricePerMeter),
      status: option(fields, F.fabrics.status, MATERIAL_STATUSES),
      supplierId: linkId(fields, F.fabrics.supplier),
      supplierLeadTimeDays: number(fields, C.fabrics.supplierLeadTimeDays),
      priceUpdatedOn: date(fields, F.fabrics.priceUpdatedOn),
    })),
    trims: raw.trims.map(({ id, fields }) => ({
      id,
      reference: text(fields, F.trims.reference),
      type: option(fields, F.trims.type, TRIM_TYPES),
      pricePerUnit: number(fields, F.trims.pricePerUnit),
      status: option(fields, F.trims.status, MATERIAL_STATUSES),
      supplierId: linkId(fields, F.trims.supplier),
      supplierLeadTimeDays: number(fields, C.trims.supplierLeadTimeDays),
      priceUpdatedOn: date(fields, F.trims.priceUpdatedOn),
    })),
    garments: raw.garments.map(({ id, fields }) => ({
      id,
      code: text(fields, F.garments.code),
      name: text(fields, F.garments.name),
      category: text(fields, F.garments.category),
      phase: option(fields, F.garments.phase, GARMENT_PHASES),
      materialsCost: number(fields, C.garments.materialsCost),
      criticalLeadTimeDays: number(fields, C.garments.criticalLeadTimeDays),
      risk: option(fields, C.garments.risk, RISK_LEVELS),
    })),
    bom: raw.bom.map(({ id, fields }) => ({
      id,
      garmentId: linkId(fields, F.bom.garment),
      fabricId: linkId(fields, F.bom.fabric),
      trimId: linkId(fields, F.bom.trim),
      quantity: number(fields, F.bom.quantity),
      unit: option(fields, F.bom.unit, BOM_UNITS),
      lineCost: number(fields, C.bom.lineCost),
    })),
    clients: raw.clients.map(({ id, fields }) => ({
      id,
      name: text(fields, F.clients.name),
      sector: option(fields, F.clients.sector, CLIENT_SECTORS),
      employees: number(fields, F.clients.employees),
    })),
    catalog: raw.catalog.map(({ id, fields }) => ({
      id,
      clientId: linkId(fields, F.catalog.client),
      garmentId: linkId(fields, F.catalog.garment),
      annualUnits: number(fields, F.catalog.annualUnits),
      annualCost: number(fields, C.catalog.annualCost),
    })),
  };
}

export class ConfigError extends Error {
  constructor(missing: string[]) {
    super(`Faltan variables de entorno en el servidor: ${missing.join(', ')}`);
    this.name = 'ConfigError';
  }
}

export async function loadSnapshot(reader: AirtableReader): Promise<Snapshot> {
  const keys = Object.keys(READ_FIELDS) as SnapshotTable[];
  // Started together; the reader spaces them 250 ms apart.
  const tables = await Promise.all(keys.map((key) => reader.listRecords(TABLES[key], READ_FIELDS[key])));
  const raw = Object.fromEntries(keys.map((key, index) => [key, tables[index] ?? []])) as RawTables;
  return mapSnapshot(raw);
}

const cache = createCache(READ_CACHE_TTL_MS);
const REQUIRED_VARIABLES = ['AIRTABLE_BASE_ID', 'AIRTABLE_TOKEN_READ'] as const;

/** The cached snapshot for this function instance (reloaded at most every 60 s). */
export function getSnapshot(): Promise<Snapshot> {
  return cache.get('snapshot', () => {
    const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
    if (missing.length > 0) return Promise.reject(new ConfigError(missing));
    const reader = new AirtableReader(process.env.AIRTABLE_BASE_ID ?? '', process.env.AIRTABLE_TOKEN_READ ?? '');
    return loadSnapshot(reader);
  });
}
