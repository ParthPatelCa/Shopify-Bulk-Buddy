/**
 * Input sanitization utilities for variant data
 */

export const inputSanitizers = {
  /**
   * Sanitize and validate price input
   */
  price: (value) => {
    if (value === '' || value === null || value === undefined) {
      return { value: '', isValid: true, error: null };
    }

    // Remove currency symbols and whitespace
    const cleanValue = value.toString().replace(/[$,\s]/g, '');
    
    // Check for valid decimal format
    if (!/^\d*\.?\d*$/.test(cleanValue)) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Price must contain only numbers and decimal point' 
      };
    }

    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue)) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Invalid price format' 
      };
    }

    if (numValue < 0) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Price cannot be negative' 
      };
    }

    if (numValue > 999999.99) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Price too large (max: $999,999.99)' 
      };
    }

    // Round to 2 decimal places
    const rounded = Math.round(numValue * 100) / 100;
    
    return { 
      value: rounded.toFixed(2), 
      isValid: true, 
      error: null 
    };
  },

  /**
   * Sanitize and validate inventory quantity
   */
  inventory: (value) => {
    if (value === '' || value === null || value === undefined) {
      return { value: '', isValid: true, error: null };
    }

    // Remove non-numeric characters except minus sign
    const cleanValue = value.toString().replace(/[^\d-]/g, '');
    
    if (cleanValue === '' || cleanValue === '-') {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Inventory must be a whole number' 
      };
    }

    const numValue = parseInt(cleanValue);
    
    if (isNaN(numValue)) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Invalid inventory format' 
      };
    }

    if (numValue < 0) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Inventory cannot be negative' 
      };
    }

    if (numValue > 999999) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Inventory too large (max: 999,999)' 
      };
    }

    return { 
      value: numValue.toString(), 
      isValid: true, 
      error: null 
    };
  },

  /**
   * Sanitize and validate weight input
   */
  weight: (value) => {
    if (value === '' || value === null || value === undefined) {
      return { value: '', isValid: true, error: null };
    }

    // Remove units and whitespace
    const cleanValue = value.toString()
      .replace(/[^\d.-]/g, '') // Keep only digits, decimal, and minus
      .replace(/^-+/, '-') // Collapse multiple leading minus signs
      .replace(/-(?=.*-)/g, ''); // Remove internal minus signs
    
    if (cleanValue === '' || cleanValue === '-' || cleanValue === '.') {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Weight must be a valid number' 
      };
    }

    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue)) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Invalid weight format' 
      };
    }

    if (numValue < 0) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Weight cannot be negative' 
      };
    }

    if (numValue > 9999.999) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Weight too large (max: 9,999.999)' 
      };
    }

    // Round to 3 decimal places
    const rounded = Math.round(numValue * 1000) / 1000;
    
    return { 
      value: rounded.toString(), 
      isValid: true, 
      error: null 
    };
  },

  /**
   * Sanitize SKU input
   */
  sku: (value) => {
    if (value === '' || value === null || value === undefined) {
      return { value: '', isValid: true, error: null };
    }

    // Trim whitespace and limit length
    const cleanValue = value.toString().trim();
    
    if (cleanValue.length > 255) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'SKU too long (max: 255 characters)' 
      };
    }

    // Check for invalid characters (basic validation)
    if (/[<>\"']/.test(cleanValue)) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'SKU contains invalid characters' 
      };
    }

    return { 
      value: cleanValue, 
      isValid: true, 
      error: null 
    };
  },

  /**
   * Sanitize barcode input
   */
  barcode: (value) => {
    if (value === '' || value === null || value === undefined) {
      return { value: '', isValid: true, error: null };
    }

    // Remove non-alphanumeric characters
    const cleanValue = value.toString().replace(/[^a-zA-Z0-9]/g, '');
    
    if (cleanValue.length > 50) {
      return { 
        value: cleanValue, 
        isValid: false, 
        error: 'Barcode too long (max: 50 characters)' 
      };
    }

    return { 
      value: cleanValue, 
      isValid: true, 
      error: null 
    };
  }
};

/**
 * Validate an entire variant object
 */
export function validateVariant(variant) {
  const errors = {};
  const sanitized = { ...variant };

  // Validate each field that might be edited
  const fieldsToValidate = ['price', 'inventory_quantity', 'weight', 'sku', 'barcode'];
  
  fieldsToValidate.forEach(field => {
    if (variant[field] !== undefined) {
      const sanitizerKey = field === 'inventory_quantity' ? 'inventory' : field;
      const sanitizer = inputSanitizers[sanitizerKey];
      
      if (sanitizer) {
        const result = sanitizer(variant[field]);
        
        if (!result.isValid) {
          errors[field] = result.error;
        } else {
          sanitized[field] = result.value;
        }
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

/**
 * Create a sanitized input component that shows validation errors
 */
export function createValidatedInput(field, value, onChange, error = null) {
  const handleChange = (newValue) => {
    const sanitizer = inputSanitizers[field === 'inventory_quantity' ? 'inventory' : field];
    
    if (sanitizer) {
      const result = sanitizer(newValue);
      onChange(result.value, result.isValid ? null : result.error);
    } else {
      onChange(newValue, null);
    }
  };

  return {
    value,
    onChange: handleChange,
    error: error,
    tone: error ? 'critical' : undefined
  };
}

/**
 * Batch validate multiple variants
 */
export function validateVariantBatch(variants) {
  const results = variants.map((variant, index) => ({
    index,
    ...validateVariant(variant)
  }));

  const validVariants = results.filter(r => r.isValid).map(r => r.sanitized);
  const invalidVariants = results.filter(r => !r.isValid);

  return {
    isValid: invalidVariants.length === 0,
    validVariants,
    invalidVariants,
    summary: {
      total: variants.length,
      valid: validVariants.length,
      invalid: invalidVariants.length
    }
  };
}
