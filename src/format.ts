import type { SubjectKind } from '../shared/types';

// Display helpers shared by the components. Spanish, business language.

export const KIND_LABELS: Record<SubjectKind, string> = {
  tejido: 'Tejido',
  avio: 'Avío',
  proveedor: 'Proveedor',
};

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('es-ES');
const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const MINUS = '−';

export function formatEuro(value: number | null): string {
  return value === null ? 'Sin precio' : euro.format(value);
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** "+600,00 €", "−1,20 €" or "0,00 €". */
export function formatSignedEuro(value: number): string {
  if (value === 0) return euro.format(0);
  return `${value > 0 ? '+' : MINUS}${euro.format(Math.abs(value))}`;
}

/** "+7,5 %", "−15 %", "0 %" or "—" when it cannot be compared. */
export function formatSignedPct(value: number | null): string {
  if (value === null) return '—';
  const sign = value > 0 ? '+' : value < 0 ? MINUS : '';
  return `${sign}${percent.format(Math.abs(value))} %`;
}

export function formatDays(value: number | null): string {
  if (value === null) return 'Sin plazo informado';
  return value === 1 ? '1 día' : `${value} días`;
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}
