/**
 * useBundleInventory hook
 *
 * Checks inventory for all bundle components and returns aggregate availability.
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  BundleDefinition,
  BundleBridgeConfig,
  BundleInventory,
  BundleSelection,
} from '../types.js';
import { checkBundleInventory } from '../sdk/checkInventory.js';
import { getUserMessage } from '../utils/errors.js';

export interface UseBundleInventoryOptions {
  /** Bundle definition (from useBundleDefinition) */
  definition: BundleDefinition | null;
  /** BundleBridge configuration */
  config: BundleBridgeConfig;
  /** Selected components for mix-and-match bundles */
  selectedComponents?: BundleSelection[];
  /** Skip initial fetch */
  skip?: boolean;
}

export interface UseBundleInventoryReturn {
  /** Inventory data */
  inventory: BundleInventory | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | undefined;
  /** Whether the bundle is available for purchase */
  isAvailable: boolean;
  /** Maximum purchasable quantity */
  maxQuantity: number;
  /** Refetch inventory */
  refetch: () => Promise<void>;
}

/**
 * Hook to check bundle inventory
 *
 * @example
 * ```tsx
 * const { definition } = useBundleDefinition({ bundleId, config });
 * const { isAvailable, maxQuantity, inventory } = useBundleInventory({
 *   definition,
 *   config,
 *   selectedComponents, // For mix-and-match
 * });
 *
 * if (!isAvailable) {
 *   return <OutOfStock limitingComponent={inventory?.limitingComponent} />;
 * }
 * ```
 */
export function useBundleInventory({
  definition,
  config,
  selectedComponents,
  skip = false,
}: UseBundleInventoryOptions): UseBundleInventoryReturn {
  const [inventory, setInventory] = useState<BundleInventory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const fetchInventory = useCallback(async () => {
    if (!definition) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await checkBundleInventory(definition, config, {
        selectedComponents,
      });
      setInventory(result);
    } catch (err) {
      setError(getUserMessage(err));
      setInventory(null);
    } finally {
      setIsLoading(false);
    }
  }, [definition, config, selectedComponents]);

  // Refetch when definition or selections change
  useEffect(() => {
    if (skip || !definition) return;
    fetchInventory();
  }, [skip, definition, fetchInventory]);

  const refetch = useCallback(async () => {
    if (!definition) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await checkBundleInventory(definition, config, {
        selectedComponents,
        skipCache: true,
      });
      setInventory(result);
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [definition, config, selectedComponents]);

  return {
    inventory,
    isLoading,
    error,
    isAvailable: inventory?.available ?? false,
    maxQuantity: inventory?.maxQuantity ?? 0,
    refetch,
  };
}
