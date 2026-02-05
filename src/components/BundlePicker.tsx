/**
 * BundlePicker
 *
 * Mix-and-match component selector for bundles where customers pick items.
 */

import { useCallback, useMemo } from 'react';

import type { BundleDefinition, BundleComponent, BundleSelection } from '../types.js';
import { formatMoney } from '../sdk/calculatePrice.js';

export interface BundlePickerProps {
  /** Bundle definition */
  definition: BundleDefinition;
  /** Current selections */
  selectedComponents: BundleSelection[];
  /** Callback when selections change */
  onSelectionChange: (selections: BundleSelection[]) => void;
  /** Number of columns in grid (default: 2) */
  columns?: 1 | 2 | 3 | 4;
  /** Show price per component */
  showPrice?: boolean;
  /** Show inventory status */
  showInventory?: boolean;
  /** Locale for price formatting */
  locale?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Mix-and-match bundle picker
 *
 * @example
 * ```tsx
 * const [selections, setSelections] = useState<BundleSelection[]>([]);
 *
 * <BundlePicker
 *   definition={definition}
 *   selectedComponents={selections}
 *   onSelectionChange={setSelections}
 *   columns={3}
 *   showPrice
 * />
 * ```
 */
export function BundlePicker({
  definition,
  selectedComponents,
  onSelectionChange,
  columns = 2,
  showPrice = true,
  showInventory = true,
  locale = 'en-US',
  className = '',
}: BundlePickerProps) {
  // Calculate total selected
  const totalSelected = useMemo(
    () => selectedComponents.reduce((sum, s) => sum + s.quantity, 0),
    [selectedComponents],
  );

  const minSelections = definition.minSelections ?? 0;
  const maxSelections = definition.maxSelections ?? definition.components.length;

  // Check if a component is selected
  const isSelected = useCallback(
    (component: BundleComponent, variantId: string): boolean => {
      return selectedComponents.some(
        (s) => s.productId === component.productId && s.variantId === variantId,
      );
    },
    [selectedComponents],
  );

  // Get selected quantity for a component
  const getSelectedQuantity = useCallback(
    (component: BundleComponent, variantId: string): number => {
      const selection = selectedComponents.find(
        (s) => s.productId === component.productId && s.variantId === variantId,
      );
      return selection?.quantity ?? 0;
    },
    [selectedComponents],
  );

  // Handle selection toggle
  const handleToggle = useCallback(
    (component: BundleComponent, variantId: string) => {
      const selected = isSelected(component, variantId);

      if (selected) {
        // Remove selection
        const newSelections = selectedComponents.filter(
          (s) => !(s.productId === component.productId && s.variantId === variantId),
        );
        onSelectionChange(newSelections);
      } else {
        // Add selection (if within max)
        if (totalSelected >= maxSelections) return;

        const newSelections = [
          ...selectedComponents,
          {
            productId: component.productId,
            variantId,
            quantity: component.quantity,
          },
        ];
        onSelectionChange(newSelections);
      }
    },
    [
      isSelected,
      selectedComponents,
      totalSelected,
      maxSelections,
      onSelectionChange,
    ],
  );

  // Handle quantity change (for components with variable quantity)
  const handleQuantityChange = useCallback(
    (component: BundleComponent, variantId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        // Remove selection
        const newSelections = selectedComponents.filter(
          (s) => !(s.productId === component.productId && s.variantId === variantId),
        );
        onSelectionChange(newSelections);
        return;
      }

      const existing = selectedComponents.find(
        (s) => s.productId === component.productId && s.variantId === variantId,
      );

      if (existing) {
        // Update quantity
        const newSelections = selectedComponents.map((s) =>
          s.productId === component.productId && s.variantId === variantId
            ? { ...s, quantity: newQuantity }
            : s,
        );
        onSelectionChange(newSelections);
      } else {
        // Add new selection
        const newSelections = [
          ...selectedComponents,
          {
            productId: component.productId,
            variantId,
            quantity: newQuantity,
          },
        ];
        onSelectionChange(newSelections);
      }
    },
    [selectedComponents, onSelectionChange],
  );

  return (
    <div className={`bundle-picker ${className}`}>
      <div className="bundle-picker__header">
        <span className="bundle-picker__count">
          {totalSelected} of {minSelections === maxSelections ? minSelections : `${minSelections}-${maxSelections}`} selected
        </span>
        {totalSelected < minSelections && (
          <span className="bundle-picker__required">
            Select {minSelections - totalSelected} more
          </span>
        )}
      </div>

      <div
        className="bundle-picker__grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {definition.components.map((component) => {
          // For simplicity, use the first variant (or default)
          const variant =
            component.variants.find((v) => v.id === component.defaultVariantId) ??
            component.variants[0];

          if (!variant) return null;

          const selected = isSelected(component, variant.id);
          const quantity = getSelectedQuantity(component, variant.id);
          const isOutOfStock = !variant.availableForSale;
          const isLowStock =
            variant.quantityAvailable !== undefined && variant.quantityAvailable <= 5;

          const canSelect = !isOutOfStock && (selected || totalSelected < maxSelections);

          return (
            <button
              key={component.productId}
              type="button"
              onClick={() => handleToggle(component, variant.id)}
              disabled={!canSelect}
              aria-pressed={selected}
              className={`bundle-picker__item ${selected ? 'bundle-picker__item--selected' : ''} ${isOutOfStock ? 'bundle-picker__item--unavailable' : ''}`}
            >
              {component.productImage && (
                <img
                  src={component.productImage.url}
                  alt={component.productImage.altText ?? component.productTitle}
                  className="bundle-picker__image"
                />
              )}

              <div className="bundle-picker__content">
                <h4 className="bundle-picker__title">{component.productTitle}</h4>

                {variant.title !== 'Default Title' && (
                  <p className="bundle-picker__variant">{variant.title}</p>
                )}

                {showPrice && (
                  <p className="bundle-picker__price">
                    {formatMoney(variant.price, locale)}
                  </p>
                )}

                {showInventory && isLowStock && !isOutOfStock && (
                  <p className="bundle-picker__stock bundle-picker__stock--low">
                    Only {variant.quantityAvailable} left
                  </p>
                )}

                {showInventory && isOutOfStock && (
                  <p className="bundle-picker__stock bundle-picker__stock--out">
                    Out of stock
                  </p>
                )}
              </div>

              {selected && (
                <span className="bundle-picker__check" aria-hidden="true">
                  ✓
                </span>
              )}

              {component.allowQuantitySelection && selected && (
                <div
                  className="bundle-picker__quantity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(component, variant.id, quantity - 1)
                    }
                    disabled={quantity <= (component.minQuantity ?? 1)}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuantityChange(component, variant.id, quantity + 1)
                    }
                    disabled={quantity >= (component.maxQuantity ?? 99)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .bundle-picker__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .bundle-picker__count {
          font-weight: 600;
          color: #1a1a1a;
        }

        .bundle-picker__required {
          font-size: 0.875rem;
          color: #dc2626;
        }

        .bundle-picker__grid {
          display: grid;
          gap: 1rem;
        }

        .bundle-picker__item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem;
          text-align: center;
          background: white;
          border: 2px solid #e5e5e5;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .bundle-picker__item:hover:not(:disabled) {
          border-color: #999;
        }

        .bundle-picker__item--selected {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 1px #1a1a1a;
        }

        .bundle-picker__item--unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bundle-picker__item:disabled {
          cursor: not-allowed;
        }

        .bundle-picker__image {
          width: 100%;
          max-width: 120px;
          height: auto;
          border-radius: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .bundle-picker__content {
          flex: 1;
        }

        .bundle-picker__title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .bundle-picker__variant {
          margin: 0.25rem 0 0;
          font-size: 0.75rem;
          color: #666;
        }

        .bundle-picker__price {
          margin: 0.5rem 0 0;
          font-weight: 600;
          color: #1a1a1a;
        }

        .bundle-picker__stock {
          margin: 0.25rem 0 0;
          font-size: 0.75rem;
        }

        .bundle-picker__stock--low {
          color: #d97706;
        }

        .bundle-picker__stock--out {
          color: #dc2626;
        }

        .bundle-picker__check {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          background: #1a1a1a;
          border-radius: 50%;
        }

        .bundle-picker__quantity {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.25rem;
          background: #f5f5f5;
          border-radius: 0.25rem;
        }

        .bundle-picker__quantity button {
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a1a;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.25rem;
          cursor: pointer;
        }

        .bundle-picker__quantity button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
