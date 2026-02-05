/**
 * @tempered/hydrogen-bundles types
 *
 * Types for Shopify bundle cart resolution in Hydrogen storefronts.
 */

/**
 * Bundle type - fixed bundles have preset components, mix-and-match allow customer selection
 */
export type BundleType = 'fixed' | 'mix_and_match';

/**
 * Bundle discount type
 */
export type BundleDiscountType =
  | 'percentage' // e.g., 15% off total
  | 'fixed_amount' // e.g., $10 off
  | 'fixed_price' // e.g., $49.99 total
  | 'custom'; // Component-level custom pricing

/**
 * Availability status for inventory checking
 */
export type AvailabilityStatus =
  | 'available'
  | 'limited' // Low stock
  | 'out_of_stock'
  | 'preorder';

/**
 * Money amount with currency
 */
export interface Money {
  amount: string;
  currencyCode: string;
}

/**
 * Product image
 */
export interface ProductImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

/**
 * Bundle component variant
 */
export interface BundleComponentVariant {
  id: string;
  title: string;
  price: Money;
  compareAtPrice?: Money;
  sku?: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  image?: ProductImage;
  selectedOptions?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Bundle component (a product within the bundle)
 */
export interface BundleComponent {
  /** Shopify product GID */
  productId: string;
  productTitle: string;
  productHandle: string;
  productImage?: ProductImage;
  /** Available variants for this component */
  variants: BundleComponentVariant[];
  /** Default variant ID (for fixed bundles) */
  defaultVariantId?: string;
  /** Required quantity of this component */
  quantity: number;
  /** Whether customer can select quantity (for mix-and-match) */
  allowQuantitySelection?: boolean;
  /** Min quantity if selectable */
  minQuantity?: number;
  /** Max quantity if selectable */
  maxQuantity?: number;
  /** Whether this component is required */
  required?: boolean;
  /** Component-level price override */
  priceOverride?: Money;
}

/**
 * Bundle pricing configuration
 */
export interface BundlePricing {
  /** Discount type */
  discountType: BundleDiscountType;
  /** Discount value (percentage, fixed amount, or total price) */
  discountValue?: number;
  /** Currency code for fixed amounts */
  currencyCode?: string;
  /** Original price (sum of components at regular price) */
  originalPrice?: Money;
  /** Final bundle price after discount */
  bundlePrice?: Money;
  /** Savings amount */
  savings?: Money;
  /** Savings percentage */
  savingsPercentage?: number;
}

/**
 * Full bundle definition
 */
export interface BundleDefinition {
  /** Shopify product GID for the bundle */
  id: string;
  /** Bundle title */
  title: string;
  /** Bundle handle */
  handle: string;
  /** Bundle description */
  description?: string;
  /** Bundle type */
  bundleType: BundleType;
  /** Bundle components */
  components: BundleComponent[];
  /** Pricing configuration */
  pricing: BundlePricing;
  /** For mix-and-match: minimum selections required */
  minSelections?: number;
  /** For mix-and-match: maximum selections allowed */
  maxSelections?: number;
  /** Bundle featured image */
  featuredImage?: ProductImage;
  /** Whether the bundle is available for sale */
  availableForSale: boolean;
  /** Shopify variant ID (bundles typically have one variant) */
  variantId?: string;
}

/**
 * Customer selection for mix-and-match bundles
 */
export interface BundleSelection {
  /** Component product ID */
  productId: string;
  /** Selected variant ID */
  variantId: string;
  /** Selected quantity */
  quantity: number;
}

/**
 * Inventory check result for a single component
 */
export interface ComponentInventory {
  productId: string;
  variantId: string;
  status: AvailabilityStatus;
  quantityAvailable?: number;
  /** Max quantity that can be added (considering existing cart) */
  maxAddable?: number;
}

/**
 * Aggregate inventory result for an entire bundle
 */
export interface BundleInventory {
  /** Whether the bundle can be added to cart */
  available: boolean;
  /** Overall status */
  status: AvailabilityStatus;
  /** Maximum quantity of bundles that can be purchased */
  maxQuantity: number;
  /** Component that limits the bundle quantity (lowest stock) */
  limitingComponent?: ComponentInventory;
  /** Per-component inventory */
  components: ComponentInventory[];
  /** Cached at timestamp */
  cachedAt?: string;
}

/**
 * Price calculation result
 */
export interface BundlePriceResult {
  /** Original price (sum of components) */
  originalPrice: Money;
  /** Final bundle price */
  bundlePrice: Money;
  /** Amount saved */
  savings: Money;
  /** Savings as percentage */
  savingsPercentage: number;
  /** Per-component price breakdown */
  componentPrices: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: Money;
    lineTotal: Money;
  }>;
}

/**
 * Cart line item attributes for bundle identification
 */
export interface BundleLineAttributes {
  /** Key to identify this as a bundle line */
  _bundleParent?: string;
  /** Key to identify bundle components */
  _bundleComponentOf?: string;
  /** Bundle product ID */
  _bundleProductId?: string;
  /** Component index within bundle */
  _bundleComponentIndex?: string;
}

/**
 * Cart mutation input for adding a bundle
 */
export interface AddBundleInput {
  /** Bundle product ID */
  bundleId: string;
  /** Selected components (for mix-and-match) */
  selectedComponents?: BundleSelection[];
  /** Quantity of bundles to add */
  quantity?: number;
  /** Existing cart ID */
  cartId?: string;
  /** Custom attributes to add to line items */
  customAttributes?: Record<string, string>;
}

/**
 * Cart mutation result
 */
export interface AddBundleResult {
  success: boolean;
  /** Updated cart */
  cart?: {
    id: string;
    lines: Array<{
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        title: string;
        product: {
          title: string;
        };
      };
      attributes: Array<{
        key: string;
        value: string;
      }>;
    }>;
    cost: {
      totalAmount: Money;
    };
  };
  /** Error if failed */
  error?: string;
  /** Specific component that caused the failure */
  failedComponent?: {
    productId: string;
    variantId: string;
    reason: string;
  };
}

/**
 * BundleBridge API configuration
 */
export interface BundleBridgeConfig {
  /**
   * API base URL for the BundleBridge backend
   * @example "https://bundlebridge.temperedtools.xyz"
   */
  apiUrl?: string;

  /**
   * API key for authentication (enables hosted backend features)
   */
  apiKey?: string;

  /**
   * Shop domain
   * @example "my-store.myshopify.com"
   */
  storeDomain: string;

  /**
   * Storefront API access token (for direct API queries)
   */
  storefrontAccessToken?: string;

  /**
   * Storefront API version
   * @default "2025-01"
   */
  apiVersion?: string;

  /**
   * Enable client-side caching of bundle definitions
   * @default true
   */
  enableCache?: boolean;

  /**
   * Cache TTL in seconds
   * @default 300 (5 minutes)
   */
  cacheTtl?: number;
}

/**
 * Analytics event types
 */
export type BundleEventType =
  | 'view'
  | 'add_to_cart'
  | 'add_to_cart_failure'
  | 'remove_from_cart'
  | 'purchase'
  | 'selection_change';

/**
 * Analytics event payload
 */
export interface BundleAnalyticsEvent {
  eventType: BundleEventType;
  bundleId: string;
  bundleTitle?: string;
  selectedComponents?: BundleSelection[];
  quantity?: number;
  price?: Money;
  error?: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  bundleNotFound: 'Bundle not found.',
  componentOutOfStock: 'One or more bundle components are out of stock.',
  invalidSelection:
    'Invalid component selection. Please select the required items.',
  selectionIncomplete: 'Please complete your bundle selection.',
  cartError: 'Failed to add bundle to cart. Please try again.',
  network: 'Network error. Please check your connection.',
  rateLimited: 'Too many requests. Please wait a moment.',
  invalidConfig: 'Invalid BundleBridge configuration.',
  providerMissing:
    'useBundleContext must be used within a BundleProvider.',
  unknown: 'An unexpected error occurred.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  addedToCart: 'Bundle added to cart.',
  removedFromCart: 'Bundle removed from cart.',
  quantityUpdated: 'Bundle quantity updated.',
} as const;
