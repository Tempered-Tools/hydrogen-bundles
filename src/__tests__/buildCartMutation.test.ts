/**
 * hydrogen-bundles buildCartMutation tests
 */

import { describe, it, expect } from 'vitest';

import {
  buildBundleCartLines,
  isBundleLine,
  getBundleInfoFromLine,
  groupCartLinesByBundle,
} from '../sdk/buildCartMutation.js';
import { BUNDLE_ATTRIBUTES } from '../utils/constants.js';

import type { BundleDefinition, AddBundleInput } from '../types.js';

const fixedBundle: BundleDefinition = {
  id: 'gid://shopify/Product/100',
  title: 'Test Bundle',
  handle: 'test-bundle',
  bundleType: 'fixed',
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
      defaultVariantId: 'v1',
      quantity: 2,
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
      defaultVariantId: 'v2',
      quantity: 1,
    },
  ],
  pricing: { discountType: 'percentage', discountValue: 10 },
  availableForSale: true,
};

// ---------------------------------------------------------------------------
// buildBundleCartLines
// ---------------------------------------------------------------------------

describe('buildBundleCartLines', () => {
  it('creates a line for each component', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    expect(lines).toHaveLength(2);
  });

  it('uses default variant IDs for fixed bundles', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    expect(lines[0]!.merchandiseId).toBe('v1');
    expect(lines[1]!.merchandiseId).toBe('v2');
  });

  it('multiplies component quantity by bundle quantity', () => {
    const input: AddBundleInput = {
      bundleId: 'gid://shopify/Product/100',
      quantity: 3,
    };
    const lines = buildBundleCartLines(fixedBundle, input);

    // Component 1 has quantity 2, bundle quantity 3 => 6
    expect(lines[0]!.quantity).toBe(6);
    // Component 2 has quantity 1, bundle quantity 3 => 3
    expect(lines[1]!.quantity).toBe(3);
  });

  it('defaults bundle quantity to 1', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    expect(lines[0]!.quantity).toBe(2); // 2 * 1
    expect(lines[1]!.quantity).toBe(1); // 1 * 1
  });

  it('adds bundle attributes to each line', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    const attrs = lines[0]!.attributes;
    const keys = attrs.map((a) => a.key);

    expect(keys).toContain(BUNDLE_ATTRIBUTES.bundleParent);
    expect(keys).toContain(BUNDLE_ATTRIBUTES.bundleProductId);
    expect(keys).toContain(BUNDLE_ATTRIBUTES.componentIndex);
    expect(keys).toContain(BUNDLE_ATTRIBUTES.totalComponents);
    expect(keys).toContain(BUNDLE_ATTRIBUTES.componentProductId);
  });

  it('sets correct bundle product ID in attributes', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    const bundleIdAttr = lines[0]!.attributes.find(
      (a) => a.key === BUNDLE_ATTRIBUTES.bundleProductId,
    );
    expect(bundleIdAttr!.value).toBe('gid://shopify/Product/100');
  });

  it('sets correct component indices', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    const index0 = lines[0]!.attributes.find(
      (a) => a.key === BUNDLE_ATTRIBUTES.componentIndex,
    );
    const index1 = lines[1]!.attributes.find(
      (a) => a.key === BUNDLE_ATTRIBUTES.componentIndex,
    );

    expect(index0!.value).toBe('0');
    expect(index1!.value).toBe('1');
  });

  it('sets total components count', () => {
    const input: AddBundleInput = { bundleId: 'gid://shopify/Product/100' };
    const lines = buildBundleCartLines(fixedBundle, input);

    const total = lines[0]!.attributes.find(
      (a) => a.key === BUNDLE_ATTRIBUTES.totalComponents,
    );
    expect(total!.value).toBe('2');
  });

  it('uses selected components for mix-and-match', () => {
    const input: AddBundleInput = {
      bundleId: 'gid://shopify/Product/100',
      selectedComponents: [
        { productId: 'p1', variantId: 'v1', quantity: 3 },
      ],
    };
    const lines = buildBundleCartLines(fixedBundle, input);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.merchandiseId).toBe('v1');
    expect(lines[0]!.quantity).toBe(3);
  });

  it('adds custom attributes when provided', () => {
    const input: AddBundleInput = {
      bundleId: 'gid://shopify/Product/100',
      customAttributes: { gift_note: 'Happy Birthday!' },
    };
    const lines = buildBundleCartLines(fixedBundle, input);

    const giftNote = lines[0]!.attributes.find((a) => a.key === 'gift_note');
    expect(giftNote!.value).toBe('Happy Birthday!');
  });
});

// ---------------------------------------------------------------------------
// isBundleLine
// ---------------------------------------------------------------------------

describe('isBundleLine', () => {
  it('returns true for bundle lines', () => {
    const line = {
      attributes: [
        { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
        { key: BUNDLE_ATTRIBUTES.bundleProductId, value: 'gid://shopify/Product/100' },
      ],
    };
    expect(isBundleLine(line)).toBe(true);
  });

  it('returns false for non-bundle lines', () => {
    const line = {
      attributes: [{ key: 'color', value: 'blue' }],
    };
    expect(isBundleLine(line)).toBe(false);
  });

  it('returns false for empty attributes', () => {
    const line = { attributes: [] };
    expect(isBundleLine(line)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getBundleInfoFromLine
// ---------------------------------------------------------------------------

describe('getBundleInfoFromLine', () => {
  it('extracts bundle info from line attributes', () => {
    const line = {
      attributes: [
        { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
        { key: BUNDLE_ATTRIBUTES.bundleProductId, value: 'gid://shopify/Product/100' },
        { key: BUNDLE_ATTRIBUTES.componentIndex, value: '0' },
      ],
    };
    const info = getBundleInfoFromLine(line);

    expect(info._bundleParent).toBe('true');
    expect(info._bundleProductId).toBe('gid://shopify/Product/100');
    expect(info._bundleComponentIndex).toBe('0');
  });

  it('returns empty object for non-bundle lines', () => {
    const line = { attributes: [{ key: 'color', value: 'blue' }] };
    const info = getBundleInfoFromLine(line);

    expect(info._bundleParent).toBeUndefined();
    expect(info._bundleProductId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// groupCartLinesByBundle
// ---------------------------------------------------------------------------

describe('groupCartLinesByBundle', () => {
  it('groups bundle lines by bundle product ID', () => {
    const lines = [
      {
        id: 'line-1',
        quantity: 2,
        attributes: [
          { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
          { key: BUNDLE_ATTRIBUTES.bundleProductId, value: 'bundle-A' },
        ],
        merchandise: { id: 'v1', title: 'Variant 1', product: { title: 'Product 1' } },
      },
      {
        id: 'line-2',
        quantity: 1,
        attributes: [
          { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
          { key: BUNDLE_ATTRIBUTES.bundleProductId, value: 'bundle-A' },
        ],
        merchandise: { id: 'v2', title: 'Variant 2', product: { title: 'Product 2' } },
      },
      {
        id: 'line-3',
        quantity: 1,
        attributes: [
          { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
          { key: BUNDLE_ATTRIBUTES.bundleProductId, value: 'bundle-B' },
        ],
        merchandise: { id: 'v3', title: 'Variant 3', product: { title: 'Product 3' } },
      },
    ];

    const groups = groupCartLinesByBundle(lines);

    expect(groups.size).toBe(2);
    expect(groups.get('bundle-A')!.lines).toHaveLength(2);
    expect(groups.get('bundle-B')!.lines).toHaveLength(1);
  });

  it('skips non-bundle lines', () => {
    const lines = [
      {
        id: 'line-1',
        quantity: 1,
        attributes: [{ key: 'color', value: 'blue' }],
        merchandise: { id: 'v1', title: 'V1', product: { title: 'P1' } },
      },
    ];

    const groups = groupCartLinesByBundle(lines);
    expect(groups.size).toBe(0);
  });

  it('handles empty lines array', () => {
    const groups = groupCartLinesByBundle([]);
    expect(groups.size).toBe(0);
  });
});
