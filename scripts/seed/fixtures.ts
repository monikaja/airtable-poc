import type {
  ClientSector,
  Color,
  Country,
  GarmentCategory,
  GarmentPhase,
  MaterialStatus,
  SampleResult,
  SupplierStatus,
  TrimType,
} from '../../shared/schema';

// Fictional demo data. Every value is deterministic so the demo is reproducible.
//
// Demo cases (checked by validateFixtures):
// - TJ-007 is discontinued and used by PR-001, PR-002 and PR-003, all in production,
//   which reach four clients through the catalog.
// - TJ-008, TJ-009 and TJ-010 are compatible alternatives to TJ-007 with different
//   price and lead time. TJ-011 and TJ-012 are near misses (weight, fibers).
// - TJ-015 and AV-005 are under review; supplier P08 has a 75-day lead time.
// - TJ-030 is not used by any garment (empty state).

export interface SupplierFixture {
  key: string;
  name: string;
  country: Country;
  leadTimeDays: number;
  rating: number;
  status: SupplierStatus;
}

export interface FabricFixture {
  code: string;
  name: string;
  composition: string;
  weightGsm: number;
  color: Color;
  pricePerMeter: number;
  status: MaterialStatus;
  supplier: string;
  priceUpdatedOn: string;
}

export interface TrimFixture {
  reference: string;
  type: TrimType;
  pricePerUnit: number;
  status: MaterialStatus;
  supplier: string;
  priceUpdatedOn: string;
}

export interface BomLineFixture {
  /** A fabric code (TJ-…) or a trim reference (AV-…). */
  material: string;
  quantity: number;
}

export interface GarmentFixture {
  code: string;
  name: string;
  category: GarmentCategory;
  phase: GarmentPhase;
  bom: BomLineFixture[];
}

export interface SampleFixture {
  garment: string;
  version: number;
  date: string;
  result: SampleResult;
  comments: string;
}

export interface ClientFixture {
  key: string;
  name: string;
  sector: ClientSector;
  employees: number;
}

export interface CatalogFixture {
  client: string;
  garment: string;
  annualUnits: number;
}

export interface Fixtures {
  suppliers: SupplierFixture[];
  fabrics: FabricFixture[];
  trims: TrimFixture[];
  garments: GarmentFixture[];
  samples: SampleFixture[];
  clients: ClientFixture[];
  catalog: CatalogFixture[];
}

const suppliers: SupplierFixture[] = [
  { key: 'P01', name: 'Textiles Albera', country: 'España', leadTimeDays: 21, rating: 4, status: 'Activo' },
  { key: 'P02', name: 'Tecelagem do Norte', country: 'Portugal', leadTimeDays: 18, rating: 5, status: 'Activo' },
  { key: 'P03', name: 'Lanificio Corvara', country: 'Italia', leadTimeDays: 35, rating: 4, status: 'Activo' },
  { key: 'P04', name: 'Anatolia Dokuma', country: 'Turquía', leadTimeDays: 30, rating: 3, status: 'Activo' },
  { key: 'P05', name: 'Atlas Textile', country: 'Marruecos', leadTimeDays: 25, rating: 4, status: 'Activo' },
  { key: 'P06', name: 'Lianhe Weaving', country: 'China', leadTimeDays: 50, rating: 3, status: 'Activo' },
  { key: 'P07', name: 'Deccan Fabrics', country: 'India', leadTimeDays: 45, rating: 3, status: 'Activo' },
  { key: 'P08', name: 'Meghna Knit Mills', country: 'Bangladesh', leadTimeDays: 75, rating: 2, status: 'En revisión' },
  { key: 'P09', name: 'Indus Cotton', country: 'Pakistán', leadTimeDays: 40, rating: 3, status: 'Activo' },
  { key: 'P10', name: 'Mekong Trims', country: 'Vietnam', leadTimeDays: 38, rating: 4, status: 'Activo' },
  { key: 'P11', name: 'Botonería Levante', country: 'España', leadTimeDays: 14, rating: 5, status: 'Activo' },
  { key: 'P12', name: 'Cremalleras Duero', country: 'España', leadTimeDays: 12, rating: 4, status: 'Activo' },
  { key: 'P13', name: 'Etiquetas Miño', country: 'Portugal', leadTimeDays: 10, rating: 4, status: 'Activo' },
  { key: 'P14', name: 'Riflessi Sicurezza', country: 'Italia', leadTimeDays: 28, rating: 5, status: 'Activo' },
  { key: 'P15', name: 'Cierres Ebro', country: 'España', leadTimeDays: 16, rating: 3, status: 'Activo' },
];

const fabrics: FabricFixture[] = [
  { code: 'TJ-001', name: 'Popelín algodón blanco', composition: '100 % algodón', weightGsm: 120, color: 'Blanco', pricePerMeter: 3.2, status: 'Activo', supplier: 'P07', priceUpdatedOn: '2026-09-14' },
  { code: 'TJ-002', name: 'Popelín 65/35 celeste', composition: '65 % poliéster, 35 % algodón', weightGsm: 115, color: 'Celeste', pricePerMeter: 2.9, status: 'Activo', supplier: 'P06', priceUpdatedOn: '2026-10-02' },
  { code: 'TJ-003', name: 'Oxford algodón celeste', composition: '100 % algodón', weightGsm: 140, color: 'Celeste', pricePerMeter: 3.6, status: 'Activo', supplier: 'P09', priceUpdatedOn: '2026-05-20' },
  { code: 'TJ-004', name: 'Piqué algodón marino', composition: '100 % algodón', weightGsm: 200, color: 'Marino', pricePerMeter: 4.1, status: 'Activo', supplier: 'P07', priceUpdatedOn: '2026-08-30' },
  { code: 'TJ-005', name: 'Piqué 50/50 negro', composition: '50 % poliéster, 50 % algodón', weightGsm: 190, color: 'Negro', pricePerMeter: 3.7, status: 'Activo', supplier: 'P04', priceUpdatedOn: '2026-10-21' },
  { code: 'TJ-006', name: 'Punto jersey blanco', composition: '100 % algodón', weightGsm: 160, color: 'Blanco', pricePerMeter: 2.6, status: 'Activo', supplier: 'P08', priceUpdatedOn: '2026-04-11' },
  // Demo: discontinued fabric used by three garments in production.
  { code: 'TJ-007', name: 'Sarga 65/35 marino', composition: '65 % poliéster, 35 % algodón', weightGsm: 245, color: 'Marino', pricePerMeter: 4.8, status: 'Descatalogado', supplier: 'P04', priceUpdatedOn: '2026-03-03' },
  // Demo: compatible alternatives to TJ-007 (price vs lead time trade-off).
  { code: 'TJ-008', name: 'Sarga 67/33 marino', composition: '67 % poliéster, 33 % algodón', weightGsm: 240, color: 'Marino', pricePerMeter: 5.1, status: 'Activo', supplier: 'P01', priceUpdatedOn: '2026-10-28' },
  { code: 'TJ-009', name: 'Sarga 60/40 marino', composition: '60 % poliéster, 40 % algodón', weightGsm: 255, color: 'Marino', pricePerMeter: 4.6, status: 'Activo', supplier: 'P06', priceUpdatedOn: '2026-09-05' },
  { code: 'TJ-010', name: 'Sarga 70/30 azul noche', composition: '70 % poliéster, 30 % algodón', weightGsm: 260, color: 'Marino', pricePerMeter: 5.4, status: 'Activo', supplier: 'P02', priceUpdatedOn: '2026-11-04' },
  // Demo: near misses that must not appear as alternatives to TJ-007.
  { code: 'TJ-011', name: 'Sarga pesada 65/35 gris', composition: '65 % poliéster, 35 % algodón', weightGsm: 300, color: 'Gris', pricePerMeter: 5.9, status: 'Activo', supplier: 'P03', priceUpdatedOn: '2026-07-19' },
  { code: 'TJ-012', name: 'Sarga algodón marino', composition: '100 % algodón', weightGsm: 240, color: 'Marino', pricePerMeter: 5.2, status: 'Activo', supplier: 'P09', priceUpdatedOn: '2026-06-08' },
  { code: 'TJ-013', name: 'Lona algodón caqui', composition: '100 % algodón', weightGsm: 320, color: 'Caqui', pricePerMeter: 6.1, status: 'Activo', supplier: 'P05', priceUpdatedOn: '2026-10-09' },
  { code: 'TJ-014', name: 'Softshell negro', composition: '94 % poliéster, 6 % elastano', weightGsm: 300, color: 'Negro', pricePerMeter: 8.4, status: 'Activo', supplier: 'P06', priceUpdatedOn: '2026-09-23' },
  // Demo: fabric under review.
  { code: 'TJ-015', name: 'Alta visibilidad naranja', composition: '80 % poliéster, 20 % algodón', weightGsm: 230, color: 'Naranja alta visibilidad', pricePerMeter: 5.7, status: 'En revisión', supplier: 'P04', priceUpdatedOn: '2026-02-17' },
  { code: 'TJ-016', name: 'Alta visibilidad amarillo', composition: '80 % poliéster, 20 % algodón', weightGsm: 230, color: 'Amarillo alta visibilidad', pricePerMeter: 5.6, status: 'Activo', supplier: 'P04', priceUpdatedOn: '2026-10-15' },
  { code: 'TJ-017', name: 'Gabardina poliéster negra', composition: '100 % poliéster', weightGsm: 210, color: 'Negro', pricePerMeter: 4.3, status: 'Activo', supplier: 'P06', priceUpdatedOn: '2026-08-12' },
  { code: 'TJ-018', name: 'Microfibra marino', composition: '100 % poliéster', weightGsm: 120, color: 'Marino', pricePerMeter: 3.1, status: 'Activo', supplier: 'P02', priceUpdatedOn: '2026-10-30' },
  { code: 'TJ-019', name: 'Forro polar gris', composition: '100 % poliéster', weightGsm: 280, color: 'Gris', pricePerMeter: 4.9, status: 'Activo', supplier: 'P06', priceUpdatedOn: '2026-07-01' },
  { code: 'TJ-020', name: 'Tafetán sanitario blanco', composition: '65 % poliéster, 35 % algodón', weightGsm: 150, color: 'Blanco', pricePerMeter: 3.4, status: 'Activo', supplier: 'P01', priceUpdatedOn: '2026-10-18' },
  { code: 'TJ-021', name: 'Tafetán sanitario verde', composition: '65 % poliéster, 35 % algodón', weightGsm: 155, color: 'Verde', pricePerMeter: 3.5, status: 'Activo', supplier: 'P05', priceUpdatedOn: '2026-09-27' },
  { code: 'TJ-022', name: 'Denim elástico marino', composition: '98 % algodón, 2 % elastano', weightGsm: 340, color: 'Marino', pricePerMeter: 6.8, status: 'Activo', supplier: 'P09', priceUpdatedOn: '2026-01-29' },
  { code: 'TJ-023', name: 'Ripstop 65/35 caqui', composition: '65 % poliéster, 35 % algodón', weightGsm: 210, color: 'Caqui', pricePerMeter: 4.5, status: 'Activo', supplier: 'P03', priceUpdatedOn: '2026-10-06' },
  { code: 'TJ-024', name: 'Punto piqué 65/35 rojo', composition: '65 % poliéster, 35 % algodón', weightGsm: 195, color: 'Rojo', pricePerMeter: 3.9, status: 'Activo', supplier: 'P05', priceUpdatedOn: '2026-08-25' },
  { code: 'TJ-025', name: 'Lana fría gris', composition: '70 % poliéster, 30 % lana', weightGsm: 260, color: 'Gris', pricePerMeter: 9.2, status: 'Activo', supplier: 'P03', priceUpdatedOn: '2026-06-30' },
  { code: 'TJ-026', name: 'Viscosa fluida blanca', composition: '100 % viscosa', weightGsm: 110, color: 'Blanco', pricePerMeter: 3.8, status: 'Activo', supplier: 'P01', priceUpdatedOn: '2026-10-25' },
  { code: 'TJ-027', name: 'Punto jersey elástico negro', composition: '95 % algodón, 5 % elastano', weightGsm: 180, color: 'Negro', pricePerMeter: 3, status: 'Activo', supplier: 'P08', priceUpdatedOn: '2026-05-06' },
  { code: 'TJ-028', name: 'Sarga ignífuga marino', composition: '75 % algodón, 24 % poliéster, 1 % fibra antiestática', weightGsm: 280, color: 'Marino', pricePerMeter: 11.5, status: 'Activo', supplier: 'P03', priceUpdatedOn: '2026-09-09' },
  { code: 'TJ-029', name: 'Sarga poliéster burdeos', composition: '100 % poliéster', weightGsm: 230, color: 'Burdeos', pricePerMeter: 4.4, status: 'Activo', supplier: 'P04', priceUpdatedOn: '2026-10-12' },
  // Demo: unused material, for the empty state.
  { code: 'TJ-030', name: 'Lino lavado blanco', composition: '100 % lino', weightGsm: 180, color: 'Blanco', pricePerMeter: 7.3, status: 'Activo', supplier: 'P03', priceUpdatedOn: '2026-11-02' },
];

const trims: TrimFixture[] = [
  { reference: 'AV-001', type: 'Botón', pricePerUnit: 0.08, status: 'Activo', supplier: 'P11', priceUpdatedOn: '2026-10-01' },
  { reference: 'AV-002', type: 'Botón', pricePerUnit: 0.06, status: 'Activo', supplier: 'P10', priceUpdatedOn: '2026-06-14' },
  { reference: 'AV-003', type: 'Botón', pricePerUnit: 0.12, status: 'Activo', supplier: 'P11', priceUpdatedOn: '2026-09-18' },
  { reference: 'AV-004', type: 'Botón', pricePerUnit: 0.05, status: 'Activo', supplier: 'P10', priceUpdatedOn: '2026-10-22' },
  // Demo: trim under review.
  { reference: 'AV-005', type: 'Cremallera', pricePerUnit: 0.85, status: 'En revisión', supplier: 'P12', priceUpdatedOn: '2026-03-27' },
  { reference: 'AV-006', type: 'Cremallera', pricePerUnit: 0.7, status: 'Activo', supplier: 'P10', priceUpdatedOn: '2026-08-08' },
  { reference: 'AV-007', type: 'Cremallera', pricePerUnit: 1.2, status: 'Activo', supplier: 'P12', priceUpdatedOn: '2026-10-11' },
  { reference: 'AV-008', type: 'Cremallera', pricePerUnit: 0.95, status: 'Activo', supplier: 'P12', priceUpdatedOn: '2026-09-02' },
  { reference: 'AV-009', type: 'Etiqueta', pricePerUnit: 0.04, status: 'Activo', supplier: 'P13', priceUpdatedOn: '2026-10-27' },
  { reference: 'AV-010', type: 'Etiqueta', pricePerUnit: 0.03, status: 'Activo', supplier: 'P13', priceUpdatedOn: '2026-07-15' },
  { reference: 'AV-011', type: 'Etiqueta', pricePerUnit: 0.06, status: 'Activo', supplier: 'P13', priceUpdatedOn: '2026-10-19' },
  { reference: 'AV-012', type: 'Etiqueta', pricePerUnit: 0.05, status: 'Activo', supplier: 'P10', priceUpdatedOn: '2026-04-23' },
  { reference: 'AV-013', type: 'Velcro', pricePerUnit: 0.3, status: 'Activo', supplier: 'P15', priceUpdatedOn: '2026-09-30' },
  { reference: 'AV-014', type: 'Velcro', pricePerUnit: 0.25, status: 'Activo', supplier: 'P15', priceUpdatedOn: '2026-10-14' },
  { reference: 'AV-015', type: 'Cinta reflectante', pricePerUnit: 0.9, status: 'Activo', supplier: 'P14', priceUpdatedOn: '2026-08-19' },
  { reference: 'AV-016', type: 'Cinta reflectante', pricePerUnit: 1.1, status: 'Activo', supplier: 'P14', priceUpdatedOn: '2026-10-03' },
  { reference: 'AV-017', type: 'Botón', pricePerUnit: 0.1, status: 'Activo', supplier: 'P11', priceUpdatedOn: '2026-05-28' },
  { reference: 'AV-018', type: 'Cremallera', pricePerUnit: 1.5, status: 'Activo', supplier: 'P12', priceUpdatedOn: '2026-10-29' },
  { reference: 'AV-019', type: 'Etiqueta', pricePerUnit: 0.08, status: 'Activo', supplier: 'P13', priceUpdatedOn: '2026-09-11' },
  { reference: 'AV-020', type: 'Velcro', pricePerUnit: 0.35, status: 'Activo', supplier: 'P15', priceUpdatedOn: '2026-10-08' },
];

const bom = (...lines: [material: string, quantity: number][]): BomLineFixture[] =>
  lines.map(([material, quantity]) => ({ material, quantity }));

const garments: GarmentFixture[] = [
  { code: 'PR-001', name: 'Pantalón multibolsillos', category: 'Pantalón', phase: 'Producción', bom: bom(['TJ-007', 1.4], ['AV-001', 1], ['AV-007', 1]) },
  { code: 'PR-002', name: 'Chaqueta de trabajo', category: 'Chaqueta', phase: 'Producción', bom: bom(['TJ-007', 1.8], ['AV-008', 1], ['AV-003', 6]) },
  { code: 'PR-003', name: 'Peto de trabajo', category: 'Pantalón', phase: 'Producción', bom: bom(['TJ-007', 2.1], ['AV-017', 4]) },
  { code: 'PR-004', name: 'Camisa Oxford manga larga', category: 'Camisa', phase: 'Producción', bom: bom(['TJ-003', 1.6], ['AV-002', 9]) },
  { code: 'PR-005', name: 'Polo piqué', category: 'Polo', phase: 'Producción', bom: bom(['TJ-004', 1.1], ['AV-004', 3]) },
  { code: 'PR-006', name: 'Camiseta técnica', category: 'Camiseta', phase: 'Producción', bom: bom(['TJ-006', 0.9], ['AV-019', 1]) },
  { code: 'PR-007', name: 'Bata sanitaria', category: 'Bata', phase: 'Producción', bom: bom(['TJ-020', 1.9], ['AV-013', 2]) },
  { code: 'PR-008', name: 'Casaca sanitaria verde', category: 'Sanitario', phase: 'Producción', bom: bom(['TJ-021', 1.3], ['AV-014', 1]) },
  { code: 'PR-009', name: 'Chaleco alta visibilidad', category: 'Chaleco', phase: 'Producción', bom: bom(['TJ-015', 0.9], ['AV-015', 2], ['AV-020', 1]) },
  { code: 'PR-010', name: 'Parka alta visibilidad', category: 'Parka', phase: 'Producción', bom: bom(['TJ-016', 2.4], ['AV-016', 3], ['AV-005', 1]) },
  { code: 'PR-011', name: 'Chaqueta softshell', category: 'Chaqueta', phase: 'Aprobada', bom: bom(['TJ-014', 1.7], ['AV-006', 1]) },
  { code: 'PR-012', name: 'Pantalón chino', category: 'Pantalón', phase: 'Producción', bom: bom(['TJ-012', 1.3], ['TJ-011', 0.2], ['AV-001', 1], ['AV-009', 1]) },
  { code: 'PR-013', name: 'Camisa popelín blanca', category: 'Camisa', phase: 'Producción', bom: bom(['TJ-001', 1.5], ['AV-002', 8]) },
  { code: 'PR-014', name: 'Camisa de sala', category: 'Camisa', phase: 'Aprobada', bom: bom(['TJ-002', 1.5], ['AV-004', 8], ['AV-010', 1]) },
  { code: 'PR-015', name: 'Chaqueta de cocina', category: 'Chaqueta', phase: 'Producción', bom: bom(['TJ-008', 1.6], ['AV-017', 10]) },
  { code: 'PR-016', name: 'Delantal de sala', category: 'Delantal', phase: 'Producción', bom: bom(['TJ-029', 0.8], ['TJ-009', 0.2], ['AV-011', 1]) },
  { code: 'PR-017', name: 'Forro polar corporativo', category: 'Chaqueta', phase: 'Producción', bom: bom(['TJ-019', 1.6], ['AV-008', 1]) },
  { code: 'PR-018', name: 'Camiseta básica negra', category: 'Camiseta', phase: 'Muestra', bom: bom(['TJ-027', 0.9], ['AV-012', 1]) },
  { code: 'PR-019', name: 'Blusa de recepción', category: 'Camisa', phase: 'Diseño', bom: bom(['TJ-026', 1.4], ['AV-003', 7]) },
  { code: 'PR-020', name: 'Pantalón de lana fría', category: 'Pantalón', phase: 'Muestra', bom: bom(['TJ-025', 1.3], ['AV-018', 1]) },
  { code: 'PR-021', name: 'Polo bicolor', category: 'Polo', phase: 'Aprobada', bom: bom(['TJ-005', 1.1], ['TJ-024', 0.2]) },
  { code: 'PR-022', name: 'Chaqueta ignífuga', category: 'Chaqueta', phase: 'Muestra', bom: bom(['TJ-028', 2], ['AV-007', 1], ['AV-016', 2]) },
  { code: 'PR-023', name: 'Pantalón vaquero', category: 'Pantalón', phase: 'Retirada', bom: bom(['TJ-022', 1.4], ['TJ-017', 0.3], ['AV-009', 1]) },
  { code: 'PR-024', name: 'Pantalón de trabajo v2', category: 'Pantalón', phase: 'Diseño', bom: bom(['TJ-010', 1.4], ['TJ-023', 0.3], ['AV-001', 1]) },
  { code: 'PR-025', name: 'Cazadora de lona', category: 'Chaqueta', phase: 'Aprobada', bom: bom(['TJ-013', 1.9], ['TJ-018', 1.2], ['AV-020', 2]) },
];

const clients: ClientFixture[] = [
  { key: 'CL1', name: 'Clínica Mirasol', sector: 'Sanidad', employees: 1200 },
  { key: 'CL2', name: 'Logística Portal Sur', sector: 'Logística', employees: 850 },
  { key: 'CL3', name: 'Hoteles Brisa Atlántica', sector: 'Hostelería', employees: 640 },
  { key: 'CL4', name: 'Vigía Seguridad Integral', sector: 'Seguridad', employees: 2300 },
  { key: 'CL5', name: 'Supermercados Fresquia', sector: 'Retail', employees: 3100 },
  { key: 'CL6', name: 'Limpiezas Cristal Norte', sector: 'Limpieza', employees: 520 },
  { key: 'CL7', name: 'Metalúrgica Ribera Sur', sector: 'Industria', employees: 410 },
  { key: 'CL8', name: 'Residencias Alba Serena', sector: 'Sanidad', employees: 760 },
];

const catalogFor = (client: string, ...lines: [garment: string, annualUnits: number][]): CatalogFixture[] =>
  lines.map(([garment, annualUnits]) => ({ client, garment, annualUnits }));

const catalog: CatalogFixture[] = [
  ...catalogFor('CL1', ['PR-007', 600], ['PR-008', 450], ['PR-013', 200], ['PR-001', 80], ['PR-006', 300]),
  ...catalogFor('CL2', ['PR-001', 900], ['PR-002', 400], ['PR-009', 700], ['PR-010', 350], ['PR-005', 500], ['PR-017', 300]),
  ...catalogFor('CL3', ['PR-003', 120], ['PR-014', 800], ['PR-015', 450], ['PR-016', 600], ['PR-013', 500]),
  ...catalogFor('CL4', ['PR-002', 1500], ['PR-004', 2200], ['PR-011', 900], ['PR-012', 1800], ['PR-010', 600]),
  ...catalogFor('CL5', ['PR-005', 3000], ['PR-006', 2500], ['PR-016', 900], ['PR-017', 1200], ['PR-021', 800]),
  ...catalogFor('CL6', ['PR-006', 700], ['PR-009', 300], ['PR-012', 400], ['PR-005', 500], ['PR-017', 200]),
  ...catalogFor('CL7', ['PR-009', 400], ['PR-010', 350], ['PR-011', 200], ['PR-017', 300], ['PR-004', 150]),
  ...catalogFor('CL8', ['PR-007', 500], ['PR-008', 600], ['PR-013', 150], ['PR-014', 100]),
];

const REJECTION_COMMENTS = [
  'Talla corta de largo; ajustar patrón.',
  'Color fuera de tolerancia respecto a la carta.',
  'Costura de bolsillo débil en prueba de tracción.',
  'Etiqueta de composición incompleta.',
];
const APPROVAL_COMMENTS = [
  'Aprobada sin cambios.',
  'Aprobada; ajustar empaquetado en producción.',
  'Aprobada tras prueba de lavado industrial.',
];
const FIRST_SAMPLE_DATE = '2025-03-03';
const DAYS_BETWEEN_GARMENTS = 9;
const DAYS_BETWEEN_VERSIONS = 21;
/** Garments past the sample phase that needed a second version. */
const GARMENTS_WITH_REJECTED_FIRST_SAMPLE = new Set(['PR-001', 'PR-002', 'PR-003', 'PR-004', 'PR-005', 'PR-006', 'PR-007']);

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function pick(list: string[], index: number): string {
  return list[index % list.length] ?? '';
}

/**
 * One sample per garment that reached the sample phase. Garments in "Muestra" have
 * a rejected sample; the rest an approved one, after a rejected first version for some.
 */
function buildSamples(): SampleFixture[] {
  const samples: SampleFixture[] = [];
  garments.forEach((garment, index) => {
    if (garment.phase === 'Diseño') return;
    const firstDate = addDays(FIRST_SAMPLE_DATE, index * DAYS_BETWEEN_GARMENTS);

    if (garment.phase === 'Muestra') {
      samples.push({ garment: garment.code, version: 1, date: firstDate, result: 'Rechazada', comments: pick(REJECTION_COMMENTS, index) });
      return;
    }
    if (GARMENTS_WITH_REJECTED_FIRST_SAMPLE.has(garment.code)) {
      samples.push({ garment: garment.code, version: 1, date: firstDate, result: 'Rechazada', comments: pick(REJECTION_COMMENTS, index) });
      samples.push({
        garment: garment.code,
        version: 2,
        date: addDays(firstDate, DAYS_BETWEEN_VERSIONS),
        result: 'Aprobada',
        comments: pick(APPROVAL_COMMENTS, index),
      });
      return;
    }
    samples.push({ garment: garment.code, version: 1, date: firstDate, result: 'Aprobada', comments: pick(APPROVAL_COMMENTS, index) });
  });
  return samples;
}

export const fixtures: Fixtures = {
  suppliers,
  fabrics,
  trims,
  garments,
  samples: buildSamples(),
  clients,
  catalog,
};
