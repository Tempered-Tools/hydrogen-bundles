/**
 * Validation utilities for BundleBridge
 */

import type {
  BundleDefinition,
  BundleSelection,
  BundleBridgeConfig,
} from '../types.js';

/**
 * Validate a Shopify GID format
 * @example "gid://shopify/Product/123456789"
 */
export function isValidGid(gid: string): boolean {
  if (!gid || typeof gid !== 'string') return false;
  return /^gid:\/\/shopify\/\w+\/\d+$/.test(gid);
}

/**
 * Extract numeric ID from a Shopify GID
 */
export function extractNumericId(gid: string): string | null {
  if (!gid) return null;
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] ?? null : null;
}

/**
 * Validate BundleBridge configuration
 */
export function isValidConfig(config: Partial<BundleBridgeConfig>): config is BundleBridgeConfig {
  if (!config) return false;
  if (!config.storeDomain || typeof config.storeDomain !== 'string') return false;

  // If using hosted backend, apiUrl and apiKey are required
  if (config.apiKey && !config.apiUrl) return false;

  return true;
}

/**
 * Validate bundle selection for mix-and-match bundles
 */
export function validateBundleSelection(
  definition: BundleDefinition,
  selections: BundleSelection[],
): { valid: boolean; error?: string } {
  // For fixed bundles, no selection validation needed
  if (definition.bundleType === 'fixed') {
    return { valid: true };
  }

  // Check minimum selections
  const totalSelections = selections.reduce((sum, s) => sum + s.quantity, 0);

  if (definition.minSelections && totalSelections < definition.minSelections) {
    return {
      valid: false,
      error: `Please select at least ${definition.minSelections} items.`,
    };
  }

  // Check maximum selections
  if (definition.maxSelections && totalSelections > definition.maxSelections) {
    return {
      valid: false,
      error: `You can select at most ${definition.maxSelections} items.`,
    };
  }

  // Validate each selection against available components
  for (const selection of selections) {
    const component = definition.components.find(
      (c) => c.productId === selection.productId,
    );

    if (!component) {
      return {
        valid: false,
        error: `Invalid product selection: ${selection.productId}`,
      };
    }

    const variant = component.variants.find((v) => v.id === selection.variantId);

    if (!variant) {
      return {
        valid: false,
        error: `Invalid variant selection for ${component.productTitle}`,
      };
    }

    // Check quantity constraints
    if (component.allowQuantitySelection) {
      if (component.minQuantity && selection.quantity < component.minQuantity) {
        return {
          valid: false,
          error: `Minimum quantity for ${component.productTitle} is ${component.minQuantity}`,
        };
      }
      if (component.maxQuantity && selection.quantity > component.maxQuantity) {
        return {
          valid: false,
          error: `Maximum quantity for ${component.productTitle} is ${component.maxQuantity}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Check if a product is a bundle based on its structure
 */
export function isBundleProduct(product: {
  variants?: Array<{
    bundleComponents?: unknown[] | null;
  }>;
}): boolean {
  if (!product?.variants?.length) return false;

  // Check if any variant has bundleComponents
  return product.variants.some(
    (v) => v.bundleComponents && Array.isArray(v.bundleComponents) && v.bundleComponents.length > 0,
  );
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, 1000);
}

/**
 * Validate shop domain format
 */
export function isValidShopDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  // Must end with .myshopify.com or be a custom domain
  return /^[\w-]+\.myshopify\.com$/.test(domain) || /^[\w.-]+\.[a-z]{2,}$/.test(domain);
}
