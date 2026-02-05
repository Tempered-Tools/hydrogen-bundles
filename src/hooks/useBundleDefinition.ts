/**
 * useBundleDefinition hook
 *
 * Fetches and caches bundle definitions for use in components.
 */

import { useCallback, useEffect, useState } from 'react';

import type { BundleDefinition, BundleBridgeConfig } from '../types.js';
import { resolveBundle } from '../sdk/resolveBundle.js';
import { getUserMessage } from '../utils/errors.js';

export interface UseBundleDefinitionOptions {
  /** Bundle product ID or handle */
  bundleId: string;
  /** BundleBridge configuration */
  config: BundleBridgeConfig;
  /** Skip initial fetch (for SSR with pre-loaded data) */
  skip?: boolean;
  /** Pre-loaded definition (from SSR) */
  initialData?: BundleDefinition;
}

export interface UseBundleDefinitionReturn {
  /** Bundle definition */
  definition: BundleDefinition | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | undefined;
  /** Refetch the definition */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage bundle definition
 *
 * @example
 * ```tsx
 * const { definition, isLoading, error } = useBundleDefinition({
 *   bundleId: 'gid://shopify/Product/123',
 *   config,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * if (!definition) return null;
 *
 * return <BundleProduct definition={definition} />;
 * ```
 */
export function useBundleDefinition({
  bundleId,
  config,
  skip = false,
  initialData,
}: UseBundleDefinitionOptions): UseBundleDefinitionReturn {
  const [definition, setDefinition] = useState<BundleDefinition | null>(
    initialData ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialData && !skip);
  const [error, setError] = useState<string | undefined>();

  const fetchDefinition = useCallback(async () => {
    if (!bundleId) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const result = await resolveBundle(bundleId, config);
      setDefinition(result);
    } catch (err) {
      setError(getUserMessage(err));
      setDefinition(null);
    } finally {
      setIsLoading(false);
    }
  }, [bundleId, config]);

  useEffect(() => {
    if (skip || initialData) return;
    fetchDefinition();
  }, [skip, initialData, fetchDefinition]);

  const refetch = useCallback(async () => {
    // Force refetch by skipping cache
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await resolveBundle(bundleId, config, { skipCache: true });
      setDefinition(result);
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [bundleId, config]);

  return {
    definition,
    isLoading,
    error,
    refetch,
  };
}
