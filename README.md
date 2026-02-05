# @tempered/hydrogen-bundles

Bundle cart resolution for Shopify Hydrogen storefronts. Makes Shopify's native Bundles work correctly in headless storefronts.

## The Problem

Shopify Bundles don't work correctly in Hydrogen. The Storefront API requires specific GraphQL fragments and mutation structures that Hydrogen's cart utilities don't handle. Your add-to-cart button silently fails, adds individual components instead of the bundle, or throws cryptic cart errors.

## The Solution

One function call instead of 500 lines of GraphQL.

```tsx
import { BundleProvider, BundleAddToCart, useBundleDefinition } from '@tempered/hydrogen-bundles';

// Wrap your app
<BundleProvider config={bundleConfig}>
  <App />
</BundleProvider>

// On a bundle product page
const { definition } = useBundleDefinition({ bundleId, config });

<BundleAddToCart definition={definition} cartId={cart.id} />
```

## Installation

```bash
npm install @tempered/hydrogen-bundles
```

## Quick Start

### 1. Configure the Provider

```tsx
// app/root.tsx
import { BundleProvider } from '@tempered/hydrogen-bundles';

export default function App() {
  return (
    <BundleProvider
      config={{
        storeDomain: 'my-store.myshopify.com',
        storefrontAccessToken: 'xxxxx',
        // Optional: use hosted backend for caching & analytics
        apiUrl: 'https://bundlebridge.temperedtools.xyz',
        apiKey: 'bb_live_xxxxx',
      }}
    >
      <Outlet />
    </BundleProvider>
  );
}
```

### 2. Display a Bundle Product

```tsx
// app/routes/products.$handle.tsx
import {
  useBundleDefinition,
  useBundlePrice,
  BundleAddToCart,
  BundleSavings,
} from '@tempered/hydrogen-bundles';

export default function BundleProductPage({ product }) {
  const { definition, isLoading, error } = useBundleDefinition({
    bundleId: product.id,
    config: useBundleConfig(),
  });

  const { formattedBundlePrice, hasSavings, priceResult } = useBundlePrice({
    definition,
    config: useBundleConfig(),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <h1>{definition.title}</h1>

      <div className="price">
        {formattedBundlePrice}
        {hasSavings && (
          <BundleSavings
            savings={priceResult.savings}
            savingsPercentage={priceResult.savingsPercentage}
          />
        )}
      </div>

      <BundleAddToCart
        definition={definition}
        cartId={cart.id}
        onSuccess={() => showToast('Added to cart!')}
      />
    </div>
  );
}
```

### 3. Mix-and-Match Bundles

```tsx
import { useState } from 'react';
import {
  useBundleDefinition,
  BundlePicker,
  BundleAddToCart,
} from '@tempered/hydrogen-bundles';

export default function MixAndMatchBundle({ product }) {
  const [selections, setSelections] = useState([]);
  const { definition } = useBundleDefinition({
    bundleId: product.id,
    config: useBundleConfig(),
  });

  return (
    <div>
      <BundlePicker
        definition={definition}
        selectedComponents={selections}
        onSelectionChange={setSelections}
        columns={3}
        showPrice
        showInventory
      />

      <BundleAddToCart
        definition={definition}
        selectedComponents={selections}
        cartId={cart.id}
      />
    </div>
  );
}
```

### 4. Display Bundles in Cart

```tsx
import { useBundleLines, BundleLineItem } from '@tempered/hydrogen-bundles';

export function Cart({ lines }) {
  const { bundleGroups, nonBundleLines } = useBundleLines(lines);

  return (
    <div>
      {/* Render bundles as grouped items */}
      {Array.from(bundleGroups.values()).map((group) => (
        <BundleLineItem
          key={group.bundleProductId}
          lines={group.lines}
          displayMode="combined"
          onRemove={() => removeBundle(group.bundleProductId)}
        />
      ))}

      {/* Render non-bundle items normally */}
      {nonBundleLines.map((line) => (
        <CartLine key={line.id} line={line} />
      ))}
    </div>
  );
}
```

## Features

- **Fixed Bundles**: Pre-configured bundles with set components
- **Mix-and-Match**: Customer selects items from available options
- **Inventory Checking**: Pre-cart availability for all components
- **Dynamic Pricing**: Percentage, fixed amount, or custom discounts
- **SSR Compatible**: No hydration errors
- **TypeScript**: Full type definitions included
- **Accessible**: WCAG 2.2 AA compliant components

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `BundleProvider` | Context provider for configuration |
| `BundleAddToCart` | Smart add-to-cart button |
| `BundlePicker` | Mix-and-match selection UI |
| `BundleLineItem` | Cart display (combined or expanded) |
| `BundleSavings` | Savings badge/display |

### Hooks

| Hook | Description |
|------|-------------|
| `useBundleDefinition` | Fetch and cache bundle definition |
| `useBundleInventory` | Check component availability |
| `useBundlePrice` | Calculate pricing with discounts |
| `useBundleCart` | Cart operations (add, remove) |
| `useBundleLines` | Group cart lines by bundle |

### SDK Functions

| Function | Description |
|----------|-------------|
| `resolveBundle` | Fetch bundle definition |
| `checkBundleInventory` | Aggregate inventory check |
| `calculateBundlePrice` | Price calculation |
| `addBundleToCart` | Cart mutation |

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | SDK + components, direct Storefront API |
| Pro | $19/mo | + Hosted backend, caching, analytics |
| Agency | $49/mo | + Multi-store, advanced analytics |

## Requirements

- React 18 or 19
- Shopify Storefront API access
- Shopify Bundles enabled on your store

## License

MIT

---

Built by [Tempered Tools](https://temperedtools.xyz)
