/**
 * useBundlePrice hook
 *
 * Calculates bundle pricing including discounts and savings.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  BundleDefinition,
  BundleBridgeConfig,
  BundlePriceResult,
  BundleSelection,
} from '../types.js';
import { calculateBundlePrice, formatMoney, formatSavings } from '../sdk/calculatePrice.js';
import { getUserMessage } from '../utils/errors.js';

export interface UseBundlePriceOptions {
  /** Bundle definition (from useBundleDefinition) */
  definition: BundleDefinition | null;
  /** BundleBridge configuration */
  config: BundleBridgeConfig;
  /** Selected components for mix-and-match bundles */
  selectedComponents?: BundleSelection[];
  /** Locale for formatting (default: en-US) */
  locale?: string;
  /** Skip initial calculation */
  skip?: boolean;
}

export interface UseBundlePriceReturn {
  /** Price calculation result */
  priceResult: BundlePriceResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | undefined;
  /** Formatted original price */
  formattedOriginalPrice: string;
  /** Formatted bundle price */
  formattedBundlePrice: string;
  /** Formatted savings */
  formattedSavings: string;
  /** Whether there is a savings */
  hasSavings: boolean;
  /** Recalculate price */
  recalculate: () => Promise<void>;
}

/**
 * Hook to calculate bundle pricing
 *
 * @example
 * ```tsx
 * const { definition } = useBundleDefinition({ bundleId, config });
 * const {
 *   formattedBundlePrice,
 *   formattedSavings,
 *   hasSavings,
 * } = useBundlePrice({
 *   definition,
 *   config,
 *   selectedComponents, // For mix-and-match
 * });
 *
 * return (
 *   <div>
 *     <span className="price">{formattedBundlePrice}</span>
 *     {hasSavings && <span className="savings">{formattedSavings}</span>}
 *   </div>
 * );
 * ```
 */
export function useBundlePrice({
  definition,
  config,
  selectedComponents,
  locale = 'en-US',
  skip = false,
}: UseBundlePriceOptions): UseBundlePriceReturn {
  const [priceResult, setPriceResult] = useState<BundlePriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const calculatePrice = useCallback(async () => {
    if (!definition) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await calculateBundlePrice(definition, config, {
        selectedComponents,
      });
      setPriceResult(result);
    } catch (err) {
      setError(getUserMessage(err));
      setPriceResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [definition, config, selectedComponents]);

  // Recalculate when definition or selections change
  useEffect(() => {
    if (skip || !definition) return;
    calculatePrice();
  }, [skip, definition, calculatePrice]);

  const recalculate = useCallback(async () => {
    if (!definition) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await calculateBundlePrice(definition, config, {
        selectedComponents,
        skipCache: true,
      });
      setPriceResult(result);
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [definition, config, selectedComponents]);

  // Computed values
  const formattedOriginalPrice = useMemo(() => {
    if (!priceResult) return '';
    return formatMoney(priceResult.originalPrice, locale);
  }, [priceResult, locale]);

  const formattedBundlePrice = useMemo(() => {
    if (!priceResult) return '';
    return formatMoney(priceResult.bundlePrice, locale);
  }, [priceResult, locale]);

  const formattedSavings = useMemo(() => {
    if (!priceResult) return '';
    return formatSavings(priceResult.savings, priceResult.savingsPercentage, locale);
  }, [priceResult, locale]);

  const hasSavings = useMemo(() => {
    if (!priceResult) return false;
    return parseFloat(priceResult.savings.amount) > 0;
  }, [priceResult]);

  return {
    priceResult,
    isLoading,
    error,
    formattedOriginalPrice,
    formattedBundlePrice,
    formattedSavings,
    hasSavings,
    recalculate,
  };
}
