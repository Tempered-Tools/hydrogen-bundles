/**
 * BundleSavings
 *
 * Displays bundle savings in a visually appealing way.
 */

import type { Money } from '../types.js';
import { formatMoney } from '../sdk/calculatePrice.js';

export interface BundleSavingsProps {
  /** Savings amount */
  savings: Money;
  /** Savings percentage */
  savingsPercentage: number;
  /** Original price (optional, for strikethrough display) */
  originalPrice?: Money;
  /** Bundle price (optional, for comparison display) */
  bundlePrice?: Money;
  /** Display variant */
  variant?: 'badge' | 'inline' | 'detailed';
  /** Locale for price formatting */
  locale?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Savings display component
 *
 * @example
 * ```tsx
 * <BundleSavings
 *   savings={priceResult.savings}
 *   savingsPercentage={priceResult.savingsPercentage}
 *   originalPrice={priceResult.originalPrice}
 *   bundlePrice={priceResult.bundlePrice}
 *   variant="detailed"
 * />
 * ```
 */
export function BundleSavings({
  savings,
  savingsPercentage,
  originalPrice,
  bundlePrice,
  variant = 'badge',
  locale = 'en-US',
  className = '',
}: BundleSavingsProps) {
  const hasSavings = parseFloat(savings.amount) > 0;

  if (!hasSavings) return null;

  const formattedSavings = formatMoney(savings, locale);
  const formattedPercentage = `${Math.round(savingsPercentage)}%`;

  if (variant === 'badge') {
    return (
      <span className={`bundle-savings bundle-savings--badge ${className}`}>
        Save {formattedPercentage}
        <style>{`
          .bundle-savings--badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            color: #059669;
            background: #d1fae5;
            border-radius: 9999px;
          }
        `}</style>
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`bundle-savings bundle-savings--inline ${className}`}>
        Save {formattedSavings} ({formattedPercentage})
        <style>{`
          .bundle-savings--inline {
            font-size: 0.875rem;
            font-weight: 500;
            color: #059669;
          }
        `}</style>
      </span>
    );
  }

  // Detailed variant
  return (
    <div className={`bundle-savings bundle-savings--detailed ${className}`}>
      {originalPrice && bundlePrice && (
        <div className="bundle-savings__prices">
          <span className="bundle-savings__original">
            {formatMoney(originalPrice, locale)}
          </span>
          <span className="bundle-savings__bundle">
            {formatMoney(bundlePrice, locale)}
          </span>
        </div>
      )}
      <div className="bundle-savings__badge">
        <span className="bundle-savings__amount">Save {formattedSavings}</span>
        <span className="bundle-savings__percentage">({formattedPercentage} off)</span>
      </div>

      <style>{`
        .bundle-savings--detailed {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .bundle-savings__prices {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .bundle-savings__original {
          font-size: 0.875rem;
          color: #999;
          text-decoration: line-through;
        }

        .bundle-savings__bundle {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        .bundle-savings__badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          background: #d1fae5;
          border-radius: 0.375rem;
        }

        .bundle-savings__amount {
          font-weight: 600;
          color: #059669;
        }

        .bundle-savings__percentage {
          font-size: 0.875rem;
          color: #059669;
        }
      `}</style>
    </div>
  );
}
