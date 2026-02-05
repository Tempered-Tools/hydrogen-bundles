/**
 * Bundle resolution functions
 *
 * Resolves bundle definitions either from the hosted backend (with API key)
 * or directly from the Storefront API.
 */

import type {
  BundleBridgeConfig,
  BundleComponent,
  BundleDefinition,
  BundleDiscountType,
  BundleType,
  Money,
} from '../types.js';
import { BUNDLE_PRODUCT_QUERY, BUNDLE_PRODUCT_BY_HANDLE_QUERY } from '../graphql/queries.js';
import { API_ENDPOINTS, DEFAULT_API_VERSION } from '../utils/constants.js';
import { cacheDefinition, getCachedDefinition } from '../utils/cache.js';
import { createError, ERROR_CODES, parseApiError } from '../utils/errors.js';
import { isValidGid } from '../utils/validation.js';

/**
 * Resolve bundle definition from hosted backend
 */
async function resolveFromBackend(
  bundleId: string,
  config: BundleBridgeConfig,
): Promise<BundleDefinition> {
  const url = `${config.apiUrl}${API_ENDPOINTS.bundle}/${encodeURIComponent(bundleId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey!,
      'X-Shop-Domain': config.storeDomain,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw parseApiError({ status: response.status, ...error });
  }

  const data = await response.json();
  return data.bundle as BundleDefinition;
}

/**
 * Parse raw Storefront API response into BundleDefinition
 */
function parseStorefrontResponse(product: {
  id: string;
  title: string;
  handle: string;
  description?: string;
  availableForSale: boolean;
  featuredImage?: {
    url: string;
    altText?: string;
    width?: number;
    height?: number;
  };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      price: Money;
      compareAtPrice?: Money;
      availableForSale: boolean;
      bundleComponents?: {
        nodes: Array<{
          product: {
            id: string;
            title: string;
            handle: string;
            featuredImage?: {
              url: string;
              altText?: string;
              width?: number;
              height?: number;
            };
          };
          variant: {
            id: string;
            title: string;
            sku?: string;
            availableForSale: boolean;
            quantityAvailable?: number;
            price: Money;
            compareAtPrice?: Money;
            image?: {
              url: string;
              altText?: string;
              width?: number;
              height?: number;
            };
            selectedOptions?: Array<{ name: string; value: string }>;
          };
          quantity: number;
        }>;
      };
    }>;
  };
  priceRange?: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange?: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
}): BundleDefinition | null {
  // Find the variant with bundle components
  const bundleVariant = product.variants.nodes.find(
    (v) => v.bundleComponents?.nodes && v.bundleComponents.nodes.length > 0,
  );

  if (!bundleVariant || !bundleVariant.bundleComponents) {
    return null;
  }

  const components: BundleComponent[] = bundleVariant.bundleComponents.nodes.map((bc) => ({
    productId: bc.product.id,
    productTitle: bc.product.title,
    productHandle: bc.product.handle,
    productImage: bc.product.featuredImage,
    variants: [
      {
        id: bc.variant.id,
        title: bc.variant.title,
        price: bc.variant.price,
        compareAtPrice: bc.variant.compareAtPrice,
        sku: bc.variant.sku,
        availableForSale: bc.variant.availableForSale,
        quantityAvailable: bc.variant.quantityAvailable,
        image: bc.variant.image,
        selectedOptions: bc.variant.selectedOptions,
      },
    ],
    defaultVariantId: bc.variant.id,
    quantity: bc.quantity,
    required: true,
  }));

  // Calculate original price (sum of components)
  const originalPriceAmount = components.reduce((sum, comp) => {
    const variant = comp.variants[0]!;
    return sum + parseFloat(variant.price.amount) * comp.quantity;
  }, 0);

  const bundlePriceAmount = parseFloat(bundleVariant.price.amount);
  const savingsAmount = originalPriceAmount - bundlePriceAmount;
  const savingsPercentage =
    originalPriceAmount > 0 ? (savingsAmount / originalPriceAmount) * 100 : 0;

  // Determine discount type from the pricing difference
  let discountType: BundleDiscountType = 'fixed_amount';
  if (savingsPercentage === Math.round(savingsPercentage)) {
    discountType = 'percentage';
  }

  // Determine bundle type (for now, assume fixed - mix-and-match detection requires backend)
  const bundleType: BundleType = 'fixed';

  const currencyCode = bundleVariant.price.currencyCode;

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description,
    bundleType,
    components,
    pricing: {
      discountType,
      discountValue:
        discountType === 'percentage' ? savingsPercentage : savingsAmount,
      currencyCode,
      originalPrice: {
        amount: originalPriceAmount.toFixed(2),
        currencyCode,
      },
      bundlePrice: bundleVariant.price,
      savings: {
        amount: savingsAmount.toFixed(2),
        currencyCode,
      },
      savingsPercentage,
    },
    featuredImage: product.featuredImage,
    availableForSale: product.availableForSale,
    variantId: bundleVariant.id,
  };
}

/**
 * Resolve bundle definition from Storefront API directly
 */
async function resolveFromStorefrontApi(
  bundleId: string,
  config: BundleBridgeConfig,
): Promise<BundleDefinition> {
  if (!config.storefrontAccessToken) {
    throw createError(
      ERROR_CODES.INVALID_CONFIG,
      'storefrontAccessToken is required when not using hosted backend',
    );
  }

  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const isGid = isValidGid(bundleId);

  const query = isGid ? BUNDLE_PRODUCT_QUERY : BUNDLE_PRODUCT_BY_HANDLE_QUERY;
  const variables = isGid ? { id: bundleId } : { handle: bundleId };

  const url = `https://${config.storeDomain}/api/${apiVersion}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw createError(ERROR_CODES.NETWORK_ERROR, `Storefront API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw createError(ERROR_CODES.UNKNOWN_ERROR, data.errors[0]?.message ?? 'GraphQL error');
  }

  const product = data.data?.product;

  if (!product) {
    throw createError(ERROR_CODES.BUNDLE_NOT_FOUND);
  }

  const definition = parseStorefrontResponse(product);

  if (!definition) {
    throw createError(ERROR_CODES.BUNDLE_NOT_FOUND, 'Product is not a bundle');
  }

  return definition;
}

/**
 * Resolve a bundle definition
 *
 * If an API key is configured, uses the hosted backend for resolution.
 * Otherwise, queries the Storefront API directly.
 *
 * @param bundleId - Shopify product ID or handle
 * @param config - BundleBridge configuration
 * @param options - Optional settings
 */
export async function resolveBundle(
  bundleId: string,
  config: BundleBridgeConfig,
  options?: {
    /** Skip cache and fetch fresh data */
    skipCache?: boolean;
  },
): Promise<BundleDefinition> {
  // Check cache first (unless skipCache is true)
  if (config.enableCache !== false && !options?.skipCache) {
    const cached = getCachedDefinition(bundleId);
    if (cached) {
      return cached;
    }
  }

  // Resolve from backend or Storefront API
  let definition: BundleDefinition;

  if (config.apiKey && config.apiUrl) {
    definition = await resolveFromBackend(bundleId, config);
  } else {
    definition = await resolveFromStorefrontApi(bundleId, config);
  }

  // Cache the result
  if (config.enableCache !== false) {
    const ttl = config.cacheTtl ? config.cacheTtl * 1000 : undefined;
    cacheDefinition(bundleId, definition, ttl);
  }

  return definition;
}

/**
 * Check if a product ID refers to a bundle
 */
export async function isBundle(
  productId: string,
  config: BundleBridgeConfig,
): Promise<boolean> {
  try {
    const definition = await resolveBundle(productId, config);
    return definition !== null;
  } catch {
    return false;
  }
}
