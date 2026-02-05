/**
 * @tempered/hydrogen-bundles
 *
 * Bundle cart resolution components for Shopify Hydrogen storefronts.
 * Makes Shopify's native Bundles work correctly in headless storefronts.
 *
 * @example
 * ```tsx
 * import {
 *   BundleProvider,
 *   BundleAddToCart,
 *   BundlePicker,
 *   useBundleDefinition,
 *   useBundleCart,
 * } from '@tempered/hydrogen-bundles';
 *
 * // In your root layout
 * export default function App() {
 *   return (
 *     <BundleProvider
 *       config={{
 *         apiUrl: 'https://bundlebridge.temperedtools.xyz',
 *         apiKey: 'bb_live_xxx',
 *         storeDomain: 'my-store.myshopify.com',
 *         storefrontAccessToken: 'xxx',
 *       }}
 *     >
 *       <Outlet />
 *     </BundleProvider>
 *   );
 * }
 *
 * // On a bundle product page
 * export default function BundlePage({ bundleId }) {
 *   const { definition, isLoading } = useBundleDefinition({ bundleId, config });
 *   const [selections, setSelections] = useState([]);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <>
 *       <BundlePicker
 *         definition={definition}
 *         selectedComponents={selections}
 *         onSelectionChange={setSelections}
 *       />
 *       <BundleAddToCart
 *         definition={definition}
 *         selectedComponents={selections}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

// Components
export { BundleProvider, useBundleConfig } from './components/BundleProvider.js';
export { BundleAddToCart } from './components/BundleAddToCart.js';
export { BundlePicker } from './components/BundlePicker.js';
export { BundleLineItem } from './components/BundleLineItem.js';
export { BundleSavings } from './components/BundleSavings.js';

// Hooks
export { useBundleDefinition } from './hooks/useBundleDefinition.js';
export { useBundleInventory } from './hooks/useBundleInventory.js';
export { useBundlePrice } from './hooks/useBundlePrice.js';
export { useBundleCart, useBundleLines } from './hooks/useBundleCart.js';

// SDK Functions
export { resolveBundle, isBundle } from './sdk/resolveBundle.js';
export { checkBundleInventory, isBundleAvailable } from './sdk/checkInventory.js';
export { calculateBundlePrice, formatMoney, formatSavings } from './sdk/calculatePrice.js';
export {
  addBundleToCart,
  buildBundleCartLines,
  isBundleLine,
  getBundleInfoFromLine,
  groupCartLinesByBundle,
} from './sdk/buildCartMutation.js';

// GraphQL (for advanced users)
export * from './graphql/fragments.js';
export * from './graphql/queries.js';
export * from './graphql/mutations.js';

// Utils
export {
  isValidGid,
  extractNumericId,
  isValidConfig,
  validateBundleSelection,
  isBundleProduct,
  sanitizeInput,
  isValidShopDomain,
} from './utils/validation.js';
export {
  clearBundleCache,
  clearAllCache,
  persistCache,
  restoreCache,
} from './utils/cache.js';
export {
  BundleBridgeError,
  ERROR_CODES,
  createError,
  parseApiError,
  getUserMessage,
  isErrorCode,
  isRecoverableError,
} from './utils/errors.js';
export {
  API_ENDPOINTS,
  DEFAULT_API_VERSION,
  CACHE_TTL,
  STORAGE_KEYS,
  BUNDLE_ATTRIBUTES,
  DEFAULT_ERROR_MESSAGES,
  DEFAULT_SUCCESS_MESSAGES,
  RATE_LIMITS,
} from './utils/constants.js';

// Types
export type {
  BundleType,
  BundleDiscountType,
  AvailabilityStatus,
  Money,
  ProductImage,
  BundleComponentVariant,
  BundleComponent,
  BundlePricing,
  BundleDefinition,
  BundleSelection,
  ComponentInventory,
  BundleInventory,
  BundlePriceResult,
  BundleLineAttributes,
  AddBundleInput,
  AddBundleResult,
  BundleBridgeConfig,
  BundleEventType,
  BundleAnalyticsEvent,
} from './types.js';

// Component props types
export type { BundleProviderProps } from './components/BundleProvider.js';
export type { BundleAddToCartProps } from './components/BundleAddToCart.js';
export type { BundlePickerProps } from './components/BundlePicker.js';
export type { BundleLineItemProps } from './components/BundleLineItem.js';
export type { BundleSavingsProps } from './components/BundleSavings.js';

// Hook options and return types
export type {
  UseBundleDefinitionOptions,
  UseBundleDefinitionReturn,
} from './hooks/useBundleDefinition.js';
export type {
  UseBundleInventoryOptions,
  UseBundleInventoryReturn,
} from './hooks/useBundleInventory.js';
export type {
  UseBundlePriceOptions,
  UseBundlePriceReturn,
} from './hooks/useBundlePrice.js';
export type {
  UseBundleCartOptions,
  UseBundleCartReturn,
} from './hooks/useBundleCart.js';
export type { ErrorCode } from './utils/errors.js';
