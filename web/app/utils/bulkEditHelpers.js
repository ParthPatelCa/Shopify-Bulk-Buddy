export const bulkEditHelpers = {
  /**
   * Set a fixed price for selected variants
   */
  setFixedPrice: (variants, price) => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      throw new Error('Price must be a valid positive number');
    }
    
    return variants.map(variant => ({
      ...variant,
      price: Math.round(numericPrice * 100) / 100, // Round to 2 decimal places
      originalPrice: variant.price
    }));
  },

  /**
   * Apply percentage increase/decrease to prices
   */
  adjustPriceByPercentage: (variants, percentage) => {
    const numericPercentage = parseFloat(percentage);
    if (isNaN(numericPercentage)) {
      throw new Error('Percentage must be a valid number');
    }
    
    const multiplier = 1 + (numericPercentage / 100);
    
    return variants.map(variant => {
      const currentPrice = parseFloat(variant.price) || 0;
      const newPrice = Math.round(currentPrice * multiplier * 100) / 100;
      
      return {
        ...variant,
        price: Math.max(0, newPrice), // Ensure non-negative
        originalPrice: variant.price
      };
    });
  },

  /**
   * Round prices to nearest specified increment
   */
  roundPrices: (variants, increment = 0.99) => {
    const numericIncrement = parseFloat(increment);
    if (isNaN(numericIncrement) || numericIncrement <= 0) {
      throw new Error('Increment must be a positive number');
    }
    
    return variants.map(variant => {
      const currentPrice = parseFloat(variant.price) || 0;
      const rounded = Math.round(currentPrice / numericIncrement) * numericIncrement;
      
      return {
        ...variant,
        price: Math.round(rounded * 100) / 100,
        originalPrice: variant.price
      };
    });
  },

  /**
   * Add prefix to SKUs
   */
  addSkuPrefix: (variants, prefix) => {
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Prefix must be a non-empty string');
    }
    
    return variants.map(variant => ({
      ...variant,
      sku: `${prefix}${variant.sku || ''}`,
      originalSku: variant.sku
    }));
  },

  /**
   * Add suffix to SKUs
   */
  addSkuSuffix: (variants, suffix) => {
    if (!suffix || typeof suffix !== 'string') {
      throw new Error('Suffix must be a non-empty string');
    }
    
    return variants.map(variant => ({
      ...variant,
      sku: `${variant.sku || ''}${suffix}`,
      originalSku: variant.sku
    }));
  },

  /**
   * Replace text in SKUs
   */
  replaceSkuText: (variants, searchText, replaceText) => {
    if (typeof searchText !== 'string' || typeof replaceText !== 'string') {
      throw new Error('Search and replace text must be strings');
    }
    
    return variants.map(variant => ({
      ...variant,
      sku: (variant.sku || '').replace(new RegExp(searchText, 'g'), replaceText),
      originalSku: variant.sku
    }));
  },

  /**
   * Set inventory to fixed value
   */
  setInventory: (variants, quantity) => {
    const numericQuantity = parseInt(quantity);
    if (isNaN(numericQuantity) || numericQuantity < 0) {
      throw new Error('Inventory quantity must be a non-negative integer');
    }
    
    return variants.map(variant => ({
      ...variant,
      inventory_quantity: numericQuantity,
      originalInventory: variant.inventory_quantity
    }));
  },

  /**
   * Adjust inventory by amount
   */
  adjustInventory: (variants, adjustment) => {
    const numericAdjustment = parseInt(adjustment);
    if (isNaN(numericAdjustment)) {
      throw new Error('Inventory adjustment must be a valid integer');
    }
    
    return variants.map(variant => {
      const currentInventory = parseInt(variant.inventory_quantity) || 0;
      const newInventory = Math.max(0, currentInventory + numericAdjustment);
      
      return {
        ...variant,
        inventory_quantity: newInventory,
        originalInventory: variant.inventory_quantity
      };
    });
  },

  /**
   * Set weight to fixed value
   */
  setWeight: (variants, weight) => {
    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight) || numericWeight < 0) {
      throw new Error('Weight must be a non-negative number');
    }
    
    return variants.map(variant => ({
      ...variant,
      weight: Math.round(numericWeight * 1000) / 1000, // Round to 3 decimal places
      originalWeight: variant.weight
    }));
  },

  /**
   * Convert weight units (kg to lb or lb to kg)
   */
  convertWeight: (variants, fromUnit, toUnit) => {
    const conversionFactors = {
      'kg_to_lb': 2.20462,
      'lb_to_kg': 0.453592
    };
    
    const conversionKey = `${fromUnit}_to_${toUnit}`;
    const factor = conversionFactors[conversionKey];
    
    if (!factor) {
      throw new Error('Unsupported weight conversion. Use kg_to_lb or lb_to_kg');
    }
    
    return variants.map(variant => {
      const currentWeight = parseFloat(variant.weight) || 0;
      const convertedWeight = currentWeight * factor;
      
      return {
        ...variant,
        weight: Math.round(convertedWeight * 1000) / 1000,
        originalWeight: variant.weight
      };
    });
  },

  /**
   * Clear specific field for all variants
   */
  clearField: (variants, fieldName) => {
    const allowedFields = ['sku', 'barcode', 'weight'];
    if (!allowedFields.includes(fieldName)) {
      throw new Error(`Cannot clear field: ${fieldName}. Allowed fields: ${allowedFields.join(', ')}`);
    }
    
    return variants.map(variant => ({
      ...variant,
      [fieldName]: '',
      [`original${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`]: variant[fieldName]
    }));
  },

  /**
   * Copy value from one field to another
   */
  copyField: (variants, fromField, toField) => {
    const allowedFields = ['title', 'sku', 'barcode', 'price', 'weight'];
    if (!allowedFields.includes(fromField) || !allowedFields.includes(toField)) {
      throw new Error(`Invalid field names. Allowed fields: ${allowedFields.join(', ')}`);
    }
    
    return variants.map(variant => ({
      ...variant,
      [toField]: variant[fromField] || '',
      [`original${toField.charAt(0).toUpperCase() + toField.slice(1)}`]: variant[toField]
    }));
  }
};

/**
 * Bulk edit operation builder for chaining operations
 */
export class BulkEditBuilder {
  constructor(variants) {
    this.variants = [...variants];
    this.operations = [];
  }

  setPrice(price) {
    this.variants = bulkEditHelpers.setFixedPrice(this.variants, price);
    this.operations.push(`Set price to $${price}`);
    return this;
  }

  adjustPrice(percentage) {
    this.variants = bulkEditHelpers.adjustPriceByPercentage(this.variants, percentage);
    this.operations.push(`Adjust price by ${percentage}%`);
    return this;
  }

  roundPrices(increment = 0.99) {
    this.variants = bulkEditHelpers.roundPrices(this.variants, increment);
    this.operations.push(`Round prices to $${increment} increments`);
    return this;
  }

  addSkuPrefix(prefix) {
    this.variants = bulkEditHelpers.addSkuPrefix(this.variants, prefix);
    this.operations.push(`Add SKU prefix: "${prefix}"`);
    return this;
  }

  addSkuSuffix(suffix) {
    this.variants = bulkEditHelpers.addSkuSuffix(this.variants, suffix);
    this.operations.push(`Add SKU suffix: "${suffix}"`);
    return this;
  }

  setInventory(quantity) {
    this.variants = bulkEditHelpers.setInventory(this.variants, quantity);
    this.operations.push(`Set inventory to ${quantity}`);
    return this;
  }

  getVariants() {
    return this.variants;
  }

  getOperationsSummary() {
    return this.operations;
  }

  getChangesCount() {
    return this.variants.filter(variant => 
      variant.originalPrice !== undefined ||
      variant.originalSku !== undefined ||
      variant.originalInventory !== undefined ||
      variant.originalWeight !== undefined
    ).length;
  }
}
