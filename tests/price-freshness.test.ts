import { describe, expect, it } from 'vitest';
import { STALE_PRICE_DAYS, isStalePrice, oldestPriceDate, priceAgeDays } from '../shared/price-freshness';

const today = new Date(2026, 10, 23, 18, 30); // 23/11/2026, local time

describe('priceAgeDays', () => {
  it('counts whole days since the price was updated', () => {
    expect(priceAgeDays('2026-11-23', today)).toBe(0);
    expect(priceAgeDays('2026-10-28', today)).toBe(26);
    expect(priceAgeDays('2026-03-03', today)).toBe(265);
  });

  it('returns null when the date is missing or not a real date', () => {
    for (const date of [null, '', '03/03/2026', '2026-02-30']) {
      expect(priceAgeDays(date, today)).toBeNull();
    }
  });
});

describe('isStalePrice', () => {
  it(`flags a price older than ${STALE_PRICE_DAYS} days`, () => {
    expect(isStalePrice('2026-08-25', today)).toBe(false); // 90 days
    expect(isStalePrice('2026-08-24', today)).toBe(true); // 91 days
  });

  it('flags a price whose date is unknown', () => {
    expect(isStalePrice(null, today)).toBe(true);
  });
});

describe('oldestPriceDate', () => {
  it('returns the oldest date of a supplier’s materials', () => {
    expect(oldestPriceDate(['2026-10-28', '2026-03-03', '2026-09-14'])).toBe('2026-03-03');
  });

  it('returns null when a date is unknown or there are no materials', () => {
    expect(oldestPriceDate(['2026-10-28', null])).toBeNull();
    expect(oldestPriceDate([])).toBeNull();
  });
});
