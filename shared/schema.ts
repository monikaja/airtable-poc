// Single source of truth for Airtable table names, field names and option values,
// shared by /api, /src and /scripts. Computed fields are created by hand in the
// Airtable UI (see docs/campos-calculados.md) and are not listed here yet.

export const MATERIAL_STATUSES = ['Activo', 'En revisión', 'Descatalogado'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const TRIM_TYPES = ['Botón', 'Cremallera', 'Etiqueta', 'Velcro', 'Cinta reflectante'] as const;
export type TrimType = (typeof TRIM_TYPES)[number];

export const SUPPLIER_STATUSES = ['Activo', 'En revisión', 'Inactivo'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const GARMENT_PHASES = ['Diseño', 'Muestra', 'Aprobada', 'Producción', 'Retirada'] as const;
export type GarmentPhase = (typeof GARMENT_PHASES)[number];

export const SAMPLE_RESULTS = ['Aprobada', 'Rechazada'] as const;
export type SampleResult = (typeof SAMPLE_RESULTS)[number];

export const BOM_UNITS = ['m', 'ud'] as const;
export type BomUnit = (typeof BOM_UNITS)[number];

export const COUNTRIES = [
  'España',
  'Portugal',
  'Italia',
  'Turquía',
  'Marruecos',
  'China',
  'India',
  'Bangladesh',
  'Pakistán',
  'Vietnam',
] as const;
export type Country = (typeof COUNTRIES)[number];

export const COLORS = [
  'Blanco',
  'Negro',
  'Marino',
  'Gris',
  'Celeste',
  'Rojo',
  'Verde',
  'Caqui',
  'Burdeos',
  'Naranja alta visibilidad',
  'Amarillo alta visibilidad',
] as const;
export type Color = (typeof COLORS)[number];

export const GARMENT_CATEGORIES = [
  'Camisa',
  'Pantalón',
  'Chaqueta',
  'Polo',
  'Camiseta',
  'Bata',
  'Sanitario',
  'Chaleco',
  'Parka',
  'Delantal',
] as const;
export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

export const CLIENT_SECTORS = ['Sanidad', 'Logística', 'Hostelería', 'Seguridad', 'Retail', 'Limpieza', 'Industria'] as const;
export type ClientSector = (typeof CLIENT_SECTORS)[number];

export const TABLES = {
  suppliers: 'Proveedores',
  fabrics: 'Tejidos',
  trims: 'Avíos',
  garments: 'Prendas',
  bom: 'BOM',
  samples: 'Muestras',
  clients: 'Clientes',
  catalog: 'Catálogo',
} as const;

export const FIELDS = {
  suppliers: {
    name: 'Nombre',
    country: 'País',
    leadTimeDays: 'Plazo entrega días',
    rating: 'Valoración',
    status: 'Estado',
  },
  fabrics: {
    code: 'Código',
    name: 'Nombre',
    composition: 'Composición',
    weightGsm: 'Gramaje g/m²',
    color: 'Color',
    pricePerMeter: 'Precio €/m',
    status: 'Estado',
    supplier: 'Proveedor',
    priceUpdatedOn: 'Precio actualizado el',
  },
  trims: {
    reference: 'Referencia',
    type: 'Tipo',
    pricePerUnit: 'Precio €/ud',
    status: 'Estado',
    supplier: 'Proveedor',
    priceUpdatedOn: 'Precio actualizado el',
  },
  garments: {
    name: 'Nombre',
    code: 'Código',
    category: 'Categoría',
    phase: 'Fase',
  },
  bom: {
    line: 'Línea',
    garment: 'Prenda',
    fabric: 'Tejido',
    trim: 'Avío',
    quantity: 'Cantidad',
    unit: 'Unidad',
  },
  samples: {
    sample: 'Muestra',
    garment: 'Prenda',
    version: 'Versión',
    date: 'Fecha',
    result: 'Resultado',
    comments: 'Comentarios',
  },
  clients: {
    name: 'Nombre',
    sector: 'Sector',
    employees: 'Empleados',
  },
  catalog: {
    line: 'Línea',
    client: 'Cliente',
    garment: 'Prenda',
    annualUnits: 'Unidades anuales',
  },
} as const;
