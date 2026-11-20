import { FIELDS } from '../../shared/schema';
import type { ExistingTable, FieldValues, SeedClient } from './airtable-client';
import type { Fixtures } from './fixtures';
import { TABLE_SPECS, type TableKey } from './tables';
import { validateFixtures } from './validate';

export class SeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedError';
  }
}

export interface SeedOptions {
  /** Delete existing records (never tables) before inserting the demo data. */
  reset: boolean;
  log: (message: string) => void;
}

export type SeedSummary = Record<TableKey, number>;

type TableIds = Record<TableKey, string>;

/** Creates the missing tables, then inserts the demo records with their links resolved. */
export async function runSeed(client: SeedClient, fixtures: Fixtures, options: SeedOptions): Promise<SeedSummary> {
  const errors = validateFixtures(fixtures);
  if (errors.length > 0) {
    throw new SeedError(`Los datos de demo no son válidos:\n- ${errors.join('\n- ')}`);
  }

  const tableIds = await ensureTables(client, options.log);
  await ensureEmptyOrReset(client, tableIds, options);
  return insertRecords(client, tableIds, fixtures, options.log);
}

async function ensureTables(client: SeedClient, log: (message: string) => void): Promise<TableIds> {
  const existing = new Map((await client.listTables()).map((table) => [table.name, table]));
  const managedNames = new Set(TABLE_SPECS.map((spec) => spec.name));
  const unmanaged = [...existing.keys()].filter((name) => !managedNames.has(name));
  if (unmanaged.length > 0) {
    log(`Aviso: la base tiene tablas que el seed no gestiona (${unmanaged.join(', ')}). Bórralas a mano si no las usas.`);
  }

  const tableIds: Partial<TableIds> = {};
  const tableId = (key: TableKey): string => {
    const id = tableIds[key];
    if (!id) throw new SeedError(`La tabla ${key} debe crearse antes que las tablas que la enlazan`);
    return id;
  };
  const missingFields: string[] = [];

  for (const spec of TABLE_SPECS) {
    const fields = spec.fields(tableId);
    let table: ExistingTable | undefined = existing.get(spec.name);
    if (table) {
      const present = new Set(table.fields.map((field) => field.name));
      const missing = fields.filter((field) => !present.has(field.name)).map((field) => field.name);
      if (missing.length > 0) missingFields.push(`${spec.name}: ${missing.join(', ')}`);
      log(`Tabla ${spec.name}: ya existe, no se modifica.`);
    } else {
      table = await client.createTable(spec.name, fields);
      log(`Tabla ${spec.name}: creada.`);
    }
    tableIds[spec.key] = table.id;
  }

  if (missingFields.length > 0) {
    throw new SeedError(
      `Hay tablas existentes a las que les faltan campos. Créalos a mano o borra esas tablas y vuelve a ejecutar el seed:\n- ${missingFields.join('\n- ')}`,
    );
  }
  return tableIds as TableIds;
}

async function ensureEmptyOrReset(client: SeedClient, tableIds: TableIds, options: SeedOptions): Promise<void> {
  const withData: TableKey[] = [];
  for (const spec of TABLE_SPECS) {
    if (await client.hasRecords(tableIds[spec.key])) withData.push(spec.key);
  }
  if (withData.length === 0) return;

  const names = TABLE_SPECS.filter((spec) => withData.includes(spec.key)).map((spec) => spec.name);
  if (!options.reset) {
    throw new SeedError(
      `La base ya tiene datos en: ${names.join(', ')}. Para borrarlos y volver a crearlos ejecuta: npm run seed -- --reset`,
    );
  }

  // Children first, so no step leaves a record pointing to a deleted one.
  for (const spec of [...TABLE_SPECS].reverse()) {
    if (!withData.includes(spec.key)) continue;
    const ids = await client.listRecordIds(tableIds[spec.key]);
    await client.deleteRecords(tableIds[spec.key], ids);
    options.log(`Tabla ${spec.name}: ${ids.length} registros borrados.`);
  }
}

function idMap(keys: string[], ids: string[]): Map<string, string> {
  return new Map(keys.map((key, index) => [key, ids[index] ?? '']));
}

function linkTo(ids: Map<string, string>, key: string): string[] {
  const id = ids.get(key);
  if (!id) throw new SeedError(`No se encontró el registro creado para ${key}`);
  return [id];
}

async function insertRecords(
  client: SeedClient,
  tableIds: TableIds,
  fixtures: Fixtures,
  log: (message: string) => void,
): Promise<SeedSummary> {
  const insert = async (key: TableKey, records: FieldValues[]): Promise<string[]> => {
    const ids = await client.createRecords(tableIds[key], records);
    log(`Tabla ${TABLE_SPECS.find((spec) => spec.key === key)?.name}: ${ids.length} registros creados.`);
    return ids;
  };

  const s = FIELDS.suppliers;
  const supplierIds = idMap(
    fixtures.suppliers.map((supplier) => supplier.key),
    await insert(
      'suppliers',
      fixtures.suppliers.map((supplier) => ({
        [s.name]: supplier.name,
        [s.country]: supplier.country,
        [s.leadTimeDays]: supplier.leadTimeDays,
        [s.rating]: supplier.rating,
        [s.status]: supplier.status,
      })),
    ),
  );

  const c = FIELDS.clients;
  const clientIds = idMap(
    fixtures.clients.map((client) => client.key),
    await insert(
      'clients',
      fixtures.clients.map((client) => ({ [c.name]: client.name, [c.sector]: client.sector, [c.employees]: client.employees })),
    ),
  );

  const f = FIELDS.fabrics;
  const fabricIds = idMap(
    fixtures.fabrics.map((fabric) => fabric.code),
    await insert(
      'fabrics',
      fixtures.fabrics.map((fabric) => ({
        [f.code]: fabric.code,
        [f.name]: fabric.name,
        [f.composition]: fabric.composition,
        [f.weightGsm]: fabric.weightGsm,
        [f.color]: fabric.color,
        [f.pricePerMeter]: fabric.pricePerMeter,
        [f.status]: fabric.status,
        [f.supplier]: linkTo(supplierIds, fabric.supplier),
        [f.priceUpdatedOn]: fabric.priceUpdatedOn,
      })),
    ),
  );

  const t = FIELDS.trims;
  const trimIds = idMap(
    fixtures.trims.map((trim) => trim.reference),
    await insert(
      'trims',
      fixtures.trims.map((trim) => ({
        [t.reference]: trim.reference,
        [t.type]: trim.type,
        [t.pricePerUnit]: trim.pricePerUnit,
        [t.status]: trim.status,
        [t.supplier]: linkTo(supplierIds, trim.supplier),
        [t.priceUpdatedOn]: trim.priceUpdatedOn,
      })),
    ),
  );

  const g = FIELDS.garments;
  const garmentIds = idMap(
    fixtures.garments.map((garment) => garment.code),
    await insert(
      'garments',
      fixtures.garments.map((garment) => ({
        [g.name]: garment.name,
        [g.code]: garment.code,
        [g.category]: garment.category,
        [g.phase]: garment.phase,
      })),
    ),
  );

  // Each BOM line links exactly one fabric or one trim (checked by validateFixtures).
  const b = FIELDS.bom;
  const bomRecords = fixtures.garments.flatMap((garment) =>
    garment.bom.map((line) => {
      const isFabric = fabricIds.has(line.material);
      return {
        [b.line]: `${garment.code} · ${line.material}`,
        [b.garment]: linkTo(garmentIds, garment.code),
        ...(isFabric ? { [b.fabric]: linkTo(fabricIds, line.material) } : { [b.trim]: linkTo(trimIds, line.material) }),
        [b.quantity]: line.quantity,
        [b.unit]: isFabric ? 'm' : 'ud',
      };
    }),
  );
  const bomIds = await insert('bom', bomRecords);

  const m = FIELDS.samples;
  const sampleIds = await insert(
    'samples',
    fixtures.samples.map((sample) => ({
      [m.sample]: `${sample.garment} · v${sample.version}`,
      [m.garment]: linkTo(garmentIds, sample.garment),
      [m.version]: sample.version,
      [m.date]: sample.date,
      [m.result]: sample.result,
      [m.comments]: sample.comments,
    })),
  );

  const k = FIELDS.catalog;
  const clientNames = new Map(fixtures.clients.map((client) => [client.key, client.name]));
  const catalogIds = await insert(
    'catalog',
    fixtures.catalog.map((line) => ({
      [k.line]: `${clientNames.get(line.client)} · ${line.garment}`,
      [k.client]: linkTo(clientIds, line.client),
      [k.garment]: linkTo(garmentIds, line.garment),
      [k.annualUnits]: line.annualUnits,
    })),
  );

  return {
    suppliers: supplierIds.size,
    clients: clientIds.size,
    fabrics: fabricIds.size,
    trims: trimIds.size,
    garments: garmentIds.size,
    bom: bomIds.length,
    samples: sampleIds.length,
    catalog: catalogIds.length,
  };
}
