/**
 * useBundleCart hook
 *
 * Wraps Hydrogen's cart operations with bundle-aware logic.
 */

import { useCallback, useState } from 'react';

import type {
  BundleDefinition,
  BundleBridgeConfig,
  BundleSelection,
  AddBundleResult,
} from '../types.js';
import { addBundleToCart, groupCartLinesByBundle } from '../sdk/buildCartMutation.js';
import { getUserMessage } from '../utils/errors.js';

export interface UseBundleCartOptions {
  /** BundleBridge configuration */
  config: BundleBridgeConfig;
  /** Current cart ID (from Hydrogen's useCart) */
  cartId?: string;
  /** Callback when bundle is added successfully */
  onSuccess?: (result: AddBundleResult) => void;
  /** Callback when adding bundle fails */
  onError?: (error: string) => void;
}

export interface UseBundleCartReturn {
  /** Add a bundle to the cart */
  addBundle: (
    definition: BundleDefinition,
    options?: {
      selectedComponents?: BundleSelection[];
      quantity?: number;
      customAttributes?: Record<string, string>;
    },
  ) => Promise<AddBundleResult>;
  /** Whether an add operation is in progress */
  isAdding: boolean;
  /** Last error message */
  error: string | undefined;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for bundle cart operations
 *
 * @example
 * ```tsx
 * const cart = useCart(); // Hydrogen's cart hook
 * const { addBundle, isAdding, error } = useBundleCart({
 *   config,
 *   cartId: cart.id,
 *   onSuccess: () => {
 *     // Show success toast
 *   },
 * });
 *
 * const handleAddToCart = async () => {
 *   await addBundle(definition, {
 *     selectedComponents,
 *     quantity: 1,
 *   });
 * };
 * ```
 */
export function useBundleCart({
  config,
  cartId,
  onSuccess,
  onError,
}: UseBundleCartOptions): UseBundleCartReturn {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const addBundle = useCallback(
    async (
      definition: BundleDefinition,
      options?: {
        selectedComponents?: BundleSelection[];
        quantity?: number;
        customAttributes?: Record<string, string>;
      },
    ): Promise<AddBundleResult> => {
      setIsAdding(true);
      setError(undefined);

      try {
        const result = await addBundleToCart(definition, config, {
          bundleId: definition.id,
          cartId,
          selectedComponents: options?.selectedComponents,
          quantity: options?.quantity,
          customAttributes: options?.customAttributes,
        });

        if (result.success) {
          onSuccess?.(result);
        } else {
          const errorMsg = result.error ?? 'Failed to add bundle to cart';
          setError(errorMsg);
          onError?.(errorMsg);
        }

        return result;
      } catch (err) {
        const errorMsg = getUserMessage(err);
        setError(errorMsg);
        onError?.(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setIsAdding(false);
      }
    },
    [config, cartId, onSuccess, onError],
  );

  const clearError = useCallback(() => {
    setError(undefined);
  }, []);

  return {
    addBundle,
    isAdding,
    error,
    clearError,
  };
}

/**
 * Utility hook to identify bundle lines in a cart
 *
 * @example
 * ```tsx
 * const cart = useCart();
 * const bundleGroups = useBundleLines(cart.lines);
 *
 * // Render bundle groups differently than regular lines
 * bundleGroups.forEach((group) => {
 *   // Render as a single bundle with collapsed components
 * });
 * ```
 */
export function useBundleLines(
  lines: Array<{
    id: string;
    quantity: number;
    attributes: Array<{ key: string; value: string }>;
    merchandise: {
      id: string;
      title: string;
      product: { title: string };
    };
  }>,
): {
  bundleGroups: Map<
    string,
    {
      bundleProductId: string;
      lines: typeof lines;
    }
  >;
  nonBundleLines: typeof lines;
} {
  const bundleGroups = groupCartLinesByBundle(lines);

  // Get lines that are not part of any bundle
  const bundleLineIds = new Set<string>();
  bundleGroups.forEach((group) => {
    group.lines.forEach((line) => bundleLineIds.add(line.id));
  });

  const nonBundleLines = lines.filter((line) => !bundleLineIds.has(line.id));

  return {
    bundleGroups,
    nonBundleLines,
  };
}
