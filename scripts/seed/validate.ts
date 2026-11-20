import { findCompatibleFabrics, parseComposition } from '../../shared/compatibility';
import type { Fixtures } from './fixtures';

const RED_DEMO_MIN_GARMENTS = 3;
const RED_DEMO_MIN_CLIENTS = 4;
const RED_DEMO_MIN_ALTERNATIVES = 2;
const RED_DEMO_MAX_ALTERNATIVES = 3;
const MIN_MATERIALS_IN_REVIEW = 2;
const LONG_LEAD_TIME_DAYS = 75;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/**
 * Returns every problem found in the demo data, as messages for the developer.
 * An empty list means the fixtures can be uploaded and the demo cases hold.
 */
export function validateFixtures(fixtures: Fixtures): string[] {
  const errors: string[] = [];
  const supplierKeys = new Set(fixtures.suppliers.map((supplier) => supplier.key));
  const fabricCodes = new Set(fixtures.fabrics.map((fabric) => fabric.code));
  const trimReferences = new Set(fixtures.trims.map((trim) => trim.reference));
  const garmentCodes = new Set(fixtures.garments.map((garment) => garment.code));
  const clientKeys = new Set(fixtures.clients.map((client) => client.key));

  // Unique identifiers.
  const identifierLists: [string, string[]][] = [
    ['proveedor', fixtures.suppliers.map((supplier) => supplier.key)],
    ['material', [...fixtures.fabrics.map((fabric) => fabric.code), ...fixtures.trims.map((trim) => trim.reference)]],
    ['prenda', fixtures.garments.map((garment) => garment.code)],
    ['cliente', fixtures.clients.map((client) => client.key)],
    ['línea de catálogo', fixtures.catalog.map((line) => `${line.client} · ${line.garment}`)],
  ];
  for (const [label, values] of identifierLists) {
    for (const value of duplicates(values)) errors.push(`Identificador de ${label} repetido: ${value}`);
  }

  // References and values.
  for (const fabric of [...fixtures.fabrics, ...fixtures.trims]) {
    if (!supplierKeys.has(fabric.supplier)) {
      errors.push(`${'code' in fabric ? fabric.code : fabric.reference}: proveedor inexistente ${fabric.supplier}`);
    }
  }
  for (const fabric of fixtures.fabrics) {
    if (!parseComposition(fabric.composition)) errors.push(`${fabric.code}: composición ilegible "${fabric.composition}"`);
  }
  for (const supplier of fixtures.suppliers) {
    if (!Number.isInteger(supplier.rating) || supplier.rating < 1 || supplier.rating > 5) {
      errors.push(`${supplier.key}: la valoración debe ser un entero de 1 a 5`);
    }
  }
  for (const garment of fixtures.garments) {
    if (garment.bom.length === 0) errors.push(`${garment.code}: la prenda no tiene BOM`);
    for (const line of garment.bom) {
      const matches = Number(fabricCodes.has(line.material)) + Number(trimReferences.has(line.material));
      if (matches !== 1) errors.push(`${garment.code}: la línea de BOM ${line.material} debe enlazar exactamente un tejido o un avío`);
      if (!(line.quantity > 0)) errors.push(`${garment.code}: la cantidad de ${line.material} debe ser mayor que 0`);
    }
  }
  for (const line of fixtures.catalog) {
    if (!clientKeys.has(line.client)) errors.push(`Catálogo: cliente inexistente ${line.client}`);
    if (!garmentCodes.has(line.garment)) errors.push(`Catálogo: prenda inexistente ${line.garment}`);
    if (!(line.annualUnits > 0)) errors.push(`Catálogo ${line.client} · ${line.garment}: las unidades deben ser mayores que 0`);
  }
  for (const sample of fixtures.samples) {
    if (!garmentCodes.has(sample.garment)) errors.push(`Muestras: prenda inexistente ${sample.garment}`);
  }

  // Demo cases.
  const garmentsUsing = (material: string) => fixtures.garments.filter((garment) => garment.bom.some((line) => line.material === material));
  const clientsOf = (garments: string[]) =>
    new Set(fixtures.catalog.filter((line) => garments.includes(line.garment)).map((line) => line.client));

  const redDemo = fixtures.fabrics.some((fabric) => {
    if (fabric.status !== 'Descatalogado') return false;
    const inProduction = garmentsUsing(fabric.code).filter((garment) => garment.phase === 'Producción');
    const alternatives = findCompatibleFabrics({ ...fabric, id: fabric.code }, fixtures.fabrics.map((other) => ({ ...other, id: other.code })));
    return (
      inProduction.length >= RED_DEMO_MIN_GARMENTS &&
      clientsOf(inProduction.map((garment) => garment.code)).size >= RED_DEMO_MIN_CLIENTS &&
      alternatives.length >= RED_DEMO_MIN_ALTERNATIVES &&
      alternatives.length <= RED_DEMO_MAX_ALTERNATIVES
    );
  });
  if (!redDemo) {
    errors.push(
      `Demo: falta un tejido descatalogado usado en ${RED_DEMO_MIN_GARMENTS} prendas en producción, ` +
        `por ${RED_DEMO_MIN_CLIENTS} clientes y con ${RED_DEMO_MIN_ALTERNATIVES}–${RED_DEMO_MAX_ALTERNATIVES} alternativas compatibles`,
    );
  }

  const inReview = [...fixtures.fabrics, ...fixtures.trims].filter((material) => material.status === 'En revisión');
  if (inReview.length < MIN_MATERIALS_IN_REVIEW) errors.push(`Demo: hacen falta ${MIN_MATERIALS_IN_REVIEW} materiales en revisión`);

  const longLeadSuppliers = new Set(
    fixtures.suppliers.filter((supplier) => supplier.leadTimeDays >= LONG_LEAD_TIME_DAYS).map((supplier) => supplier.key),
  );
  const longLeadMaterialUsed = [...fixtures.fabrics.map((fabric) => ({ id: fabric.code, supplier: fabric.supplier })), ...fixtures.trims.map((trim) => ({ id: trim.reference, supplier: trim.supplier }))]
    .some((material) => longLeadSuppliers.has(material.supplier) && garmentsUsing(material.id).length > 0);
  if (!longLeadMaterialUsed) errors.push(`Demo: falta un proveedor con ${LONG_LEAD_TIME_DAYS} días de plazo cuyos materiales se usen`);

  const unused = [...fabricCodes, ...trimReferences].filter((material) => garmentsUsing(material).length === 0);
  if (unused.length === 0) errors.push('Demo: falta un material sin ningún uso');

  return errors;
}
