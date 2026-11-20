import {
  BOM_UNITS,
  CLIENT_SECTORS,
  COLORS,
  COUNTRIES,
  FIELDS,
  GARMENT_CATEGORIES,
  GARMENT_PHASES,
  MATERIAL_STATUSES,
  SAMPLE_RESULTS,
  SUPPLIER_STATUSES,
  TABLES,
  TRIM_TYPES,
} from '../../shared/schema';

// Table definitions for the Airtable Metadata API, in creation order: a table is
// created only after every table it links to. Creating a link also creates the
// inverse link field in the linked table. The first field is the primary field.

export type TableKey = keyof typeof TABLES;

export interface FieldSpec {
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

export interface TableSpec {
  key: TableKey;
  name: string;
  /** Tables this one links to; they must be created first. */
  linksTo: TableKey[];
  fields: (tableId: (key: TableKey) => string) => FieldSpec[];
}

const text = (name: string): FieldSpec => ({ name, type: 'singleLineText' });
const longText = (name: string): FieldSpec => ({ name, type: 'multilineText' });
const number = (name: string, precision: number): FieldSpec => ({ name, type: 'number', options: { precision } });
const euros = (name: string): FieldSpec => ({ name, type: 'currency', options: { precision: 2, symbol: '€' } });
const rating = (name: string): FieldSpec => ({ name, type: 'rating', options: { max: 5, icon: 'star', color: 'yellowBright' } });
const date = (name: string): FieldSpec => ({ name, type: 'date', options: { dateFormat: { name: 'european' } } });
const select = (name: string, choices: readonly string[]): FieldSpec => ({
  name,
  type: 'singleSelect',
  options: { choices: choices.map((choice) => ({ name: choice })) },
});
const link = (name: string, linkedTableId: string): FieldSpec => ({ name, type: 'multipleRecordLinks', options: { linkedTableId } });

export const TABLE_SPECS: TableSpec[] = [
  {
    key: 'suppliers',
    name: TABLES.suppliers,
    linksTo: [],
    fields: () => {
      const f = FIELDS.suppliers;
      return [text(f.name), select(f.country, COUNTRIES), number(f.leadTimeDays, 0), rating(f.rating), select(f.status, SUPPLIER_STATUSES)];
    },
  },
  {
    key: 'clients',
    name: TABLES.clients,
    linksTo: [],
    fields: () => {
      const f = FIELDS.clients;
      return [text(f.name), select(f.sector, CLIENT_SECTORS), number(f.employees, 0)];
    },
  },
  {
    key: 'fabrics',
    name: TABLES.fabrics,
    linksTo: ['suppliers'],
    fields: (tableId) => {
      const f = FIELDS.fabrics;
      return [
        text(f.code),
        text(f.name),
        text(f.composition),
        number(f.weightGsm, 0),
        select(f.color, COLORS),
        euros(f.pricePerMeter),
        select(f.status, MATERIAL_STATUSES),
        link(f.supplier, tableId('suppliers')),
        date(f.priceUpdatedOn),
      ];
    },
  },
  {
    key: 'trims',
    name: TABLES.trims,
    linksTo: ['suppliers'],
    fields: (tableId) => {
      const f = FIELDS.trims;
      return [
        text(f.reference),
        select(f.type, TRIM_TYPES),
        euros(f.pricePerUnit),
        select(f.status, MATERIAL_STATUSES),
        link(f.supplier, tableId('suppliers')),
        date(f.priceUpdatedOn),
      ];
    },
  },
  {
    key: 'garments',
    name: TABLES.garments,
    linksTo: [],
    fields: () => {
      const f = FIELDS.garments;
      return [text(f.name), text(f.code), select(f.category, GARMENT_CATEGORIES), select(f.phase, GARMENT_PHASES)];
    },
  },
  {
    key: 'bom',
    name: TABLES.bom,
    linksTo: ['garments', 'fabrics', 'trims'],
    fields: (tableId) => {
      const f = FIELDS.bom;
      return [
        text(f.line),
        link(f.garment, tableId('garments')),
        link(f.fabric, tableId('fabrics')),
        link(f.trim, tableId('trims')),
        number(f.quantity, 2),
        select(f.unit, BOM_UNITS),
      ];
    },
  },
  {
    key: 'samples',
    name: TABLES.samples,
    linksTo: ['garments'],
    fields: (tableId) => {
      const f = FIELDS.samples;
      return [
        text(f.sample),
        link(f.garment, tableId('garments')),
        number(f.version, 0),
        date(f.date),
        select(f.result, SAMPLE_RESULTS),
        longText(f.comments),
      ];
    },
  },
  {
    key: 'catalog',
    name: TABLES.catalog,
    linksTo: ['clients', 'garments'],
    fields: (tableId) => {
      const f = FIELDS.catalog;
      return [text(f.line), link(f.client, tableId('clients')), link(f.garment, tableId('garments')), number(f.annualUnits, 0)];
    },
  },
];
