import { describe, expect, it } from 'vitest';
import type { ExistingTable, FieldValues, SeedClient } from '../scripts/seed/airtable-client';
import { fixtures, type Fixtures } from '../scripts/seed/fixtures';
import { runSeed, SeedError } from '../scripts/seed/run';
import type { FieldSpec } from '../scripts/seed/tables';

interface FakeTable {
  id: string;
  name: string;
  fields: FieldSpec[];
  records: Map<string, FieldValues>;
}

/** In-memory Airtable base that records the order of table creations. */
class FakeBase implements SeedClient {
  readonly tables: FakeTable[] = [];
  readonly createdTables: string[] = [];
  private nextId = 1;

  addTable(name: string, fieldNames: string[], records: FieldValues[] = []): FakeTable {
    const table: FakeTable = {
      id: `tbl${this.nextId++}`,
      name,
      fields: fieldNames.map((fieldName) => ({ name: fieldName, type: 'singleLineText' })),
      records: new Map(records.map((record) => [`rec${this.nextId++}`, record])),
    };
    this.tables.push(table);
    return table;
  }

  table(name: string): FakeTable {
    const table = this.tables.find((candidate) => candidate.name === name);
    if (!table) throw new Error(`No table ${name}`);
    return table;
  }

  private byId(id: string): FakeTable {
    const table = this.tables.find((candidate) => candidate.id === id);
    if (!table) throw new Error(`No table ${id}`);
    return table;
  }

  async listTables(): Promise<ExistingTable[]> {
    return this.tables.map(({ id, name, fields }) => ({ id, name, fields }));
  }

  async createTable(name: string, fields: FieldSpec[]): Promise<ExistingTable> {
    for (const field of fields) {
      const linked = field.options?.linkedTableId;
      if (linked !== undefined && !this.tables.some((table) => table.id === linked)) {
        throw new Error(`${name}.${field.name} links to a table that does not exist`);
      }
    }
    this.createdTables.push(name);
    const table = this.addTable(name, []);
    table.fields = fields;
    return { id: table.id, name, fields };
  }

  async hasRecords(tableId: string): Promise<boolean> {
    return this.byId(tableId).records.size > 0;
  }

  async listRecordIds(tableId: string): Promise<string[]> {
    return [...this.byId(tableId).records.keys()];
  }

  async deleteRecords(tableId: string, recordIds: string[]): Promise<void> {
    for (const id of recordIds) this.byId(tableId).records.delete(id);
  }

  async createRecords(tableId: string, records: FieldValues[]): Promise<string[]> {
    const table = this.byId(tableId);
    return records.map((record) => {
      const id = `rec${this.nextId++}`;
      table.records.set(id, record);
      return id;
    });
  }

  findRecord(tableName: string, field: string, value: unknown): [string, FieldValues] {
    const entry = [...this.table(tableName).records.entries()].find(([, record]) => record[field] === value);
    if (!entry) throw new Error(`No record in ${tableName} with ${field}=${String(value)}`);
    return entry;
  }
}

const options = (overrides: Partial<{ reset: boolean }> = {}) => {
  const messages: string[] = [];
  return { messages, options: { reset: false, log: (message: string) => messages.push(message), ...overrides } };
};

describe('runSeed', () => {
  it('creates the 8 tables in dependency order and inserts every record', async () => {
    const base = new FakeBase();
    const { options: seedOptions } = options();

    const summary = await runSeed(base, fixtures, seedOptions);

    expect(base.createdTables).toEqual(['Proveedores', 'Clientes', 'Tejidos', 'Avíos', 'Prendas', 'BOM', 'Muestras', 'Catálogo']);
    expect(summary).toEqual({ suppliers: 15, clients: 8, fabrics: 30, trims: 20, garments: 25, bom: 62, samples: 30, catalog: 40 });
    expect(base.table('BOM').records.size).toBe(62);
  });

  it('creates the primary field first in each table', async () => {
    const base = new FakeBase();
    await runSeed(base, fixtures, options().options);
    expect(base.tables.map((table) => [table.name, table.fields[0]?.name])).toEqual([
      ['Proveedores', 'Nombre'],
      ['Clientes', 'Nombre'],
      ['Tejidos', 'Código'],
      ['Avíos', 'Referencia'],
      ['Prendas', 'Nombre'],
      ['BOM', 'Línea'],
      ['Muestras', 'Muestra'],
      ['Catálogo', 'Línea'],
    ]);
  });

  it('resolves links to the ids of the created records', async () => {
    const base = new FakeBase();
    await runSeed(base, fixtures, options().options);

    const [supplierId] = base.findRecord('Proveedores', 'Nombre', 'Anatolia Dokuma');
    const [fabricId, fabric] = base.findRecord('Tejidos', 'Código', 'TJ-007');
    const [garmentId] = base.findRecord('Prendas', 'Código', 'PR-001');
    const [, bomLine] = base.findRecord('BOM', 'Línea', 'PR-001 · TJ-007');

    expect(fabric['Proveedor']).toEqual([supplierId]);
    expect(bomLine).toEqual({ Línea: 'PR-001 · TJ-007', Prenda: [garmentId], Tejido: [fabricId], Cantidad: 1.4, Unidad: 'm' });
  });

  it('links each BOM line to exactly one fabric or one trim, with the matching unit', async () => {
    const base = new FakeBase();
    await runSeed(base, fixtures, options().options);
    for (const line of base.table('BOM').records.values()) {
      const hasFabric = 'Tejido' in line;
      expect(hasFabric !== 'Avío' in line).toBe(true);
      expect(line['Unidad']).toBe(hasFabric ? 'm' : 'ud');
    }
  });

  it('keeps existing tables and only creates the missing ones', async () => {
    const base = new FakeBase();
    base.addTable('Proveedores', ['Nombre', 'País', 'Plazo entrega días', 'Valoración', 'Estado', 'Tejidos', 'Avíos']);
    base.addTable('Table 1', ['Name']);
    const { messages, options: seedOptions } = options();

    await runSeed(base, fixtures, seedOptions);

    expect(base.createdTables).not.toContain('Proveedores');
    expect(base.createdTables).toHaveLength(7);
    expect(base.table('Proveedores').records.size).toBe(15);
    expect(messages).toContain('Aviso: la base tiene tablas que el seed no gestiona (Table 1). Bórralas a mano si no las usas.');
  });

  it('stops when an existing table lacks a field the seed writes', async () => {
    const base = new FakeBase();
    base.addTable('Proveedores', ['Nombre', 'País']);
    await expect(runSeed(base, fixtures, options().options)).rejects.toThrow(
      'Proveedores: Plazo entrega días, Valoración, Estado',
    );
    expect(base.table('Proveedores').records.size).toBe(0);
  });

  it('refuses to insert into a base that already has data, without --reset', async () => {
    const base = new FakeBase();
    base.addTable('Clientes', ['Nombre', 'Sector', 'Empleados'], [{ Nombre: 'Cliente previo' }]);

    const error = await runSeed(base, fixtures, options().options).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SeedError);
    expect((error as Error).message).toBe(
      'La base ya tiene datos en: Clientes. Para borrarlos y volver a crearlos ejecuta: npm run seed -- --reset',
    );
    expect(base.table('Clientes').records.size).toBe(1);
    expect(base.table('Proveedores').records.size).toBe(0);
  });

  it('with --reset, replaces the records and keeps the tables', async () => {
    const base = new FakeBase();
    await runSeed(base, fixtures, options().options);
    const tableIds = base.tables.map((table) => table.id);

    await runSeed(base, fixtures, options({ reset: true }).options);

    expect(base.tables.map((table) => table.id)).toEqual(tableIds);
    expect(base.table('Clientes').records.size).toBe(8);
    expect(base.table('Catálogo').records.size).toBe(40);
  });

  it('does not touch Airtable when the fixtures are invalid', async () => {
    const base = new FakeBase();
    const broken: Fixtures = structuredClone(fixtures);
    broken.catalog[0]!.garment = 'PR-999';

    await expect(runSeed(base, broken, options().options)).rejects.toThrow('Catálogo: prenda inexistente PR-999');
    expect(base.tables).toHaveLength(0);
  });
});
