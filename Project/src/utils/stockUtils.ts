import { Product, ProductStatus } from '../types';

/**
 * Gets the actual dynamic stock of a product, accounting for its hamper dependencies if it's a hamper.
 */
export function getProductStock(product: Product, allProducts?: Product[]): number {
  if (product.status === ProductStatus.DELETED || (product.status as string) === 'deleted') {
    return 0;
  }

  if (product.isHamper) {
    const productsList = allProducts || [];
    if (!product.hamperItems || product.hamperItems.length === 0) {
      return product.stock || 0; // fallback if no items mapped
    }

    // A hamper's stock is limited by the minimum available stock of its mapped child products
    // taking into account the quantity required of each.
    // Case 1: All mapped products are in stock -> Hamper product = In Stock
    // Case 2: One or more mapped products are out of stock -> Hamper product = Out of Stock
    let minHamperStock = Infinity;
    for (const item of product.hamperItems) {
      const subProd = productsList.find(p => p.id === item.productId && p.status !== ProductStatus.DELETED && (p.status as string) !== 'deleted');
      if (!subProd) {
        return 0; // Missing or deleted mapped subproduct means hamper is out of stock / unavailable
      }
      if (subProd.stock <= 0) {
        return 0; // If any single child is out of stock, the hamper is out of stock (Case 2)
      }
      // Calculate possible hampers based on child quantity requirements
      const possibleHampers = Math.floor(subProd.stock / item.quantity);
      if (possibleHampers < minHamperStock) {
        minHamperStock = possibleHampers;
      }
    }

    const computedStock = minHamperStock === Infinity ? product.stock : minHamperStock;
    // Let's make sure it is not negative
    return Math.max(0, computedStock);
  }

  return product.stock;
}

/**
 * Checks if a product is out of stock dynamically (taking into account its hamper dependencies).
 */
export function isProductOutOfStock(product: Product, allProducts?: Product[]): boolean {
  if (product.status === ProductStatus.DELETED || (product.status as string) === 'deleted') {
    return true;
  }
  return getProductStock(product, allProducts) <= 0;
}

/**
 * Checks if a product is out of stock for customer view/interaction.
 * If allowOrderWhenOutOfStock is ON, it is never out of stock for the customer.
 */
export function isProductOutOfStockForCustomer(product: Product, allProducts?: Product[]): boolean {
  if (product.allowOrderWhenOutOfStock) {
    return false;
  }
  return isProductOutOfStock(product, allProducts);
}

/**
 * Checks if a product is low stock for customer view/interaction.
 * If allowOrderWhenOutOfStock is ON and actual stock <= 0, no low stock warnings should be shown.
 */
export function isProductLowStockForCustomer(product: Product, allProducts?: Product[]): boolean {
  const actualStock = getProductStock(product, allProducts);
  const isOutOfStock = isProductOutOfStockForCustomer(product, allProducts);
  
  if (isOutOfStock) {
    return false;
  }
  
  // If override is enabled and actualStock is 0 or less, hide low stock warnings to keep it secret.
  if (product.allowOrderWhenOutOfStock && actualStock <= 0) {
    return false;
  }
  
  return actualStock <= product.lowStockThreshold;
}

