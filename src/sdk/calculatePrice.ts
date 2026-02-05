/**
 * Bundle price calculation functions
 *
 * Calculates bundle prices including discounts, savings, and per-component breakdowns.
 */

import type {
  BundleBridgeConfig,
  BundleDefinition,
  BundlePriceResult,
  BundleSelection,
  Money,
} from '../types.js';
import { API_ENDPOINTS } from '../utils/constants.js';
import { cachePrice, getCachedPrice } from '../utils/cache.js';
import { parseApiError } from '../utils/errors.js';

/**
 * Calculate price via hosted backend
 */
async function calculatePriceFromBackend(
  bundleId: string,
  config: BundleBridgeConfig,
  selectedComponents?: BundleSelection[],
): Promise<BundlePriceResult> {
  const url = `${config.apiUrl}${API_ENDPOINTS.price.replace(':productId', encodeURIComponent(bundleId))}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey!,
      'X-Shop-Domain': config.storeDomain,
    },
    body: JSON.stringify({ selectedComponents }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw parseApiError({ status: response.status, ...error });
  }

  const data = await response.json();
  return data.price as BundlePriceResult;
}

/**
 * Calculate price from bundle definition
 */
function calculatePriceFromDefinition(
  definition: BundleDefinition,
  selectedComponents?: BundleSelection[],
): BundlePriceResult {
  const currencyCode = definition.pricing.currencyCode ?? 'USD';

  // Build component prices
  const componentPrices: BundlePriceResult['componentPrices'] = [];
  let originalPriceTotal = 0;

  if (selectedComponents && selectedComponents.length > 0) {
    // Mix-and-match: use customer selections
    for (const selection of selectedComponents) {
      const component = definition.components.find((c) => c.productId === selection.productId);
      if (!component) continue;

      const variant = component.variants.find((v) => v.id === selection.variantId);
      if (!variant) continue;

      const unitPrice = parseFloat(variant.price.amount);
      const lineTotal = unitPrice * selection.quantity;
      originalPriceTotal += lineTotal;

      componentPrices.push({
        productId: selection.productId,
        variantId: selection.variantId,
        quantity: selection.quantity,
        unitPrice: variant.price,
        lineTotal: {
          amount: lineTotal.toFixed(2),
          currencyCode,
        },
      });
    }
  } else {
    // Fixed bundle: use default variants from definition
    for (const component of definition.components) {
      const variant = component.variants.find((v) => v.id === component.defaultVariantId) ??
        component.variants[0];
      if (!variant) continue;

      const unitPrice = parseFloat(variant.price.amount);
      const lineTotal = unitPrice * component.quantity;
      originalPriceTotal += lineTotal;

      componentPrices.push({
        productId: component.productId,
        variantId: variant.id,
        quantity: component.quantity,
        unitPrice: variant.price,
        lineTotal: {
          amount: lineTotal.toFixed(2),
          currencyCode,
        },
      });
    }
  }

  // Calculate bundle price based on discount type
  let bundlePriceAmount: number;

  switch (definition.pricing.discountType) {
    case 'percentage': {
      const discountMultiplier = 1 - (definition.pricing.discountValue ?? 0) / 100;
      bundlePriceAmount = originalPriceTotal * discountMultiplier;
      break;
    }
    case 'fixed_amount': {
      bundlePriceAmount = originalPriceTotal - (definition.pricing.discountValue ?? 0);
      break;
    }
    case 'fixed_price': {
      bundlePriceAmount = definition.pricing.discountValue ?? originalPriceTotal;
      break;
    }
    case 'custom':
    default: {
      // For custom pricing, use the pre-calculated bundle price from definition
      bundlePriceAmount = definition.pricing.bundlePrice
        ? parseFloat(definition.pricing.bundlePrice.amount)
        : originalPriceTotal;
      break;
    }
  }

  // Ensure bundle price isn't negative
  bundlePriceAmount = Math.max(0, bundlePriceAmount);

  const savingsAmount = originalPriceTotal - bundlePriceAmount;
  const savingsPercentage =
    originalPriceTotal > 0 ? (savingsAmount / originalPriceTotal) * 100 : 0;

  const originalPrice: Money = {
    amount: originalPriceTotal.toFixed(2),
    currencyCode,
  };

  const bundlePrice: Money = {
    amount: bundlePriceAmount.toFixed(2),
    currencyCode,
  };

  const savings: Money = {
    amount: savingsAmount.toFixed(2),
    currencyCode,
  };

  return {
    originalPrice,
    bundlePrice,
    savings,
    savingsPercentage,
    componentPrices,
  };
}

/**
 * Calculate the price for a bundle
 *
 * For fixed bundles, returns the pre-calculated price.
 * For mix-and-match bundles, calculates dynamically based on selections.
 *
 * @param bundleIdOrDefinition - Bundle ID or pre-fetched definition
 * @param config - BundleBridge configuration
 * @param options - Optional settings
 */
export async function calculateBundlePrice(
  bundleIdOrDefinition: string | BundleDefinition,
  config: BundleBridgeConfig,
  options?: {
    /** Selected components for mix-and-match bundles */
    selectedComponents?: BundleSelection[];
    /** Skip cache */
    skipCache?: boolean;
  },
): Promise<BundlePriceResult> {
  const bundleId =
    typeof bundleIdOrDefinition === 'string'
      ? bundleIdOrDefinition
      : bundleIdOrDefinition.id;

  // Check cache first
  if (!options?.skipCache) {
    const cached = getCachedPrice(
      bundleId,
      options?.selectedComponents?.map((s) => ({
        variantId: s.variantId,
        quantity: s.quantity,
      })),
    );
    if (cached) {
      return cached;
    }
  }

  let priceResult: BundlePriceResult;

  if (config.apiKey && config.apiUrl) {
    // Use hosted backend for authoritative pricing
    priceResult = await calculatePriceFromBackend(
      bundleId,
      config,
      options?.selectedComponents,
    );
  } else {
    // Calculate from definition
    let definition: BundleDefinition;
    if (typeof bundleIdOrDefinition === 'string') {
      const { resolveBundle } = await import('./resolveBundle.js');
      definition = await resolveBundle(bundleIdOrDefinition, config);
    } else {
      definition = bundleIdOrDefinition;
    }

    priceResult = calculatePriceFromDefinition(definition, options?.selectedComponents);
  }

  // Cache the result
  cachePrice(
    bundleId,
    priceResult,
    options?.selectedComponents?.map((s) => ({
      variantId: s.variantId,
      quantity: s.quantity,
    })),
  );

  return priceResult;
}

/**
 * Format money for display
 */
export function formatMoney(money: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

/**
 * Format savings for display
 */
export function formatSavings(
  savings: Money,
  percentage: number,
  locale = 'en-US',
): string {
  const formattedAmount = formatMoney(savings, locale);
  const formattedPercentage = `${Math.round(percentage)}%`;
  return `Save ${formattedAmount} (${formattedPercentage})`;
}
