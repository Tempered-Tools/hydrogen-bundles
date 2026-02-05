/**
 * Cart mutation building functions
 *
 * Constructs the correct GraphQL mutation input for adding bundles to cart.
 * This is the core technical value - the mutation structure that takes developers
 * days to figure out is pre-built and tested here.
 */

import type {
  BundleDefinition,
  AddBundleInput,
  AddBundleResult,
  BundleBridgeConfig,
  BundleLineAttributes,
} from '../types.js';
import { CART_LINES_ADD_MUTATION, CART_CREATE_MUTATION } from '../graphql/mutations.js';
import { BUNDLE_ATTRIBUTES, DEFAULT_API_VERSION } from '../utils/constants.js';
import { createError, ERROR_CODES } from '../utils/errors.js';
import { validateBundleSelection } from '../utils/validation.js';

/**
 * Build line item attributes for bundle identification
 */
function buildBundleAttributes(
  bundleId: string,
  componentIndex: number,
  totalComponents: number,
  componentProductId: string,
): Array<{ key: string; value: string }> {
  return [
    { key: BUNDLE_ATTRIBUTES.bundleParent, value: 'true' },
    { key: BUNDLE_ATTRIBUTES.bundleProductId, value: bundleId },
    { key: BUNDLE_ATTRIBUTES.componentIndex, value: String(componentIndex) },
    { key: BUNDLE_ATTRIBUTES.totalComponents, value: String(totalComponents) },
    { key: BUNDLE_ATTRIBUTES.componentProductId, value: componentProductId },
  ];
}

/**
 * Build cart line inputs for a bundle
 */
export function buildBundleCartLines(
  definition: BundleDefinition,
  input: AddBundleInput,
): Array<{
  merchandiseId: string;
  quantity: number;
  attributes: Array<{ key: string; value: string }>;
}> {
  const quantity = input.quantity ?? 1;
  const lines: Array<{
    merchandiseId: string;
    quantity: number;
    attributes: Array<{ key: string; value: string }>;
  }> = [];

  // Determine which variants to add
  let componentsToAdd: Array<{ productId: string; variantId: string; quantity: number }>;

  if (input.selectedComponents && input.selectedComponents.length > 0) {
    // Mix-and-match: use customer selections
    componentsToAdd = input.selectedComponents.map((s) => ({
      productId: s.productId,
      variantId: s.variantId,
      quantity: s.quantity,
    }));
  } else {
    // Fixed bundle: use default variants from definition
    componentsToAdd = definition.components.map((c) => ({
      productId: c.productId,
      variantId: c.defaultVariantId ?? c.variants[0]!.id,
      quantity: c.quantity,
    }));
  }

  const totalComponents = componentsToAdd.length;

  // Build line item for each component
  componentsToAdd.forEach((component, index) => {
    const attributes = buildBundleAttributes(
      definition.id,
      index,
      totalComponents,
      component.productId,
    );

    // Add any custom attributes
    if (input.customAttributes) {
      Object.entries(input.customAttributes).forEach(([key, value]) => {
        attributes.push({ key, value });
      });
    }

    lines.push({
      merchandiseId: component.variantId,
      quantity: component.quantity * quantity,
      attributes,
    });
  });

  return lines;
}

/**
 * Execute cart mutation via Storefront API
 */
async function executeCartMutation(
  config: BundleBridgeConfig,
  mutation: string,
  variables: Record<string, unknown>,
): Promise<{
  cart?: AddBundleResult['cart'];
  userErrors?: Array<{ field: string[]; message: string; code: string }>;
}> {
  if (!config.storefrontAccessToken) {
    throw createError(
      ERROR_CODES.INVALID_CONFIG,
      'storefrontAccessToken is required for cart operations',
    );
  }

  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const url = `https://${config.storeDomain}/api/${apiVersion}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!response.ok) {
    throw createError(ERROR_CODES.NETWORK_ERROR, `Storefront API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw createError(ERROR_CODES.CART_ERROR, data.errors[0]?.message ?? 'GraphQL error');
  }

  // Handle different mutation response structures
  const result = data.data?.cartCreate ?? data.data?.cartLinesAdd;

  return {
    cart: result?.cart,
    userErrors: result?.userErrors,
  };
}

/**
 * Add a bundle to the cart
 *
 * This is the main function that handles the entire bundle-to-cart flow:
 * 1. Validates the selection (for mix-and-match)
 * 2. Builds the correct mutation input with bundle attributes
 * 3. Executes the mutation
 * 4. Returns the updated cart
 *
 * @param definition - Bundle definition (from resolveBundle)
 * @param config - BundleBridge configuration
 * @param input - Add to cart input
 */
export async function addBundleToCart(
  definition: BundleDefinition,
  config: BundleBridgeConfig,
  input: AddBundleInput,
): Promise<AddBundleResult> {
  // Validate selection for mix-and-match bundles
  if (definition.bundleType === 'mix_and_match') {
    const validation = validateBundleSelection(
      definition,
      input.selectedComponents ?? [],
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error ?? 'Invalid bundle selection',
      };
    }
  }

  // Build the cart lines
  const lines = buildBundleCartLines(definition, input);

  try {
    let result: {
      cart?: AddBundleResult['cart'];
      userErrors?: Array<{ field: string[]; message: string; code: string }>;
    };

    if (input.cartId) {
      // Add to existing cart
      result = await executeCartMutation(config, CART_LINES_ADD_MUTATION, {
        cartId: input.cartId,
        lines,
      });
    } else {
      // Create new cart with bundle
      result = await executeCartMutation(config, CART_CREATE_MUTATION, {
        input: { lines },
      });
    }

    // Check for user errors
    if (result.userErrors && result.userErrors.length > 0) {
      const firstError = result.userErrors[0]!;

      // Try to identify which component caused the error
      let failedComponent: AddBundleResult['failedComponent'];

      if (firstError.field && firstError.field.length > 0) {
        // Field might be like ["lines", "0", "merchandiseId"]
        const lineIndex = parseInt(firstError.field[1]!, 10);
        if (!isNaN(lineIndex) && lines[lineIndex]) {
          const line = lines[lineIndex]!;
          const componentProductId = line.attributes.find(
            (a) => a.key === BUNDLE_ATTRIBUTES.componentProductId,
          )?.value;

          if (componentProductId) {
            failedComponent = {
              productId: componentProductId,
              variantId: line.merchandiseId,
              reason: firstError.message,
            };
          }
        }
      }

      return {
        success: false,
        error: firstError.message,
        failedComponent,
      };
    }

    return {
      success: true,
      cart: result.cart,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'Failed to add bundle to cart',
    };
  }
}

/**
 * Check if a cart line is part of a bundle
 */
export function isBundleLine(
  line: {
    attributes: Array<{ key: string; value: string }>;
  },
): boolean {
  return line.attributes.some(
    (attr) => attr.key === BUNDLE_ATTRIBUTES.bundleParent && attr.value === 'true',
  );
}

/**
 * Get bundle info from cart line attributes
 */
export function getBundleInfoFromLine(
  line: {
    attributes: Array<{ key: string; value: string }>;
  },
): BundleLineAttributes {
  const attrs: BundleLineAttributes = {};

  for (const attr of line.attributes) {
    if (attr.key === BUNDLE_ATTRIBUTES.bundleParent) {
      attrs._bundleParent = attr.value;
    } else if (attr.key === BUNDLE_ATTRIBUTES.bundleProductId) {
      attrs._bundleProductId = attr.value;
    } else if (attr.key === BUNDLE_ATTRIBUTES.componentIndex) {
      attrs._bundleComponentIndex = attr.value;
    }
  }

  return attrs;
}

/**
 * Group cart lines by bundle
 */
export function groupCartLinesByBundle(
  lines: Array<{
    id: string;
    quantity: number;
    attributes: Array<{ key: string; value: string }>;
    merchandise: {
      id: string;
      title: string;
      product: { title: string };
    };
  }>,
): Map<
  string,
  {
    bundleProductId: string;
    lines: typeof lines;
  }
> {
  const groups = new Map<
    string,
    {
      bundleProductId: string;
      lines: typeof lines;
    }
  >();

  for (const line of lines) {
    if (!isBundleLine(line)) continue;

    const bundleInfo = getBundleInfoFromLine(line);
    const bundleId = bundleInfo._bundleProductId;

    if (!bundleId) continue;

    if (!groups.has(bundleId)) {
      groups.set(bundleId, {
        bundleProductId: bundleId,
        lines: [],
      });
    }

    groups.get(bundleId)!.lines.push(line);
  }

  return groups;
}
