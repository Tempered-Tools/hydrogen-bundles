/**
 * BundleLineItem
 *
 * Cart line item display for bundles, showing either combined or expanded view.
 */

import { useMemo } from 'react';

import type { Money } from '../types.js';
import { formatMoney } from '../sdk/calculatePrice.js';
import { getBundleInfoFromLine } from '../sdk/buildCartMutation.js';

interface CartLineData {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    image?: {
      url: string;
      altText?: string;
    };
    price: Money;
    product: {
      id: string;
      title: string;
      handle: string;
    };
  };
  attributes: Array<{ key: string; value: string }>;
  cost: {
    totalAmount: Money;
  };
}

export interface BundleLineItemProps {
  /** All lines that belong to this bundle (grouped) */
  lines: CartLineData[];
  /** Bundle title (if available) */
  bundleTitle?: string;
  /** Display mode: combined shows as one item, expanded shows all components */
  displayMode?: 'combined' | 'expanded';
  /** Allow quantity changes */
  allowQuantityChange?: boolean;
  /** Callback when quantity changes */
  onQuantityChange?: (newQuantity: number) => void;
  /** Callback when bundle is removed */
  onRemove?: () => void;
  /** Locale for price formatting */
  locale?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Cart line item for bundles
 *
 * @example
 * ```tsx
 * const { bundleGroups } = useBundleLines(cart.lines);
 *
 * {Array.from(bundleGroups.values()).map((group) => (
 *   <BundleLineItem
 *     key={group.bundleProductId}
 *     lines={group.lines}
 *     displayMode="combined"
 *     onRemove={() => removeBundle(group.bundleProductId)}
 *   />
 * ))}
 * ```
 */
export function BundleLineItem({
  lines,
  bundleTitle,
  displayMode = 'combined',
  allowQuantityChange = true,
  onQuantityChange,
  onRemove,
  locale = 'en-US',
  className = '',
}: BundleLineItemProps) {
  // Calculate total price
  const totalPrice = useMemo(() => {
    const total = lines.reduce(
      (sum, line) => sum + parseFloat(line.cost.totalAmount.amount),
      0,
    );
    const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? 'USD';
    return {
      amount: total.toFixed(2),
      currencyCode,
    };
  }, [lines]);

  // Get bundle quantity (all components should have same quantity multiplier)
  const bundleQuantity = useMemo(() => {
    // Find the first component and check its quantity
    const firstLine = lines[0];
    if (!firstLine) return 1;

    // Get component quantity from definition (stored in line quantity)
    // For simplicity, assume quantity is 1 bundle = line quantity / component quantity
    return firstLine.quantity;
  }, [lines]);

  // Use first line's image as bundle image (or could fetch bundle image)
  const bundleImage = lines[0]?.merchandise.image;

  // Derive bundle title from product titles if not provided
  const derivedBundleTitle = useMemo(() => {
    if (bundleTitle) return bundleTitle;

    // Try to get bundle product ID from attributes
    const firstLine = lines[0];
    if (!firstLine) return 'Bundle';

    const bundleInfo = getBundleInfoFromLine(firstLine);
    if (bundleInfo._bundleProductId) {
      // Could fetch bundle title here, for now use first product
      return `${firstLine.merchandise.product.title} Bundle`;
    }

    return 'Bundle';
  }, [bundleTitle, lines]);

  if (displayMode === 'combined') {
    return (
      <div className={`bundle-line-item bundle-line-item--combined ${className}`}>
        <div className="bundle-line-item__image-container">
          {bundleImage && (
            <img
              src={bundleImage.url}
              alt={bundleImage.altText ?? derivedBundleTitle}
              className="bundle-line-item__image"
            />
          )}
          <span className="bundle-line-item__badge">{lines.length} items</span>
        </div>

        <div className="bundle-line-item__content">
          <h4 className="bundle-line-item__title">{derivedBundleTitle}</h4>
          <p className="bundle-line-item__components">
            {lines.map((l) => l.merchandise.product.title).join(', ')}
          </p>

          {allowQuantityChange && (
            <div className="bundle-line-item__quantity">
              <button
                type="button"
                onClick={() => onQuantityChange?.(bundleQuantity - 1)}
                disabled={bundleQuantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{bundleQuantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange?.(bundleQuantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="bundle-line-item__price">
          <span>{formatMoney(totalPrice, locale)}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="bundle-line-item__remove"
              aria-label="Remove bundle"
            >
              Remove
            </button>
          )}
        </div>

        <style>{`
          .bundle-line-item--combined {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            border: 1px solid #e5e5e5;
            border-radius: 0.5rem;
          }

          .bundle-line-item__image-container {
            position: relative;
            flex-shrink: 0;
          }

          .bundle-line-item__image {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 0.25rem;
          }

          .bundle-line-item__badge {
            position: absolute;
            bottom: -0.25rem;
            right: -0.25rem;
            padding: 0.125rem 0.375rem;
            font-size: 0.625rem;
            font-weight: 600;
            color: white;
            background: #1a1a1a;
            border-radius: 0.25rem;
          }

          .bundle-line-item__content {
            flex: 1;
            min-width: 0;
          }

          .bundle-line-item__title {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
            color: #1a1a1a;
          }

          .bundle-line-item__components {
            margin: 0.25rem 0 0;
            font-size: 0.75rem;
            color: #666;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .bundle-line-item__quantity {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            padding: 0.25rem;
            background: #f5f5f5;
            border-radius: 0.25rem;
          }

          .bundle-line-item__quantity button {
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

          .bundle-line-item__quantity button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .bundle-line-item__price {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;
            font-weight: 600;
            color: #1a1a1a;
          }

          .bundle-line-item__remove {
            padding: 0;
            font-size: 0.75rem;
            color: #dc2626;
            background: none;
            border: none;
            cursor: pointer;
          }

          .bundle-line-item__remove:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    );
  }

  // Expanded mode
  return (
    <div className={`bundle-line-item bundle-line-item--expanded ${className}`}>
      <div className="bundle-line-item__header">
        <h4 className="bundle-line-item__title">{derivedBundleTitle}</h4>
        <span className="bundle-line-item__total">{formatMoney(totalPrice, locale)}</span>
      </div>

      <div className="bundle-line-item__list">
        {lines.map((line) => (
          <div key={line.id} className="bundle-line-item__component">
            {line.merchandise.image && (
              <img
                src={line.merchandise.image.url}
                alt={line.merchandise.image.altText ?? line.merchandise.title}
                className="bundle-line-item__component-image"
              />
            )}
            <div className="bundle-line-item__component-info">
              <span className="bundle-line-item__component-title">
                {line.merchandise.product.title}
              </span>
              {line.merchandise.title !== 'Default Title' && (
                <span className="bundle-line-item__component-variant">
                  {line.merchandise.title}
                </span>
              )}
            </div>
            <span className="bundle-line-item__component-quantity">
              ×{line.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="bundle-line-item__footer">
        {allowQuantityChange && (
          <div className="bundle-line-item__quantity">
            <button
              type="button"
              onClick={() => onQuantityChange?.(bundleQuantity - 1)}
              disabled={bundleQuantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{bundleQuantity}</span>
            <button
              type="button"
              onClick={() => onQuantityChange?.(bundleQuantity + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="bundle-line-item__remove"
            aria-label="Remove bundle"
          >
            Remove
          </button>
        )}
      </div>

      <style>{`
        .bundle-line-item--expanded {
          padding: 1rem;
          border: 1px solid #e5e5e5;
          border-radius: 0.5rem;
        }

        .bundle-line-item__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .bundle-line-item--expanded .bundle-line-item__title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .bundle-line-item__total {
          font-weight: 600;
          color: #1a1a1a;
        }

        .bundle-line-item__list {
          padding: 0.75rem 0;
        }

        .bundle-line-item__component {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
        }

        .bundle-line-item__component:not(:last-child) {
          border-bottom: 1px dashed #e5e5e5;
        }

        .bundle-line-item__component-image {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 0.25rem;
        }

        .bundle-line-item__component-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .bundle-line-item__component-title {
          font-size: 0.875rem;
          color: #1a1a1a;
        }

        .bundle-line-item__component-variant {
          font-size: 0.75rem;
          color: #666;
        }

        .bundle-line-item__component-quantity {
          font-size: 0.875rem;
          color: #666;
        }

        .bundle-line-item__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e5e5;
        }

        .bundle-line-item--expanded .bundle-line-item__quantity {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem;
          background: #f5f5f5;
          border-radius: 0.25rem;
        }

        .bundle-line-item--expanded .bundle-line-item__quantity button {
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

        .bundle-line-item--expanded .bundle-line-item__quantity button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bundle-line-item--expanded .bundle-line-item__remove {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: #dc2626;
          background: none;
          border: 1px solid #dc2626;
          border-radius: 0.25rem;
          cursor: pointer;
        }

        .bundle-line-item--expanded .bundle-line-item__remove:hover {
          background: #fef2f2;
        }
      `}</style>
    </div>
  );
}
