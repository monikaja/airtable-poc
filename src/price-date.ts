import { isStalePrice, priceAgeDays } from '../shared/price-freshness';
import { plural } from './format';

export type PriceDateScope = 'material' | 'proveedor';

/** "2026-03-03" → "03/03/2026", without going through Date so no time zone can shift the day. */
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * How fresh a price is, in words. A material shows its own price date; a supplier shows the oldest
 * of its materials. With `simulationNote`, a stale price also says that the simulation starts from it.
 */
export function describePriceDate(
  updatedOn: string | null,
  today: Date,
  scope: PriceDateScope = 'material',
  simulationNote = false,
): { text: string; stale: boolean } {
  const ofSupplier = scope === 'proveedor';
  const age = priceAgeDays(updatedOn, today);

  if (!isStalePrice(updatedOn, today) && updatedOn !== null) {
    const date = formatIsoDate(updatedOn);
    return { text: ofSupplier ? `Precio más antiguo de sus materiales: ${date}` : `Precio del ${date}`, stale: false };
  }

  let text: string;
  if (updatedOn === null || age === null) {
    text = ofSupplier ? 'Aviso: algún material del proveedor no tiene fecha de precio.' : 'Aviso: precio sin fecha de actualización.';
  } else {
    const since = `${formatIsoDate(updatedOn)} (hace ${plural(age, 'día', 'días')})`;
    text = ofSupplier ? `Aviso: el precio más antiguo de sus materiales es del ${since}.` : `Aviso: precio sin actualizar desde el ${since}.`;
  }
  if (simulationNote) text += ofSupplier ? ' La simulación parte de estos precios.' : ' La simulación parte de este precio.';
  return { text, stale: true };
}
