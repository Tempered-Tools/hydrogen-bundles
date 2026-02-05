/**
 * Inventory checking functions
 *
 * Aggregates inventory across all bundle components to determine
 * overall bundle availability.
 */

import type {
  BundleBridgeConfig,
  BundleDefinition,
  BundleInventory,
  BundleSelection,
  ComponentInventory,
  AvailabilityStatus,
} from '../types.js';
import { VARIANTS_INVENTORY_QUERY } from '../graphql/queries.js';
import { API_ENDPOINTS, DEFAULT_API_VERSION } from '../utils/constants.js';
import { cacheInventory, getCachedInventory } from '../utils/cache.js';
import { createError, ERROR_CODES, parseApiError } from '../utils/errors.js';

/**
 * Low stock threshold (configurable)
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Determine availability status from quantity
 */
function getAvailabilityStatus(
  availableForSale: boolean,
  quantityAvailable?: number,
): AvailabilityStatus {
  if (!availableForSale) {
    return 'out_of_stock';
  }

  if (quantityAvailable === undefined) {
    return 'available';
  }

  if (quantityAvailable === 0) {
    return 'out_of_stock';
  }

  if (quantityAvailable <= LOW_STOCK_THRESHOLD) {
    return 'limited';
  }

  return 'available';
}

/**
 * Check inventory via hosted backend
 */
async function checkInventoryFromBackend(
  bundleId: string,
  config: BundleBridgeConfig,
  selectedComponents?: BundleSelection[],
): Promise<BundleInventory> {
  const url = `${config.apiUrl}${API_ENDPOINTS.inventory.replace(':productId', encodeURIComponent(bundleId))}`;

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
  return data.inventory as BundleInventory;
}

/**
 * Check inventory via Storefront API
 */
async function checkInventoryFromStorefrontApi(
  definition: BundleDefinition,
  config: BundleBridgeConfig,
  selectedComponents?: BundleSelection[],
): Promise<BundleInventory> {
  if (!config.storefrontAccessToken) {
    throw createError(
      ERROR_CODES.INVALID_CONFIG,
      'storefrontAccessToken is required when not using hosted backend',
    );
  }

  // Determine which variants to check
  let variantsToCheck: Array<{ productId: string; variantId: string; quantity: number }>;

  if (selectedComponents && selectedComponents.length > 0) {
    // Mix-and-match: use customer selections
    variantsToCheck = selectedComponents.map((s) => ({
      productId: s.productId,
      variantId: s.variantId,
      quantity: s.quantity,
    }));
  } else {
    // Fixed bundle: use default variants from definition
    variantsToCheck = definition.components.map((c) => ({
      productId: c.productId,
      variantId: c.defaultVariantId ?? c.variants[0]!.id,
      quantity: c.quantity,
    }));
  }

  // Query variant inventory
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const url = `https://${config.storeDomain}/api/${apiVersion}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
    },
    body: JSON.stringify({
      query: VARIANTS_INVENTORY_QUERY,
      variables: { ids: variantsToCheck.map((v) => v.variantId) },
    }),
  });

  if (!response.ok) {
    throw createError(ERROR_CODES.NETWORK_ERROR, `Storefront API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw createError(ERROR_CODES.UNKNOWN_ERROR, data.errors[0]?.message ?? 'GraphQL error');
  }

  // Build component inventory results
  const components: ComponentInventory[] = [];
  let minMaxQuantity = Infinity;
  let limitingComponent: ComponentInventory | undefined;

  for (const check of variantsToCheck) {
    const variant = data.data?.nodes?.find(
      (n: { id: string }) => n?.id === check.variantId,
    );

    const availableForSale = variant?.availableForSale ?? false;
    const quantityAvailable = variant?.quantityAvailable;

    const status = getAvailabilityStatus(availableForSale, quantityAvailable);

    // Calculate max addable quantity for this component
    let maxAddable: number | undefined;
    if (quantityAvailable !== undefined && check.quantity > 0) {
      maxAddable = Math.floor(quantityAvailable / check.quantity);
    }

    const componentInventory: ComponentInventory = {
      productId: check.productId,
      variantId: check.variantId,
      status,
      quantityAvailable,
      maxAddable,
    };

    components.push(componentInventory);

    // Track the limiting component
    if (maxAddable !== undefined && maxAddable < minMaxQuantity) {
      minMaxQuantity = maxAddable;
      limitingComponent = componentInventory;
    }
  }

  // Determine overall bundle availability
  const hasOutOfStock = components.some((c) => c.status === 'out_of_stock');
  const hasLimited = components.some((c) => c.status === 'limited');

  let overallStatus: AvailabilityStatus;
  if (hasOutOfStock) {
    overallStatus = 'out_of_stock';
  } else if (hasLimited) {
    overallStatus = 'limited';
  } else {
    overallStatus = 'available';
  }

  return {
    available: !hasOutOfStock,
    status: overallStatus,
    maxQuantity: minMaxQuantity === Infinity ? 99 : minMaxQuantity,
    limitingComponent: hasOutOfStock || hasLimited ? limitingComponent : undefined,
    components,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Check inventory for a bundle
 *
 * Aggregates inventory across all components to determine:
 * - Whether the bundle can be added to cart
 * - Maximum quantity purchasable
 * - Which component is limiting availability
 *
 * @param bundleIdOrDefinition - Bundle ID or pre-fetched definition
 * @param config - BundleBridge configuration
 * @param options - Optional settings
 */
export async function checkBundleInventory(
  bundleIdOrDefinition: string | BundleDefinition,
  config: BundleBridgeConfig,
  options?: {
    /** Selected components for mix-and-match bundles */
    selectedComponents?: BundleSelection[];
    /** Skip cache and fetch fresh data */
    skipCache?: boolean;
  },
): Promise<BundleInventory> {
  const bundleId =
    typeof bundleIdOrDefinition === 'string'
      ? bundleIdOrDefinition
      : bundleIdOrDefinition.id;

  // Check cache first
  if (!options?.skipCache) {
    const cached = getCachedInventory(
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

  let inventory: BundleInventory;

  if (config.apiKey && config.apiUrl) {
    // Use hosted backend
    inventory = await checkInventoryFromBackend(
      bundleId,
      config,
      options?.selectedComponents,
    );
  } else {
    // Use Storefront API directly (requires definition)
    let definition: BundleDefinition;
    if (typeof bundleIdOrDefinition === 'string') {
      // Need to import dynamically to avoid circular dependency
      const { resolveBundle } = await import('./resolveBundle.js');
      definition = await resolveBundle(bundleIdOrDefinition, config);
    } else {
      definition = bundleIdOrDefinition;
    }

    inventory = await checkInventoryFromStorefrontApi(
      definition,
      config,
      options?.selectedComponents,
    );
  }

  // Cache the result
  cacheInventory(
    bundleId,
    inventory,
    options?.selectedComponents?.map((s) => ({
      variantId: s.variantId,
      quantity: s.quantity,
    })),
  );

  return inventory;
}

/**
 * Check if a bundle is available for purchase
 */
export async function isBundleAvailable(
  bundleIdOrDefinition: string | BundleDefinition,
  config: BundleBridgeConfig,
  selectedComponents?: BundleSelection[],
): Promise<boolean> {
  const inventory = await checkBundleInventory(bundleIdOrDefinition, config, {
    selectedComponents,
  });
  return inventory.available;
}
