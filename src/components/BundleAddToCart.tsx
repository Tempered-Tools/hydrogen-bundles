/**
 * BundleAddToCart
 *
 * Smart add-to-cart button for bundles with loading and error states.
 */

import { useCallback, useState } from 'react';

import type { BundleDefinition, BundleSelection } from '../types.js';
import { useBundleConfig } from './BundleProvider.js';
import { useBundleCart } from '../hooks/useBundleCart.js';

export interface BundleAddToCartProps {
  /** Bundle definition */
  definition: BundleDefinition;
  /** Selected components for mix-and-match bundles */
  selectedComponents?: BundleSelection[];
  /** Quantity to add (default: 1) */
  quantity?: number;
  /** Current cart ID */
  cartId?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button text (default: "Add Bundle to Cart") */
  text?: string;
  /** Loading text (default: "Adding...") */
  loadingText?: string;
  /** Callback on successful add */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Custom attributes to add to cart lines */
  customAttributes?: Record<string, string>;
}

/**
 * Add-to-cart button for bundles
 *
 * @example
 * ```tsx
 * <BundleAddToCart
 *   definition={definition}
 *   selectedComponents={selections}
 *   cartId={cart.id}
 *   onSuccess={() => {
 *     showToast('Bundle added to cart!');
 *   }}
 * />
 * ```
 */
export function BundleAddToCart({
  definition,
  selectedComponents,
  quantity = 1,
  cartId,
  disabled = false,
  text = 'Add Bundle to Cart',
  loadingText = 'Adding...',
  onSuccess,
  onError,
  className = '',
  customAttributes,
}: BundleAddToCartProps) {
  const config = useBundleConfig();
  const [localError, setLocalError] = useState<string | undefined>();

  const { addBundle, isAdding, error, clearError } = useBundleCart({
    config,
    cartId,
    onSuccess: () => {
      setLocalError(undefined);
      onSuccess?.();
    },
    onError: (err) => {
      setLocalError(err);
      onError?.(err);
    },
  });

  const handleClick = useCallback(async () => {
    clearError();
    setLocalError(undefined);

    await addBundle(definition, {
      selectedComponents,
      quantity,
      customAttributes,
    });
  }, [
    addBundle,
    clearError,
    definition,
    selectedComponents,
    quantity,
    customAttributes,
  ]);

  const displayError = localError ?? error;
  const isDisabled = disabled || isAdding || !definition.availableForSale;

  // Check if mix-and-match selection is complete
  const isSelectionIncomplete =
    definition.bundleType === 'mix_and_match' &&
    definition.minSelections &&
    (!selectedComponents ||
      selectedComponents.reduce((sum, s) => sum + s.quantity, 0) <
        definition.minSelections);

  return (
    <div className={`bundle-add-to-cart ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled || !!isSelectionIncomplete}
        aria-busy={isAdding}
        className="bundle-add-to-cart__button"
      >
        {isAdding ? loadingText : text}
      </button>

      {displayError && (
        <p className="bundle-add-to-cart__error" role="alert">
          {displayError}
        </p>
      )}

      {isSelectionIncomplete && !displayError && (
        <p className="bundle-add-to-cart__hint">
          Please select {definition.minSelections} items to continue.
        </p>
      )}

      <style>{`
        .bundle-add-to-cart__button {
          width: 100%;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background-color: #1a1a1a;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .bundle-add-to-cart__button:hover:not(:disabled) {
          background-color: #333;
        }

        .bundle-add-to-cart__button:disabled {
          background-color: #999;
          cursor: not-allowed;
        }

        .bundle-add-to-cart__button[aria-busy="true"] {
          opacity: 0.7;
        }

        .bundle-add-to-cart__error {
          margin-top: 0.5rem;
          padding: 0.5rem;
          font-size: 0.875rem;
          color: #dc2626;
          background-color: #fef2f2;
          border-radius: 0.25rem;
        }

        .bundle-add-to-cart__hint {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}
