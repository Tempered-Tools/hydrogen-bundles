/**
 * Error handling utilities for BundleBridge
 */

import { DEFAULT_ERROR_MESSAGES } from './constants.js';

/**
 * BundleBridge error class
 */
export class BundleBridgeError extends Error {
  code: string;
  componentId?: string;
  variantId?: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: {
      componentId?: string;
      variantId?: string;
      [key: string]: unknown;
    },
  ) {
    super(message);
    this.name = 'BundleBridgeError';
    this.code = code;
    this.componentId = details?.componentId;
    this.variantId = details?.variantId;
    this.details = details;
  }
}

/**
 * Error codes
 */
export const ERROR_CODES = {
  BUNDLE_NOT_FOUND: 'BUNDLE_NOT_FOUND',
  COMPONENT_OUT_OF_STOCK: 'COMPONENT_OUT_OF_STOCK',
  INVALID_SELECTION: 'INVALID_SELECTION',
  SELECTION_INCOMPLETE: 'SELECTION_INCOMPLETE',
  CART_ERROR: 'CART_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  PROVIDER_MISSING: 'PROVIDER_MISSING',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Create a standardized error
 */
export function createError(
  code: ErrorCode,
  customMessage?: string,
  details?: {
    componentId?: string;
    variantId?: string;
    [key: string]: unknown;
  },
): BundleBridgeError {
  const defaultMessages: Record<ErrorCode, string> = {
    [ERROR_CODES.BUNDLE_NOT_FOUND]: DEFAULT_ERROR_MESSAGES.bundleNotFound,
    [ERROR_CODES.COMPONENT_OUT_OF_STOCK]: DEFAULT_ERROR_MESSAGES.componentOutOfStock,
    [ERROR_CODES.INVALID_SELECTION]: DEFAULT_ERROR_MESSAGES.invalidSelection,
    [ERROR_CODES.SELECTION_INCOMPLETE]: DEFAULT_ERROR_MESSAGES.selectionIncomplete,
    [ERROR_CODES.CART_ERROR]: DEFAULT_ERROR_MESSAGES.cartError,
    [ERROR_CODES.NETWORK_ERROR]: DEFAULT_ERROR_MESSAGES.network,
    [ERROR_CODES.RATE_LIMITED]: DEFAULT_ERROR_MESSAGES.rateLimited,
    [ERROR_CODES.INVALID_CONFIG]: DEFAULT_ERROR_MESSAGES.invalidConfig,
    [ERROR_CODES.PROVIDER_MISSING]: DEFAULT_ERROR_MESSAGES.providerMissing,
    [ERROR_CODES.UNKNOWN_ERROR]: DEFAULT_ERROR_MESSAGES.unknown,
  };

  return new BundleBridgeError(
    code,
    customMessage ?? defaultMessages[code],
    details,
  );
}

/**
 * Parse API error response into a standardized error
 */
export function parseApiError(
  response: {
    status: number;
    error?: string;
    code?: string;
    details?: Record<string, unknown>;
  },
): BundleBridgeError {
  if (response.status === 404) {
    return createError(ERROR_CODES.BUNDLE_NOT_FOUND, response.error);
  }

  if (response.status === 429) {
    return createError(ERROR_CODES.RATE_LIMITED, response.error);
  }

  if (response.code === 'COMPONENT_OUT_OF_STOCK') {
    return createError(
      ERROR_CODES.COMPONENT_OUT_OF_STOCK,
      response.error,
      response.details,
    );
  }

  if (response.code === 'INVALID_SELECTION') {
    return createError(
      ERROR_CODES.INVALID_SELECTION,
      response.error,
      response.details,
    );
  }

  return createError(ERROR_CODES.UNKNOWN_ERROR, response.error);
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof BundleBridgeError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return DEFAULT_ERROR_MESSAGES.network;
    }
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGES.unknown;
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof BundleBridgeError && error.code === code;
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  if (!(error instanceof BundleBridgeError)) return false;

  const recoverableCodes: ErrorCode[] = [
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.RATE_LIMITED,
    ERROR_CODES.CART_ERROR,
  ];

  return recoverableCodes.includes(error.code as ErrorCode);
}
