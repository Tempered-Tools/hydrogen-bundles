/**
 * BundleBridge constants
 */

/**
 * API endpoints (relative to apiUrl)
 */
export const API_ENDPOINTS = {
  /** Get bundle definition */
  bundle: '/api/v1/bundle',
  /** Check bundle inventory */
  inventory: '/api/v1/bundle/:productId/inventory',
  /** Calculate bundle price */
  price: '/api/v1/bundle/:productId/price',
  /** Track analytics event */
  event: '/api/v1/analytics/event',
} as const;

/**
 * Default Storefront API version
 */
export const DEFAULT_API_VERSION = '2025-01';

/**
 * Cache TTL in milliseconds
 */
export const CACHE_TTL = {
  /** Bundle definition cache (5 minutes) */
  definition: 5 * 60 * 1000,
  /** Inventory cache (30 seconds) */
  inventory: 30 * 1000,
  /** Price cache (1 minute) */
  price: 60 * 1000,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  /** Cached bundle definitions */
  bundleCache: 'bundlebridge_cache',
} as const;

/**
 * Cart line attribute keys for bundle identification
 */
export const BUNDLE_ATTRIBUTES = {
  /** Marks this line as a bundle parent */
  bundleParent: '_bundle_parent',
  /** Marks this line as a component of a bundle */
  bundleComponentOf: '_bundle_component_of',
  /** Bundle product ID */
  bundleProductId: '_bundle_product_id',
  /** Component index */
  componentIndex: '_bundle_component_index',
  /** Component product ID */
  componentProductId: '_bundle_component_product_id',
  /** Total components in bundle */
  totalComponents: '_bundle_total_components',
} as const;

/**
 * Default error messages
 */
export const DEFAULT_ERROR_MESSAGES = {
  bundleNotFound: 'Bundle not found.',
  componentOutOfStock: 'One or more bundle components are out of stock.',
  invalidSelection: 'Invalid component selection. Please select the required items.',
  selectionIncomplete: 'Please complete your bundle selection.',
  cartError: 'Failed to add bundle to cart. Please try again.',
  network: 'Network error. Please check your connection.',
  rateLimited: 'Too many requests. Please wait a moment.',
  invalidConfig: 'Invalid BundleBridge configuration.',
  providerMissing: 'useBundleContext must be used within a BundleProvider.',
  unknown: 'An unexpected error occurred.',
} as const;

/**
 * Default success messages
 */
export const DEFAULT_SUCCESS_MESSAGES = {
  addedToCart: 'Bundle added to cart.',
  removedFromCart: 'Bundle removed from cart.',
  quantityUpdated: 'Bundle quantity updated.',
} as const;

/**
 * Rate limit settings
 */
export const RATE_LIMITS = {
  /** Max requests per minute for bundle resolution */
  bundleResolution: 120,
  /** Max requests per minute for inventory checks */
  inventoryCheck: 60,
  /** Max requests per minute for price calculations */
  priceCalculation: 60,
  /** Max requests per minute for analytics events */
  analyticsEvent: 300,
} as const;
