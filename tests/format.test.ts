import { describe, expect, it } from 'vitest';
import { formatDays, formatEuro, formatNumber, formatSignedEuro, formatSignedPct, plural } from '../src/format';

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('format', () => {
  it('formats money, numbers and percentages the Spanish way', () => {
    expect(plain(formatEuro(28686.6))).toBe('28.686,60 €');
    expect(plain(formatEuro(4.8))).toBe('4,80 €');
    expect(formatNumber(1500)).toBe('1500');
    expect(formatNumber(12500)).toBe('12.500');
    expect(plain(formatSignedEuro(600))).toBe('+600,00 €');
    expect(plain(formatSignedEuro(-1.2))).toBe('−1,20 €');
    expect(plain(formatSignedEuro(0))).toBe('0,00 €');
    expect(plain(formatSignedPct(7.5))).toBe('+7,5 %');
    expect(plain(formatSignedPct(-15))).toBe('−15 %');
  });

  it('says when a value is unknown', () => {
    expect(formatEuro(null)).toBe('Sin precio');
    expect(formatDays(null)).toBe('Sin plazo informado');
    expect(formatDays(30)).toBe('30 días');
    expect(formatDays(1)).toBe('1 día');
    expect(formatSignedPct(null)).toBe('—');
  });

  it('pluralises business nouns', () => {
    expect(plural(1, 'prenda', 'prendas')).toBe('1 prenda');
    expect(plural(3, 'prenda', 'prendas')).toBe('3 prendas');
  });
});
