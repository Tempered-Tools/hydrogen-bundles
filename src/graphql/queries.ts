/**
 * GraphQL queries for Shopify bundle operations
 */

import {
  BUNDLE_PRODUCT_FRAGMENT,
  CART_FRAGMENT,
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
} from './fragments.js';

/**
 * Query a single bundle product by ID
 */
export const BUNDLE_PRODUCT_QUERY = /* GraphQL */ `
  ${BUNDLE_PRODUCT_FRAGMENT}

  query BundleProduct($id: ID!) {
    product(id: $id) {
      ...BundleProductFragment
    }
  }
`;

/**
 * Query a single bundle product by handle
 */
export const BUNDLE_PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  ${BUNDLE_PRODUCT_FRAGMENT}

  query BundleProductByHandle($handle: String!) {
    product(handle: $handle) {
      ...BundleProductFragment
    }
  }
`;

/**
 * Query multiple products to check if they are bundles
 */
export const PRODUCTS_BUNDLE_CHECK_QUERY = /* GraphQL */ `
  query ProductsBundleCheck($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        productType
        variants(first: 1) {
          nodes {
            bundleComponents(first: 1) {
              nodes {
                product {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Query inventory for multiple variants
 */
export const VARIANTS_INVENTORY_QUERY = /* GraphQL */ `
  query VariantsInventory($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        quantityAvailable
        product {
          id
          title
        }
      }
    }
  }
`;

/**
 * Query current cart
 */
export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}

  query Cart($id: ID!) {
    cart(id: $id) {
      ...CartFragment
    }
  }
`;

/**
 * Query product recommendations (for bundle suggestions)
 */
export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}

  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      featuredImage {
        ...ImageFragment
      }
      priceRange {
        minVariantPrice {
          ...MoneyFragment
        }
      }
      variants(first: 1) {
        nodes {
          id
          availableForSale
        }
      }
    }
  }
`;
