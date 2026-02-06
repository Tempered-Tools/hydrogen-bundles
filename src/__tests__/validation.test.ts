/**
 * hydrogen-bundles validation utility tests
 */

import { describe, it, expect } from 'vitest';

import {
  isValidGid,
  extractNumericId,
  isValidConfig,
  validateBundleSelection,
  isBundleProduct,
  sanitizeInput,
  isValidShopDomain,
} from '../utils/validation.js';

import type { BundleDefinition, BundleBridgeConfig } from '../types.js';

// ---------------------------------------------------------------------------
// isValidGid
// ---------------------------------------------------------------------------

describe('isValidGid', () => {
  it('accepts valid product GID', () => {
    expect(isValidGid('gid://shopify/Product/123456789')).toBe(true);
  });

  it('accepts valid variant GID', () => {
    expect(isValidGid('gid://shopify/ProductVariant/123456789')).toBe(true);
  });

  it('accepts any Shopify resource GID', () => {
    expect(isValidGid('gid://shopify/Collection/123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidGid('')).toBe(false);
  });

  it('rejects plain numeric ID', () => {
    expect(isValidGid('123456789')).toBe(false);
  });

  it('rejects malformed GID', () => {
    expect(isValidGid('gid://shopify/Product/')).toBe(false);
    expect(isValidGid('gid://shopify//123')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidGid(null as unknown as string)).toBe(false);
    expect(isValidGid(undefined as unknown as string)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractNumericId
// ---------------------------------------------------------------------------

describe('extractNumericId', () => {
  it('extracts numeric ID from GID', () => {
    expect(extractNumericId('gid://shopify/Product/123')).toBe('123');
  });

  it('returns null for empty input', () => {
    expect(extractNumericId('')).toBeNull();
  });

  it('returns null for non-GID without trailing number', () => {
    expect(extractNumericId('abc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidConfig
// ---------------------------------------------------------------------------

describe('isValidConfig', () => {
  it('accepts valid config with storeDomain only', () => {
    expect(isValidConfig({ storeDomain: 'my-store.myshopify.com' })).toBe(true);
  });

  it('accepts config with all optional fields', () => {
    expect(
      isValidConfig({
        storeDomain: 'my-store.myshopify.com',
        apiUrl: 'https://api.example.com',
        apiKey: 'key-123',
      }),
    ).toBe(true);
  });

  it('rejects missing storeDomain', () => {
    expect(isValidConfig({} as Partial<BundleBridgeConfig>)).toBe(false);
  });

  it('rejects empty storeDomain', () => {
    expect(isValidConfig({ storeDomain: '' })).toBe(false);
  });

  it('rejects apiKey without apiUrl', () => {
    expect(
      isValidConfig({
        storeDomain: 'my-store.myshopify.com',
        apiKey: 'key-123',
      }),
    ).toBe(false);
  });

  it('rejects null config', () => {
    expect(isValidConfig(null as unknown as Partial<BundleBridgeConfig>)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateBundleSelection
// ---------------------------------------------------------------------------

describe('validateBundleSelection', () => {
  const fixedBundle: BundleDefinition = {
    id: 'gid://shopify/Product/1',
    title: 'Fixed Bundle',
    handle: 'fixed',
    bundleType: 'fixed',
    components: [],
    pricing: { discountType: 'percentage' },
    availableForSale: true,
  };

  const mixAndMatchBundle: BundleDefinition = {
    id: 'gid://shopify/Product/2',
    title: 'Mix Bundle',
    handle: 'mix',
    bundleType: 'mix_and_match',
    minSelections: 2,
    maxSelections: 4,
    components: [
      {
        productId: 'p1',
        productTitle: 'Product 1',
        productHandle: 'product-1',
        variants: [
          {
            id: 'v1',
            title: 'Default',
            price: { amount: '10.00', currencyCode: 'USD' },
            availableForSale: true,
          },
        ],
        quantity: 1,
      },
      {
        productId: 'p2',
        productTitle: 'Product 2',
        productHandle: 'product-2',
        variants: [
          {
            id: 'v2',
            title: 'Default',
            price: { amount: '15.00', currencyCode: 'USD' },
            availableForSale: true,
          },
        ],
        quantity: 1,
      },
    ],
    pricing: { discountType: 'percentage', discountValue: 10 },
    availableForSale: true,
  };

  it('always valid for fixed bundles', () => {
    const result = validateBundleSelection(fixedBundle, []);
    expect(result.valid).toBe(true);
  });

  it('validates valid mix-and-match selection', () => {
    const result = validateBundleSelection(mixAndMatchBundle, [
      { productId: 'p1', variantId: 'v1', quantity: 1 },
      { productId: 'p2', variantId: 'v2', quantity: 1 },
    ]);
    expect(result.valid).toBe(true);
  });

  it('rejects too few selections', () => {
    const result = validateBundleSelection(mixAndMatchBundle, [
      { productId: 'p1', variantId: 'v1', quantity: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 2');
  });

  it('rejects too many selections', () => {
    const result = validateBundleSelection(mixAndMatchBundle, [
      { productId: 'p1', variantId: 'v1', quantity: 3 },
      { productId: 'p2', variantId: 'v2', quantity: 3 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at most 4');
  });

  it('rejects invalid product in selection', () => {
    const result = validateBundleSelection(mixAndMatchBundle, [
      { productId: 'p999', variantId: 'v1', quantity: 1 },
      { productId: 'p2', variantId: 'v2', quantity: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid product');
  });

  it('rejects invalid variant in selection', () => {
    const result = validateBundleSelection(mixAndMatchBundle, [
      { productId: 'p1', variantId: 'v999', quantity: 1 },
      { productId: 'p2', variantId: 'v2', quantity: 1 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid variant');
  });
});

// ---------------------------------------------------------------------------
// isBundleProduct
// ---------------------------------------------------------------------------

describe('isBundleProduct', () => {
  it('returns true when variant has bundle components', () => {
    expect(
      isBundleProduct({
        variants: [{ bundleComponents: [{ id: '1' }] }],
      }),
    ).toBe(true);
  });

  it('returns false for empty variants', () => {
    expect(isBundleProduct({ variants: [] })).toBe(false);
  });

  it('returns false for null/undefined product', () => {
    expect(isBundleProduct(null as unknown as { variants: [] })).toBe(false);
  });

  it('returns false when bundleComponents is empty array', () => {
    expect(
      isBundleProduct({
        variants: [{ bundleComponents: [] }],
      }),
    ).toBe(false);
  });

  it('returns false when bundleComponents is null', () => {
    expect(
      isBundleProduct({
        variants: [{ bundleComponents: null }],
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeInput
// ---------------------------------------------------------------------------

describe('sanitizeInput', () => {
  it('trims and limits to 1000 chars', () => {
    const long = 'a'.repeat(1200);
    expect(sanitizeInput(long)).toHaveLength(1000);
  });

  it('returns empty for non-string', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// isValidShopDomain
// ---------------------------------------------------------------------------

describe('isValidShopDomain', () => {
  it('accepts myshopify.com domains', () => {
    expect(isValidShopDomain('my-store.myshopify.com')).toBe(true);
  });

  it('accepts custom domains', () => {
    expect(isValidShopDomain('shop.example.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidShopDomain('')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidShopDomain(null as unknown as string)).toBe(false);
  });
});
