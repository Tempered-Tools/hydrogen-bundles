/**
 * Client-side caching utilities for BundleBridge
 */

import type { BundleDefinition, BundleInventory, BundlePriceResult } from '../types.js';
import { CACHE_TTL, STORAGE_KEYS } from './constants.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface BundleCache {
  definitions: Record<string, CacheEntry<BundleDefinition>>;
  inventory: Record<string, CacheEntry<BundleInventory>>;
  prices: Record<string, CacheEntry<BundlePriceResult>>;
}

// In-memory cache (survives across renders but not page reloads)
let memoryCache: BundleCache = {
  definitions: {},
  inventory: {},
  prices: {},
};

/**
 * Get item from cache
 */
function getFromCache<T>(
  cache: Record<string, CacheEntry<T>>,
  key: string,
): T | null {
  const entry = cache[key];
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    // Expired, remove from cache
    delete cache[key];
    return null;
  }

  return entry.data;
}

/**
 * Set item in cache
 */
function setInCache<T>(
  cache: Record<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttl: number,
): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl,
  };
}

/**
 * Get cached bundle definition
 */
export function getCachedDefinition(bundleId: string): BundleDefinition | null {
  return getFromCache(memoryCache.definitions, bundleId);
}

/**
 * Cache bundle definition
 */
export function cacheDefinition(
  bundleId: string,
  definition: BundleDefinition,
  ttl = CACHE_TTL.definition,
): void {
  setInCache(memoryCache.definitions, bundleId, definition, ttl);
}

/**
 * Generate cache key for inventory (includes selections hash for mix-and-match)
 */
function getInventoryCacheKey(
  bundleId: string,
  selections?: Array<{ variantId: string; quantity: number }>,
): string {
  if (!selections || selections.length === 0) {
    return bundleId;
  }

  const selectionsHash = selections
    .map((s) => `${s.variantId}:${s.quantity}`)
    .sort()
    .join(',');

  return `${bundleId}|${selectionsHash}`;
}

/**
 * Get cached inventory
 */
export function getCachedInventory(
  bundleId: string,
  selections?: Array<{ variantId: string; quantity: number }>,
): BundleInventory | null {
  const key = getInventoryCacheKey(bundleId, selections);
  return getFromCache(memoryCache.inventory, key);
}

/**
 * Cache inventory
 */
export function cacheInventory(
  bundleId: string,
  inventory: BundleInventory,
  selections?: Array<{ variantId: string; quantity: number }>,
  ttl = CACHE_TTL.inventory,
): void {
  const key = getInventoryCacheKey(bundleId, selections);
  setInCache(memoryCache.inventory, key, inventory, ttl);
}

/**
 * Generate cache key for price (includes selections hash)
 */
function getPriceCacheKey(
  bundleId: string,
  selections?: Array<{ variantId: string; quantity: number }>,
): string {
  if (!selections || selections.length === 0) {
    return bundleId;
  }

  const selectionsHash = selections
    .map((s) => `${s.variantId}:${s.quantity}`)
    .sort()
    .join(',');

  return `${bundleId}|${selectionsHash}`;
}

/**
 * Get cached price
 */
export function getCachedPrice(
  bundleId: string,
  selections?: Array<{ variantId: string; quantity: number }>,
): BundlePriceResult | null {
  const key = getPriceCacheKey(bundleId, selections);
  return getFromCache(memoryCache.prices, key);
}

/**
 * Cache price result
 */
export function cachePrice(
  bundleId: string,
  price: BundlePriceResult,
  selections?: Array<{ variantId: string; quantity: number }>,
  ttl = CACHE_TTL.price,
): void {
  const key = getPriceCacheKey(bundleId, selections);
  setInCache(memoryCache.prices, key, price, ttl);
}

/**
 * Clear all cached data for a specific bundle
 */
export function clearBundleCache(bundleId: string): void {
  delete memoryCache.definitions[bundleId];

  // Clear all inventory and price entries for this bundle
  Object.keys(memoryCache.inventory).forEach((key) => {
    if (key.startsWith(bundleId)) {
      delete memoryCache.inventory[key];
    }
  });

  Object.keys(memoryCache.prices).forEach((key) => {
    if (key.startsWith(bundleId)) {
      delete memoryCache.prices[key];
    }
  });
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  memoryCache = {
    definitions: {},
    inventory: {},
    prices: {},
  };
}

/**
 * Persist cache to localStorage (optional, for offline support)
 */
export function persistCache(): void {
  try {
    if (typeof window === 'undefined') return;

    const serializable = {
      definitions: Object.entries(memoryCache.definitions).reduce(
        (acc, [key, entry]) => {
          const now = Date.now();
          if (now - entry.timestamp <= entry.ttl) {
            acc[key] = entry;
          }
          return acc;
        },
        {} as typeof memoryCache.definitions,
      ),
    };

    localStorage.setItem(STORAGE_KEYS.bundleCache, JSON.stringify(serializable));
  } catch {
    // localStorage may not be available
  }
}

/**
 * Restore cache from localStorage
 */
export function restoreCache(): void {
  try {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEYS.bundleCache);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    const now = Date.now();

    // Restore only non-expired definitions
    if (parsed.definitions) {
      Object.entries(parsed.definitions as typeof memoryCache.definitions).forEach(
        ([key, entry]) => {
          if (now - entry.timestamp <= entry.ttl) {
            memoryCache.definitions[key] = entry;
          }
        },
      );
    }
  } catch {
    // Ignore errors
  }
}
