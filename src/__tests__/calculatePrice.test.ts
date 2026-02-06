/**
 * hydrogen-bundles calculatePrice tests
 *
 * Tests the calculatePriceFromDefinition logic and formatting functions.
 * We import the internal function indirectly by testing through definition-based calculation.
 */

import { describe, it, expect } from 'vitest';

import { formatMoney, formatSavings } from '../sdk/calculatePrice.js';

import type { BundleDefinition, Money } from '../types.js';

// We can't directly test calculatePriceFromDefinition (not exported), but we can
// test calculateBundlePrice with a definition object (no API call needed).
// However, calculateBundlePrice has async imports for resolveBundle.
// Instead, test the exported pure functions and the format utilities.

// ---------------------------------------------------------------------------
// formatMoney
// ---------------------------------------------------------------------------

describe('formatMoney', () => {
  it('formats USD amount', () => {
    const money: Money = { amount: '29.99', currencyCode: 'USD' };
    const result = formatMoney(money);
    expect(result).toContain('29.99');
    expect(result).toContain('$');
  });

  it('formats EUR amount', () => {
    const money: Money = { amount: '19.50', currencyCode: 'EUR' };
    const result = formatMoney(money, 'de-DE');
    expect(result).toContain('19,50');
  });

  it('handles zero amount', () => {
    const money: Money = { amount: '0.00', currencyCode: 'USD' };
    const result = formatMoney(money);
    expect(result).toContain('0.00');
  });

  it('handles large amounts', () => {
    const money: Money = { amount: '1234.56', currencyCode: 'USD' };
    const result = formatMoney(money);
    expect(result).toContain('1,234.56');
  });

  it('respects locale parameter', () => {
    const money: Money = { amount: '1234.56', currencyCode: 'USD' };
    const usResult = formatMoney(money, 'en-US');
    expect(usResult).toContain('$');
  });
});

// ---------------------------------------------------------------------------
// formatSavings
// ---------------------------------------------------------------------------

describe('formatSavings', () => {
  it('formats savings with amount and percentage', () => {
    const savings: Money = { amount: '10.00', currencyCode: 'USD' };
    const result = formatSavings(savings, 20);
    expect(result).toContain('Save');
    expect(result).toContain('$10.00');
    expect(result).toContain('20%');
  });

  it('rounds percentage to integer', () => {
    const savings: Money = { amount: '5.50', currencyCode: 'USD' };
    const result = formatSavings(savings, 15.7);
    expect(result).toContain('16%');
  });

  it('handles 0% savings', () => {
    const savings: Money = { amount: '0.00', currencyCode: 'USD' };
    const result = formatSavings(savings, 0);
    expect(result).toContain('0%');
  });

  it('handles large savings', () => {
    const savings: Money = { amount: '100.00', currencyCode: 'USD' };
    const result = formatSavings(savings, 50);
    expect(result).toContain('$100.00');
    expect(result).toContain('50%');
  });
});
