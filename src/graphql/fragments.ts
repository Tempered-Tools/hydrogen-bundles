/**
 * GraphQL fragments for Shopify bundle operations
 */

/**
 * Money fragment
 */
export const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFragment on MoneyV2 {
    amount
    currencyCode
  }
`;

/**
 * Image fragment
 */
export const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFragment on Image {
    url
    altText
    width
    height
  }
`;

/**
 * Variant fragment (basic)
 */
export const VARIANT_FRAGMENT = /* GraphQL */ `
  fragment VariantFragment on ProductVariant {
    id
    title
    sku
    availableForSale
    quantityAvailable
    price {
      ...MoneyFragment
    }
    compareAtPrice {
      ...MoneyFragment
    }
    image {
      ...ImageFragment
    }
    selectedOptions {
      name
      value
    }
  }
`;

/**
 * Bundle component fragment
 */
export const BUNDLE_COMPONENT_FRAGMENT = /* GraphQL */ `
  fragment BundleComponentFragment on BundleComponent {
    product {
      id
      title
      handle
      featuredImage {
        ...ImageFragment
      }
    }
    variant {
      ...VariantFragment
    }
    quantity
  }
`;

/**
 * Full bundle product fragment
 * Note: bundleComponents is only available on variants
 */
export const BUNDLE_PRODUCT_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${BUNDLE_COMPONENT_FRAGMENT}

  fragment BundleProductFragment on Product {
    id
    title
    handle
    description
    productType
    availableForSale
    featuredImage {
      ...ImageFragment
    }
    variants(first: 10) {
      nodes {
        id
        title
        price {
          ...MoneyFragment
        }
        compareAtPrice {
          ...MoneyFragment
        }
        availableForSale
        bundleComponents(first: 30) {
          nodes {
            ...BundleComponentFragment
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
  }
`;

/**
 * Cart line fragment
 */
export const CART_LINE_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${IMAGE_FRAGMENT}

  fragment CartLineFragment on CartLine {
    id
    quantity
    merchandise {
      ... on ProductVariant {
        id
        title
        sku
        image {
          ...ImageFragment
        }
        price {
          ...MoneyFragment
        }
        product {
          id
          title
          handle
        }
      }
    }
    attributes {
      key
      value
    }
    cost {
      amountPerQuantity {
        ...MoneyFragment
      }
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
    }
  }
`;

/**
 * Cart fragment
 */
export const CART_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  ${CART_LINE_FRAGMENT}

  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      nodes {
        ...CartLineFragment
      }
    }
    cost {
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
      }
    }
    buyerIdentity {
      email
      phone
      customer {
        id
        email
      }
    }
  }
`;
