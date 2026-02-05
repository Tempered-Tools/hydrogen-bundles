/**
 * BundleProvider
 *
 * Context provider for BundleBridge configuration.
 * Wrap your Hydrogen app with this provider to enable bundle functionality.
 */

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';
import type { BundleBridgeConfig } from '../types.js';
import { DEFAULT_ERROR_MESSAGES } from '../utils/constants.js';
import { restoreCache } from '../utils/cache.js';

interface BundleContextValue {
  config: BundleBridgeConfig;
}

const BundleContext = createContext<BundleContextValue | null>(null);

export interface BundleProviderProps {
  /**
   * BundleBridge configuration
   */
  config: BundleBridgeConfig;

  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Provider component for BundleBridge context.
 *
 * @example
 * ```tsx
 * import { BundleProvider } from '@tempered/hydrogen-bundles';
 *
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
 * ```
 */
export function BundleProvider({ config, children }: BundleProviderProps) {
  // Restore cache from localStorage on mount (client-side only)
  useMemo(() => {
    if (typeof window !== 'undefined') {
      restoreCache();
    }
  }, []);

  const value = useMemo(
    () => ({
      config,
    }),
    [config],
  );

  return (
    <BundleContext.Provider value={value}>{children}</BundleContext.Provider>
  );
}

/**
 * Hook to access BundleBridge configuration.
 * Must be used within a BundleProvider.
 */
export function useBundleConfig(): BundleBridgeConfig {
  const context = useContext(BundleContext);

  if (!context) {
    throw new Error(DEFAULT_ERROR_MESSAGES.providerMissing);
  }

  return context.config;
}

export { BundleContext };
